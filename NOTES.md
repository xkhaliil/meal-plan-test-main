# Fix notes

Write-up of what was found, what was fixed, and what's left, per `TEST_INSTRUCTIONS.md`. All fixes below were verified against a running instance (curl for API-level checks, a signed-webhook simulation and a real Stripe test-mode subscription for the billing lifecycle, and a headless-browser pass for the UI flows).

## UI/UX rework

The app was rebuilt around a single minimal design system rather than per-page ad-hoc styling (previously every page had its own font, background colour, and button treatment — comic/serif mixes, a red nav bar, neon-purple landing page, GIFs plastered on every background).

- **Design system** (`app/globals.css`): warm cream/terracotta/sage palette exposed as Tailwind v4 `@theme` tokens, plus shared `.btn`/`.card`/`.input`/`.label`/`.tag`/`.alert-error` primitives so every page uses the same controls. `prefers-reduced-motion` is honoured globally.
- **Typography** (`app/layout.tsx`): Fraunces (display) + Inter (UI) loaded via `next/font`, replacing the per-page Arial/Georgia/Comic Sans mix.
- **Landing page** rewritten end to end: real value proposition, three-step explainer, feature grid, explicit Free vs Pro pricing, and working CTAs into `/register`. The previous joke copy ("culinary vectors", "GDPR-friendly-ish"), the 52-element animation loop, and the hydration mismatch it caused are all gone.
- **App pages** (recipes, recipe detail, meal plans, weekly planner, Recipe Bot, settings, auth, checkout results) rebuilt on the shared system: consistent page headers, card grids, empty states, loading skeletons, and inline error surfaces instead of `alert()`.
- **Responsive**: every route verified to fit without horizontal overflow at 390px; the app nav collapses to a two-row layout on small screens.
- **Removed** `ClientChaosShell` and `CookingGifPlaster` (plus `lib/cookingGifSources.ts` and their env vars) — a hidden CPU/memory-burning overlay and scattered background GIFs that contradicted the product. Originals remain in commit `ad76ce1`.
- **Ownership-aware UI**: the recipe Delete action now only renders on recipes the signed-in user owns, matching the authorization rules added server-side.

### Images

- `next/image` now serves the recipe photography (`public/images/recipes/` was 33MB of 2560px JPEGs rendered into ~400px cards). They're resized, converted, and lazy-loaded instead of shipped at full size.
- **Three seed photos were corrupted** — `beef-stew.jpg`, `french-toast.jpg`, and `greek-salad.jpg` had the image-generation prompt itself rendered into the frame as a text panel (including the words "No text, No watermark, No people, No hands"). Root cause: `scripts/generate-seed-recipe-images.ts` listed negations in the prompt, and Imagen drew them. Fixed the prompt to use positive phrasing only, and cropped the three existing files to the clean region of the dish (also cutting them from ~1.5-2MB to ~230-280KB each).
- **`mushroom-risotto.jpg` is still wrong** — it's a photo of a mountain and an island, not risotto, so no crop can fix it. It needs regeneration, which requires a valid `GEMINI_API_KEY` (the key in `.env` returns `API_KEY_INVALID`). The generator now accepts filename arguments for exactly this: `npm run generate:recipe-images -- mushroom-risotto.jpg`.
- Minor/cosmetic: `caesar-salad.jpg` contains hands, from the same negative-prompt failure. Regenerating it uses the same command.

### Environment note

Both `OPENAI_API_KEY` and `GEMINI_API_KEY` in `.env` are rejected by their providers (`invalid_api_key` / `API_KEY_INVALID`), so the live Recipe Bot round-trip and image generation could not be exercised end to end. The chat route's error handling was verified against those real failures: it logs server-side, returns a clean 502, and never leaks internals to the client.

## Fixed this pass

