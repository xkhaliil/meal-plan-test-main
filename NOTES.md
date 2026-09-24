# Fix notes

Write-up of what was found, what was fixed, and what's left, per `TEST_INSTRUCTIONS.md`. All fixes below were verified against a running instance (curl for API-level checks, a signed-webhook simulation and a real Stripe test-mode subscription for the billing lifecycle, and a headless-browser pass for the UI flows).

## Visual design: ported from cafebinocle.com

The UI is styled after Café Binocle. That site is a **Shopify store on the Dawn theme (v15.2.0)**, so none of its code transfers to this Next.js app — the design was reimplemented from its published tokens rather than copied.

Taken from the site's own `binocle-style.css` custom properties:

| Token            | Value                                      | Use here                      |
| ---------------- | ------------------------------------------ | ----------------------------- |
| `--theme-yellow` | `#FFE26E`                                  | page background               |
| `--theme-beige`  | `#FFFEEC`                                  | cards and surfaces            |
| `--text-color`   | `#594B3C`                                  | text and all borders          |
| `--theme-red`    | `#EF5B34`                                  | primary CTA                   |
| accents          | `#00A881`, `#8AD7F7`, `#F8CCDF`, `#553EE7` | plan badges, highlight panels |

Also carried over: the pill-heavy radius scale (50px pills, 25px cards, 50% circles), 2px brown outlines on everything, uppercase headings, the circular arrow buttons beside section headings, the scrolling ticker band (`app/components/Marquee.tsx`), and the rotating circular seal (`app/components/RotatingBadge.tsx`, from their `logo-rotate` keyframe) plus the `floating` keyframe.

**Measured against the live site** (Playwright, 1440px viewport) rather than eyeballed, so dimensions and timings match exactly:

| Element               | Original                                                          | Here                  |
| --------------------- | ----------------------------------------------------------------- | --------------------- |
| header height         | 150px                                                             | 150px                 |
| primary CTA pill      | 220×76, 24px type, 50px radius, **brown text on red** (not white) | same                  |
| circular icon buttons | 76×76, 2px border, 50% radius                                     | same                  |
| rotating seal         | 417px layout size                                                 | 417px                 |
| blue note pill        | 364×91, 100px radius, `#8AD7F7`                                   | same                  |
| section headings      | 152px / 152px line-height                                         | 152px at `sm:` and up |
| `logo-rotate`         | 30s linear infinite                                               | same                  |
| `floating`            | 2s linear infinite                                                | same                  |

Two measurement traps worth noting: `getBoundingClientRect()` on the seal returns the _rotated_ bounding box (775px mid-spin for a 417px element, up to ~1.41× at 45°), so the real size had to come from `getComputedStyle().width`. And their CTA's label is brown `#594B3C`, not white — easy to assume wrong from a screenshot.

**Landing page structure** mirrors theirs section-for-section, at the measured heights (total page 4399px vs their 4350px):

1. header → 2. wordmark + seal + blue note → 3. split tagline row (480 illustration | 950 heading, 279px) → 4. marquee band (97px) → 5. "our recipes" heading row (256px) + two boxes (280px) + white banner (768px) → 6. statement paragraph at 52px/52px + 265×86 pill + 320×591 side image → 7. collaboration row (835 heading | 485 image, 448px) → 8. two-up question row (630+630, 299px) → 9. footer card (582px).

Their animation set is small and is matched exactly: `logo-rotate` 30s linear, `floating` 2s linear, a looping marquee, and the animated wordmark. They have no scroll-reveal animations, so the GSAP reveals were dropped from this page (they remain on the app pages).

**Hero wordmark.** Their giant wavy wordmark is set in a custom typeface ("Cimo") and shipped as inline SVG brand artwork, so it wasn't copied — that artwork is Café Binocle's mark. `app/components/WavyWordmark.tsx` reproduces the _treatment_ instead: SVG `<text>` in Anton (heavy condensed, Google Fonts) run through `feTurbulence` → `feGaussianBlur` → `feDisplacementMap`. Blurring the noise before displacing is the important part — without it the filter produces gritty ragged edges rather than a smooth undulation. Noise frequency is low on X and higher on Y so displacement varies down the glyph height, making the vertical strokes wave. Their centre logo mark was likewise redrawn generically rather than copied.

**Fonts.** Their display face is **Caprasimo**, which is on Google Fonts, so it's used directly. Their body face is **Founders Grotesk**, a commercial Klim licence — their font files were _not_ copied; **Space Grotesk** stands in for it. Swapping in a licensed copy of Founders Grotesk would need a webfont licence.