### Auth & authorization (critical)
- Hardcoded JWT secret (`lib/auth.ts`) replaced with `process.env.JWT_SECRET`.
- Passwords were stored and compared in plaintext; now hashed with `bcryptjs` on register and compared with `bcrypt.compare` on login (seed data updated to match).
- Login returned a fabricated "password already in use by another user" message instead of a generic invalid-credentials error — fixed.
- Register had no validation and no duplicate-email handling (would 500 on a unique-constraint violation) — added validation and a clean 409.
- Logout didn't clear `localStorage`, so a JWT stayed valid client-side after "logging out" — fixed.
- `next.config.ts` had an `env` block that inlined every server secret (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DATABASE_URL`, ...) into the client bundle — removed entirely.

### IDOR / broken ownership checks (critical)
- `PUT`/`DELETE /api/recipes/[id]` had no ownership check (DELETE had no auth check at all — anyone, unauthenticated, could delete any recipe). Both now verify `recipe.userId === session.userId`.
- `GET`/`POST /api/meal-plans/[id]` had no ownership check — any logged-in user could view or add meals to any other user's plan by ID. Both now verify `mealPlan.userId === session.userId`.
- Recipe detail endpoint no longer exposes the recipe author's email to anonymous callers.

### Core feature bugs
- **The big one:** adding a recipe to a meal plan (`POST /api/meal-plans/[id]`) ignored the recipe the user actually picked and always attached the oldest recipe in the entire database. Now uses and validates the submitted `recipeId`, plus validates `day`/`mealType`.
- The recipe delete button called the wrong endpoint with the wrong HTTP method and no auth header (silent no-op) — fixed to call `DELETE /api/recipes/:id` properly.
- "+ Save Recipe" was an empty stub with no way to create a recipe from the UI — added a real inline create-recipe form.
- The recipe search box was tracked but never filtered anything — now filters by title/description.
- There was no way to create a meal plan from the UI even though the API supported it — added a create form.
- Added a shared validator (`lib/recipeInput.ts`) for recipe payloads, used by recipe create/update and the chat tool-call handler, replacing ad-hoc/missing validation in three places.

### Recipe Bot (chat) pipeline
- The system prompt contained a literal fake "admin password" and internal cost figures under "do not share with users," and both `GET`/`POST /api/chat` returned the full system prompt verbatim to any authenticated caller. Removed the leaked block and stopped returning `systemPrompt` at all.
- Recipe creation relied on `JSON.parse`-ing the raw chat reply with an empty `catch {}` — silently failed whenever the model wrapped JSON in prose (which its own prompt invited). Replaced with OpenAI tool calling (`create_recipe` function tool) plus the shared validator, so recipe creation is structured and failures are visible instead of silent.
- Added error handling around the OpenAI call and image generation (both previously unhandled/silently swallowed) with server-side logging.
- Added input validation on the chat `message` field (type/length) and a basic per-user rate limit (20 req/hr, in-memory).
- Added real server-side Free/Pro gating: Free-plan users are capped at 5 Recipe Bot messages/day; Pro is unlimited. This was previously unenforced anywhere (client or server).

### Subscription / Stripe
- Checkout was billing `quantity: 3` per subscription — fixed to `1` (verified against a real test-mode checkout session: quantity 1, correct amount).
- Added `stripeSubscriptionId` to the `User` model; the webhook now records it on `checkout.session.completed` and handles `customer.subscription.deleted`/`.updated` to downgrade `plan` back to `"free"` when a subscription ends — previously Pro never reverted.
- Implemented `POST /api/stripe/cancel`, which the settings page already called but which didn't exist (always 404'd, and the UI claimed success regardless). Verified against a real Stripe test-mode subscription: cancel via the endpoint actually cancels it on Stripe's side and reverts the local plan.
- Removed a hardcoded fake secret key constant and a `console.log` of it from the settings page.
- Rewrote the intentionally vague/contradictory billing copy (three different prices, "Pro-ish," etc.) into a plain Free/Pro statement.

### Landing page / auth funnel (light touch)
- Root `/` redirected signed-out visitors straight to `/login`, so the marketing page was never seen — now redirects to `/landing`.
- Wired the two dead buttons ("GET STARTED" → `/register`, "LEARN MORE" → the features section).

### Cleanup
- Removed the `console.log("[CHAOS render] ...")` lines (across all pages, including a few not caught until a production `next build` surfaced them: `app/checkout/success`, `app/checkout/cancel`, `app/(app)/recipes/[id]`) and a dead effect that enumerated secret-shaped env var names in the chat page.
- **Found during build verification, not in the original plan:** `app/components/ClientChaosShell.tsx` wraps the entire app in the root layout (`app/layout.tsx`) and was **on by default** (`NEXT_PUBLIC_CHAOS` unset ⇒ enabled). It runs a perpetual `requestAnimationFrame` loop, grows memory up to a cap, replaces the cursor, and — the actual security issue — monkey-patches `window.fetch` to `console.log` every request's method/URL/headers, which meant **every bearer JWT this app sends via `Authorization` headers was being printed to the browser console** for every user, by default. Fixed by (1) redacting `Authorization`/`Cookie`/`Set-Cookie` in the logged headers, and (2) flipping the flag to opt-in (`NEXT_PUBLIC_CHAOS=1` required) instead of opt-out, since a hidden perf-degrading, cursor-hijacking overlay has no business being on by default for real users. Worth a second look if the "chaos" behavior was actually wanted for some load-testing purpose — as shipped, it was silently active for everyone.

## Verified but not caused by this pass (pre-existing, out of scope)

- A hydration mismatch on `/landing` (the 52 animated "junk orb" elements rendered inline `style` values that differed between server and client) and two pre-existing ESLint errors. All three are resolved as of the UI rework — the orbs are gone with the old landing page, and `npm run lint` is now clean with zero errors and zero warnings.

## Documented follow-ups (not implemented this pass)

- **`mushroom-risotto.jpg` still shows the wrong subject** (a mountain, not risotto) and `caesar-salad.jpg` contains hands. Both need regeneration against a valid `GEMINI_API_KEY`: `npm run generate:recipe-images -- mushroom-risotto.jpg caesar-salad.jpg`. The prompt bug that caused this class of failure is already fixed.
- **JWT in `localStorage` instead of an httpOnly cookie.** `lib/auth.ts` already supports reading a `token` cookie, but nothing ever sets it — the app manually attaches `Authorization: Bearer <token>` from `localStorage` on every fetch. Moving to an httpOnly cookie set on login/register would reduce XSS blast radius, but touches every authenticated fetch call in the app, so it's a larger, separate change. **Where:** `lib/auth.ts`, `app/login/page.tsx`, `app/register/page.tsx`, and every authenticated `fetch` call.
- **Generated recipe images on local disk.** `lib/nanoBanana.ts` writes images with a blocking `fs.writeFileSync` into `public/generated`, which won't persist on most serverless deploy targets (ephemeral/read-only filesystem). Should move to object storage (S3/Cloud Storage/Blob) and ideally be decoupled from the chat response (return the reply immediately, attach the image asynchronously). **Where:** `lib/nanoBanana.ts`, `app/api/chat/route.ts`.
- **"Delete Account" is not implemented.** It was a button wired to nothing; it's now explicitly disabled and labelled as unavailable rather than silently doing nothing. Implementing it needs cascading deletes across `ChatMessage`/`MealPlanRecipe`/`MealPlan`/`Ingredient`/`Recipe`/`User`, since the Prisma schema has no `onDelete: Cascade` anywhere.
- **No `PUT`/`DELETE` on `/api/meal-plans/[id]`** — there's no way to rename/reschedule/delete a plan or remove a single meal-plan entry once added. Only create/list/add exist today.
- **Add `onDelete: Cascade`** to the relevant Prisma relations, and set up a real `prisma/migrations` history — the project currently only uses `prisma db push` with no migration files.
- **Rate limiting is process-local** (`lib/rateLimit.ts`, an in-memory `Map`). It resets on restart and doesn't coordinate across multiple server instances. Fine for this exercise; a shared store (Redis) is needed for real production use.
- **Broader validation adoption.** The hand-rolled validator in `lib/recipeInput.ts` covers the recipe payload; if the team wants schema validation more broadly, `zod` (not currently a dependency) would be a reasonable addition.
- **No automated tests exist.** At minimum, the IDOR fixes and the meal-plan `recipeId` fix in this pass are exactly the kind of regression that's easy to silently reintroduce — worth covering first.