One structural note: the shared component classes (`.btn`, `.card`, `.input`, …) are wrapped in `@layer components` so Tailwind utilities still override them. Without the layer, `.card`'s background beat `bg-sky` on the Pro pricing card and the utility silently did nothing.

## UI/UX rework

The app was rebuilt around a single minimal design system rather than per-page ad-hoc styling (previously every page had its own font, background colour, and button treatment — comic/serif mixes, a red nav bar, neon-purple landing page, GIFs plastered on every background).

- **Design system** (`app/globals.css`): warm cream/terracotta/sage palette exposed as Tailwind v4 `@theme` tokens, plus shared `.btn`/`.card`/`.input`/`.label`/`.tag`/`.alert-error` primitives so every page uses the same controls. `prefers-reduced-motion` is honoured globally.
- **Typography** (`app/layout.tsx`): Fraunces (display) + Inter (UI) loaded via `next/font`, replacing the per-page Arial/Georgia/Comic Sans mix.
- **Landing page** rewritten end to end: real value proposition, three-step explainer, feature grid, explicit Free vs Pro pricing, and working CTAs into `/register`. The previous joke copy ("culinary vectors", "GDPR-friendly-ish"), the 52-element animation loop, and the hydration mismatch it caused are all gone.
- **App pages** (recipes, recipe detail, meal plans, weekly planner, Recipe Bot, settings, auth, checkout results) rebuilt on the shared system: consistent page headers, card grids, empty states, loading skeletons, and inline error surfaces instead of `alert()`.
- **Responsive**: every route verified to fit without horizontal overflow at 390px; the app nav collapses to a two-row layout on small screens.
- **Removed** `ClientChaosShell` and `CookingGifPlaster` (plus `lib/cookingGifSources.ts` and their env vars) — a hidden CPU/memory-burning overlay and scattered background GIFs that contradicted the product. Originals remain in commit `ad76ce1`.
- **Ownership-aware UI**: the recipe Delete action now only renders on recipes the signed-in user owns, matching the authorization rules added server-side.

### Motion (GSAP)

Motion language is ported from khalilltaief.com so it reads consistently with the author's own work. `lib/motion.ts` registers GSAP + ScrollTrigger + SplitText + CustomEase and defines the shared tokens:

- **Easings** are the portfolio's exact curves, registered via `CustomEase`: `0.215, 0.61, 0.355, 1` (reveals), `0.34, 1.64, 0.64, 1` (springy accents), `0.32, 0.72, 0, 1` (expo-out).
- **Stagger** is 70ms, matching the `--index` stagger step used across the portfolio.
- **`RevealText`** (`app/components/motion/RevealText.tsx`) does the masked line reveal — SplitText with `mask: "lines"`, each line sliding up out of an overflow-hidden mask, staggered. This is the portfolio's `data-intro-line` treatment.
- **`Reveal`** (`app/components/motion/Reveal.tsx`) does scroll-triggered staggered entrances, equivalent to the portfolio's `data-scroll` hooks. It takes a `deps` prop because the app pages render their lists after an async fetch, so the animation has to re-run once data arrives.
- **Button hover** uses a `::after` wipe layer that rises bottom-to-top over 0.45s — the portfolio's `button-bg` pattern — instead of an instant background swap.

Applied generously on `/landing` (marketing) and sparingly inside the app (card/grid entrances only), so the product UI stays calm.

**Accessibility and failure modes were explicitly handled**, since reveal animations start from `opacity: 0`:

- `prefers-reduced-motion: reduce` skips all GSAP animation and forces final visible state (verified in a reduced-motion browser context: 26 reveal elements, 0 stuck hidden).
- A `<noscript>` style forces reveal elements visible when JS is unavailable.
- A browser assertion checks that no `[data-reveal-item]`/`[data-reveal-text]`/`.reveal-line` element is left below 0.95 opacity after animations settle — currently 0 stuck across the landing page and app.

One gotcha worth recording: Turbopack served a stale CSS chunk after edits to `globals.css`, which made the hover wipe look like it wasn't working. Deleting `.next` and restarting resolved it. Lightning CSS also minifies `::after` to the equivalent single-colon `:after`, so grep for both when checking compiled output.

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

## Second pass — auth, CRUD, AI path, tests

Work done after the first pass, checked against `TEST_INSTRUCTIONS.md`.

### Authentication (`proxy.ts`, `lib/auth.ts`, `app/api/auth/*`)

- **Signed-out visitors could reach the whole signed-in app.** There was no route guard of any kind: `/recipes` rendered the full catalog, `/meal-plans` and `/chat` fired requests with `Bearer null` and showed empty states, and `/settings` sat on its loading skeleton forever. Added `proxy.ts` — Next 16 renamed the `middleware` convention to `proxy`, and the file must export a function named `proxy` — redirecting to `/login?next=…`, and bouncing signed-in users off `/login` and `/register`.
- **The proxy cannot read `localStorage`**, which is where the token lived, so `/api/auth/login` and `/api/auth/register` now also set an **httpOnly `token` cookie** (`setAuthCookie` in `lib/auth.ts`). The client still sends `Authorization: Bearer` on every fetch, so no call sites changed. Added `POST /api/auth/logout` to clear it — httpOnly means the client can't — and account deletion clears it too.
- The proxy only checks that the cookie is **present**. Verifying the signature needs `jsonwebtoken`, which doesn't run on the edge runtime. **The API routes remain the authorization boundary**; each still verifies the token itself. See the follow-up below.

### Recipe catalog

- **`GET /api/recipes` and `GET /api/recipes/[id]` required no session at all** — every user's recipes were readable by anonymous callers. Both now require one.
- The catalog stays **shared across accounts deliberately**: every seeded recipe belongs to alice, so scoping reads to the owner would leave bob and charlie with an empty app. Writes stay owner-checked. To make catalogs per-user instead: add `where: { userId: session.userId }` to both GETs and spread ownership in `prisma/seed.ts`.
- **Full CRUD, with confirmation.** `PUT /api/recipes/[id]` silently ignored `ingredients`, so edits dropped them — it now replaces the list in one nested write. Every update and delete in the UI goes through `ConfirmDialog`, built on `<dialog>` so the browser owns focus trapping and Escape.

### Meal plans

- **Added `PUT` and `DELETE` to `/api/meal-plans/[id]`** (rename, re-date, delete) and a new **`/api/meal-plans/[id]/entries/[entryId]`** route (`PUT` to move a meal, `DELETE` to remove one). A plan could previously only be created and added to, never corrected. The entry route verifies **both** the plan and that the entry belongs to it, so an entry id from another user's plan can't be touched by naming a plan you own.
- Plan deletion removes its entries first, since no relation declares `onDelete: Cascade`. Account deletion does the same, and also clears entries pointing at the deleted user's recipes from _other_ users' plans.

### Recipe Bot

- **The model was losing the conversation.** History was read with `orderBy: asc, take: 50`, which pins the window to the _oldest_ 50 messages — past 50, it never saw anything recent again. Now takes the newest 50 and reverses.
- **The transcript was never displayed.** Messages were persisted and replayed to the model, but the page started empty on every visit, so the bot remembered what the user couldn't see. `GET /api/chat` now returns the transcript and the remaining quota.
- **No upstream call had a time bound.** Added `lib/withTimeout.ts`; the completion uses the SDK's 30s timeout, image generation is capped at 25s, and a slow image no longer holds up a recipe that is already saved.
- The client `fetch` had no `try`/`catch`, so a network failure left the composer disabled until reload.
- **Plan enforcement now matches the marketing copy.** Image generation is Pro-only — it costs money per call and was already advertised as a Pro feature. The "unlimited meal plans" bullet was removed from the landing page and settings, because nothing caps plans: claim it or enforce it, not neither.

### Account management (`app/api/auth/me/route.ts`)

- Added `PATCH` (name, email, password; email and password changes require the current password) and `DELETE` (password-verified, and it cancels any live Stripe subscription **before** deleting, so a deleted account can't keep billing). This closes the "Delete Account is not implemented" follow-up.

### Tests (`lib/__tests__`, `npm test`)

- Added **vitest** (v3 — v5's peer range wants a newer `@types/node` than this repo pins) and 19 tests over the logic most likely to regress unnoticed: `validateRecipeInput` (the only thing between a model tool call and a database row), `isRateLimited`, and the ingredient scaler, which moved out of the recipe page into `lib/ingredients.ts` to be testable.

### Other

- `STRIPE_WEBHOOK_SECRET!` and `signature!` were non-null assertions, so a missing env var surfaced as a confusing "invalid signature" 400. Both are checked now: 500 for misconfiguration, 400 for a missing header.
- Responsive: four landing headings jumped straight to 152px at `sm`, where a single word is wider than the viewport and forced horizontal scrolling — they scale with `clamp()` now. Card stacking contexts are isolated so action buttons stop painting over the sticky navbar.

## Third pass — closing the documented follow-ups

- **The proxy now verifies the JWT signature**, not just the cookie's presence, using `jose` (`jsonwebtoken` needs Node built-ins the edge runtime lacks). A token that fails verification is deleted on the way past, so a dead cookie isn't sent again. The API routes still verify independently.
- **Route-handler tests.** `app/api/__tests__/ownership.test.ts` mocks Prisma and `getUserFromRequest` and asserts the decisions that matter: 401 without a session, 403 on another user's recipe or plan, 404 for an entry id that belongs to a different plan, and a 400 when a date range inverts. 28 tests total via `npm test` (`vitest.config.ts` sets a `JWT_SECRET`, without which `lib/auth.ts` throws at import).
- **Chat can be reset without refunding the quota.** Added `archived` to `ChatMessage` and `DELETE /api/chat`, which archives rather than deletes: archived rows leave the transcript and the model's context but still count toward the free daily limit. "New conversation" in the chat rail, behind a confirmation.
- **Image generation no longer blocks the reply.** It runs inside Next's `after()` — the recipe is already saved, so the response goes out immediately and the photo lands a few seconds later. Failure keeps the placeholder.
- **The Pro price is live.** `GET /api/stripe/price` reads the amount from Stripe, caches it for an hour, and falls back silently; `ProPrice` renders it on the landing page and in settings, so no figure is ever hardcoded against what customers are actually charged.
- **`onDelete: Cascade` added** to every relation (`Recipe→Ingredient`, `Recipe→MealPlanRecipe`, `MealPlan→MealPlanRecipe`, `User→*`). The explicit delete transactions stay — they're portable and they document the order — but they're no longer the only thing preventing orphans.
- **Route conventions.** Added `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` and a segment `loading.tsx`; a thrown error used to fall through to Next's dev overlay and a blank page in production. Next 16 passes `unstable_retry` alongside `reset`, and the boundaries accept either.
- **Accessibility.** Nothing but `.input` had a focus style, so keyboard users had no visible focus on buttons, links or cards — added a global `:focus-visible` ring (inverted on brown/red surfaces) and a skip link to `#main`.
- **The catalog endpoint stopped being a blunt instrument.** `?view=summary` returns two counts and `?view=options` returns id/title pairs; settings was downloading every recipe with all its ingredients to display two numbers, and the meal-plan picker did the same to fill a `<select>`.
- **Both auth mechanisms now travel together.** Four catalog reads sent no `Authorization` header and worked only via the cookie, which would have half-broken the app the moment the 7-day cookie expired ahead of the token.

## Fourth pass — state management and rate limiting

### Zustand stores (`lib/stores/`)

- **`authStore`** replaces two dozen scattered `localStorage.getItem("token")`
  reads. It owns the user, the token, `signIn`/`signOut`/`patchUser`, and an
  `authHeaders()` helper that every authenticated fetch now uses. Nothing reads
  storage during the initial render — the server has no session, so the store
  starts empty and `AuthHydrator` fills it after mount; reading storage in the
  initial state would make the first client render disagree with the server's
  HTML. `useAuthUser()` still exists and just selects from the store, so its
  three consumers didn't change.
- **`recipeStore`** holds the catalog plus `fetchRecipes`, `fetchOptions`,
  `updateRecipe` and `deleteRecipe`. The catalog page, the detail page and the
  settings counts previously each fetched and mutated their own copy, so an edit
  on one view left the others stale until they refetched.
- **`mealPlanStore`** holds the list _and_ the open plan, with `createPlan`,
  `updatePlan`, `deletePlan`, `addMeal` and `removeMeal`. Deleting a plan from
  its detail page used to leave a stale card on the list.
- Two `useEffect`s that mirrored store data into local state were replaced with
  derived values (`activeRecipeId`, `activePlanId`) — the lint rule against
  setState-in-effect caught them, and deriving is one fewer render anyway.
- The chat page keeps its own local state: its concerns (scroll position,
  composer height, abort controller) are genuinely view-level. It uses the
  store for auth headers only.

### Rate limiting (`lib/rateLimit.ts`, `RateLimitHit`)

- Was an in-process `Map`: it reset on every restart, and each instance counted
  separately, so three instances handed out three times the allowance. It now
  counts rows in a `RateLimitHit` table, which is already shared between
  instances and durable, with an opportunistic sweep of expired rows (at most
  one per process per ten minutes).
- **Fails open**: if the database is unreachable the request is allowed, rather
  than locking every user out of the app over a limiter.
- **Known trade-off:** count-then-insert is not atomic, so two simultaneous
  requests can both pass on the boundary. Redis `INCR` with a TTL would be
  atomic and faster; this version needs no infrastructure beyond what the
  project already runs. The caller is now `await isRateLimited(...)`.

## Fifth pass — test layers and Stripe

### Four test layers

| Layer       | Where                                | Covers                                                                              |
| ----------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| Unit        | `lib/__tests__`, `app/api/__tests__` | Pure functions and handler decisions with Prisma/Stripe mocked.                     |
| Integration | `tests/integration`                  | Real handlers + real Prisma against a throwaway SQLite file built by `globalSetup`. |
| Component   | `tests/component`                    | jsdom + Testing Library over `ConfirmDialog`, `Pagination`, `RichText`.             |
| E2E         | `tests/e2e`                          | Chromium via Playwright against a running server.                                   |

`npm test` runs the first three; `npm run test:e2e` the last; `test:all` both.
CI gained an `e2e` job that seeds a database, installs Chromium and runs
Playwright against a production build, gated behind `needs: verify`.

Notes worth keeping: jsdom 29 implements no `<dialog>` modal methods, so the
component setup polyfills `showModal`/`close`; Prisma refuses `--force-reset`
behind a destructive-action prompt, so the integration setup deletes its file
and pushes instead; and E2E signs in as **bob**, because alice's seeded
password no longer matches `TEST_INSTRUCTIONS.md`.

### Stripe

Verified against the live test-mode account first: the key is test mode, the
account is reachable with charges enabled, and the Pro price resolves to
**$29.99/month, active**. Five defects found while reading the code:

- **Checkout returned Stripe's raw error text to the browser** — messages that
  name price IDs and say things like "a similar object exists in live mode".
  Now logged server-side with a generic message in the response.
- **A Pro subscriber could buy a second subscription** by reopening the upgrade
  page; nothing checked the current plan. Now a 409.
- **Every upgrade created a fresh Stripe customer.** The route never loaded the
  user, so `stripeCustomerId` was ignored — re-subscribing scattered duplicate
  customers. It now reuses the known customer, or passes `customer_email`.
- **The webhook failed silently when `metadata.userId` was missing**: payment
  taken, nobody upgraded, no trace. It logs now. Same for a session that
  carries no subscription id, which would otherwise make cancelling impossible.
- **Cancel stranded accounts on Pro** if Stripe had already forgotten the
  subscription (cancelled in the dashboard, or a stale id): the route 500'd and
  the plan never came back. `resource_missing` now reconciles locally; other
  failures still refuse, with a 502 and no raw message.

24 tests cover it. The webhook ones are integration-level and sign their own
payloads with Stripe's HMAC helper — real signature verification, real database
writes, no network — covering upgrade, downgrade on delete and on `unpaid`,
leaving `active` alone, ignoring another account's subscription, replay safety
(Stripe retries), and rejecting both a forged signature and a missing one. The
checkout/cancel/price tests mock the SDK. One E2E test asserts the **live**
price reaches the settings page, which a hardcoded fixture could never catch.

## Documented follow-ups (not implemented)

- **`mushroom-risotto.jpg` still shows the wrong subject** (a mountain, not risotto) and `caesar-salad.jpg` contains hands. Both need regeneration against a valid `GEMINI_API_KEY`: `npm run generate:recipe-images -- mushroom-risotto.jpg caesar-salad.jpg`. The prompt bug that caused this class of failure is already fixed.
- **Generated recipe images still land on local disk.** `lib/nanoBanana.ts` writes with a blocking `fs.writeFileSync` into `public/generated`, which won't persist on serverless targets. The chat response no longer waits for it (it runs in `after()`), but the storage itself needs moving. **How:** object storage (S3/Cloud Storage/Blob), writing the returned URL to the recipe. **Where:** `lib/nanoBanana.ts`.
- **The Bearer token still lives in `localStorage`.** Login now also sets an httpOnly cookie, so the XSS blast radius is smaller, but the client still reads the token from `localStorage` for the `Authorization` header. **How:** have the API routes read the cookie only, and drop the header from every authenticated `fetch`.
- **No `prisma/migrations` history.** The schema is applied with `db push`, so there's no reviewable, reversible record of changes. **How:** baseline with `prisma migrate diff --from-empty --to-schema-datamodel` into an initial migration, then `migrate resolve --applied` — not run here because `migrate dev` against a database with data and no history wants to reset it.
- **Rate limiting is process-local** (`lib/rateLimit.ts`, an in-memory `Map`). It resets on restart and doesn't coordinate across multiple server instances. Fine for this exercise; a shared store (Redis) is needed for real production use.
- **Broader validation adoption.** The hand-rolled validator in `lib/recipeInput.ts` covers the recipe payload; if the team wants schema validation more broadly, `zod` (not currently a dependency) would be a reasonable addition.
