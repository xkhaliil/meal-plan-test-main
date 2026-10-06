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

## Landing intro (removed)

`/landing` had an opening curtain — the wordmark rising letter by letter out of
its mask, a counter running 000–100, five slats lifting right to left — in
`app/components/LandingIntro.tsx`. It has been taken out: the component, its
five Playwright specs, the `data-intro-reveal` hooks on the landing page, the
`.landing-intro` rule in the root layout's `noscript` block, and `intro` from
the `public` project's `testMatch`.

The page now renders straight into the hero, which was also the fastest thing
it could do: the curtain was the only reason the hero needed a
`clearProps` pass, and nothing on the page starts hidden any more.

## Sign in / register redesign

Both pages were a centred card on an empty yellow field — the one part of the
app that still looked like a scaffold. They now share a split frame,
`app/components/auth/AuthShell.tsx`: a brown brand panel (statement, numbered
value points, a pair of outlined rings) beside the form on the
yellow ground, divided by the same 2px rule every landing band uses. Below
`lg` the panel collapses to a short masthead so the form stays above the fold
on a phone.

- **`AuthField`** (`app/components/auth/AuthField.tsx`) is the shared input:
  `useId` for the label/input pairing, `aria-describedby` for the hint,
  `aria-invalid` when a field fails its own rule, and a reveal toggle on
  password fields. Five component tests cover that wiring.
- **The register form now validates as you type** — length and match are
  derived from state, never copied into it — and shows a four-pip strength
  meter. The rules match what `app/api/auth/register/route.ts` enforces
  (8 characters); the server is still the one that decides.
- **Both pages gained a `<main id="main">`.** The root layout's skip link
  pointed at an anchor that didn't exist on either page.
- **The email is trimmed before it is sent.** The login lookup is exact, so a
  pasted address with a trailing space failed with "invalid credentials".
- **Login offers to fill the seeded demo account** (`bob@example.com`, from
  `TEST_INSTRUCTIONS.md`) rather than making a reviewer copy it across.
- `tests/e2e/auth.setup.ts` now anchors its password locator (`/^password$/i`):
  the reveal toggle is labelled "Show password", which made the old loose
  pattern ambiguous.

## Checkout success page

`/checkout/success` was a static page that told everyone who loaded it "You're
on Pro", payment or not — and locally, where no `stripe listen` is running, that
was usually a lie: the webhook is what flips the plan.

- **`GET /api/stripe/session`** reads the session back from Stripe. It
  authenticates, and refuses (403) unless `metadata.userId` matches the caller,
  because the session id travels in a URL and can be pasted or shared.
- **It reconciles what the webhook would have done** when Stripe reports the
  session paid and complete but the account is still free — the same idempotent
  update, for a delayed webhook in production or none at all in development.
  The webhook remains the primary path.
- **The page now has five honest states**: checking, on Pro (with a receipt —
  amount, interval, billing email, renewal date), payment received but not yet
  applied (it polls four times, then says so), checkout never completed, and
  couldn't confirm. The brand panel's copy changes with them.
- On success it calls `patchUser({ plan: "pro" })`, so the navbar and settings
  agree without a reload.
- Reuses `AuthShell`, which took a `back` prop so the corner link can point at
  the app rather than the marketing page.
- Eight unit tests in `app/api/__tests__/stripe.test.ts` cover the new route,
  including the cross-account 403 and that Stripe's error text never reaches
  the browser.

## Cancelling Pro

"Cancel subscription" on the settings page fired the moment it was clicked —
the one destructive action in the app that wasn't behind `ConfirmDialog`. It now
opens the same dialog every other destructive action uses, and the copy says
what actually happens: `stripe.subscriptions.cancel` ends the subscription
immediately, not at the end of the paid period. The success page's blurb, which
claimed the opposite, was corrected to match.

## Recipe Bot: which provider answers

The key in `.env` was an Anthropic key (`sk-ant-…`) sitting in `OPENAI_API_KEY`.
Both providers prefix with `sk-`, so it looked right and failed as a bare 401
from `api.openai.com` — which the route correctly turned into "Recipe Bot isn't
set up correctly on our side", with nothing saying why.

`lib/openai.ts` now reads the prefix and configures itself:

- `sk-ant-…` → `baseURL: https://api.anthropic.com/v1/`, `CHAT_MODEL:
claude-haiku-4-5-20251001`. Anthropic serves an OpenAI-compatible Chat
  Completions API, so the SDK, the route and the `create_recipe` tool call are
  unchanged.
- anything else → OpenAI, `gpt-4o-mini`, exactly as before.

Switching provider is a `.env` edit and a restart. `CHAT_MODEL` and
`CHAT_PROVIDER` are exported from `lib/openai.ts` rather than hardcoded in the
handler, so the model can't drift from the base URL; the 401 log names whichever
provider actually rejected the call.

Verified against the running app, not just the unit tests: a plain question came
back with an answer, and "create and save a recipe for lemon garlic butter
shrimp" produced a saved recipe with nine ingredients — so tool calling survives
the compatibility layer.

## Landing: the stranded arrow button

The circular arrow beside "Your catalog" was floating in open space, attached to
nothing. It and the heading are two items in one `flex flex-wrap` box; the
heading at `clamp(3rem,11vw,152px)` is wider than that box at most widths, so it
fills the line and the arrow wraps onto its own. A wrapped flex line defaults to
`flex-start`, which put the arrow hard left while the heading above it is
`text-right`.

`justify-end` on that box fixes it — the arrow now ends the line under the last
word instead of starting a new one on the far side. Checked at 1440px, 1024px
and 390px.

## Vercel readiness

- **Image optimization is off** — `images.unoptimized: true` in
  `next.config.ts`. Every `next/image` renders the file as authored, so no
  transformations are billed and a remote `src` needs no `remotePatterns`
  allowlist. Verified on the rendered page: no `/_next/image?url=` anywhere.
  `ChefLogo` is inline SVG now, so it no longer depends on this flag.
- **`npm run build` is now `prisma generate && next build`.** Vercel can restore
  a cached `node_modules` without re-running `postinstall`, which leaves a stale
  Prisma client against a changed schema.
- **`engines.node` pinned to >=20.9**, so the host doesn't pick a major the app
  has never been run on.
- **`lib/nanoBanana.ts` checks that it can write before generating.** The write
  into `public/generated` fails with EROFS on a read-only host; it used to find
  out after paying for a 2K image and waiting 25 seconds. It now throws
  `ImageStorageUnavailableError` up front, the `after()` block logs it, and the
  recipe keeps its placeholder.
- **SQLite → Postgres.** SQLite cannot be deployed to Vercel at all — read-only
  filesystem, ephemeral instance — so `prisma/schema.prisma` is now
  `postgresql`. The models needed no changes: they were already plain Strings,
  Ints, DateTimes and Booleans with cuid ids.

  What did change is everything that assumed a file:

  - `tests/integration/globalSetup.ts` creates a uniquely named schema
    (`test_…`) per run and drops it afterwards, instead of deleting and
    recreating a `.db` file. Testing against the engine production uses is the
    point — case sensitivity, transaction semantics and constraint errors all
    differ between the two.
  - `vitest.config.ts` includes the integration project only when a Postgres is
    configured, and prints why when it doesn't. `npm test` still runs unit and
    component tests on a machine with no database; CI always sets
    `TEST_DATABASE_URL`, so nothing goes unenforced there.
  - `tests/integration/database.ts` resolves the URL for both. It falls back to
    `DATABASE_URL` only when that is localhost: these tests drop a schema, which
    is not a thing to do by accident against a hosted database.
  - Both CI jobs now run a `postgres:16` service container.

  The move is no longer theoretical — see "Neon" below. What is still unproven
  is the _integration test_ path: it needs a Postgres it may create and drop
  schemas in, which is not something to point at the production database. CI's
  service container is what exercises it.

## Neon: the database, provisioned

`vercel install neon` provisions a Lakebase Postgres, connects it to the Vercel
project and injects the credentials. It happens to inject `DATABASE_URL`
(pooled) and `DATABASE_URL_UNPOOLED` (direct) under exactly those names, so
Prisma needed no mapping — worth checking per provider, since Prisma reads
`DATABASE_URL` and nothing else.

**The env files disagree on purpose, and the tools read different ones.** This
cost a confusing ten minutes, so it is written down:

| File         | Read by                       | Holds                        |
| ------------ | ----------------------------- | ---------------------------- |
| `.env.local` | Next.js (takes precedence)    | What `vercel env pull` wrote |
| `.env`       | The Prisma CLI, and only this | Everything, merged by hand   |

`npm run dev` worked off `.env.local` while every `npx prisma` command failed
with `P1012` against `.env`'s leftover `file:./dev.db`. Both files are
gitignored. `.env` now carries the whole set, with `DATABASE_URL` pointed at the
**direct** connection: it is the CLI's value, and schema pushes should not go
through the pooler. The deployed app uses Vercel's own pooled variable.
`VERCEL_OIDC_TOKEN` was deliberately left out of `.env` — it is short-lived and
rewritten on every pull.

Then, against Neon: `prisma db push` created the tables, `prisma db seed` filled
them — 3 users, 20 recipes, 2 meal plans, 8 chat messages. alice is Pro again
with the password `TEST_INSTRUCTIONS.md` documents, which the old development
database had drifted away from.

### What the install left behind

`.agents/skills/neon/` and `.agents/skills/neon-postgres/` (128 KB of Neon's
agent documentation from `neondatabase/agent-skills`), `.claude/skills/neon*` as
symlinks to them, and `skills-lock.json` pinning both by content hash. None of
it is application code and nothing in the build reads it; it is instructions
written for AI agents, and is treated as data, not as commands. Untracked —
commit or delete as you prefer.

### Still open after the move

- **`prisma/dev.db` was not migrated.** The old SQLite file still holds what the
  development database had: bob's Pro status from the Stripe test checkout, the
  recipes created through the bot, the chat history. Neon was seeded fresh
  instead. Node 24 ships a built-in SQLite reader if that data is ever wanted.
- **Integration tests skip against Neon by design.** `resolveTestDatabaseUrl`
  falls back to `DATABASE_URL` only when it is localhost, because these tests
  create and drop schemas. Enable them with a Neon branch as
  `TEST_DATABASE_URL`, or a local Postgres container.
- **End-to-end sign-in was not re-checked** after seeding; the dev server was
  not running. The database itself was verified directly — the three accounts,
  the counts, and a Prisma query through the app's own client.

## Sign in / register: silent failures

Reported from the deployed site: clicking "Sign in" did nothing — no redirect on
success, no message on failure. Locally it worked, which was the clue. Two
faults, both in the submit handlers:

- **`fetch` had no `try`/`catch`.** A rejected fetch — no network, a function
  that never answers, a 502 from the edge — threw straight out of the handler.
  `setBusy(false)` never ran, no error was set: the button sat on "Signing in…"
  for ever, saying nothing.
- **`setBusy(false)` ran _before_ `router.push`.** On success the button snapped
  back to "Sign in" and _then_ navigation began — a server round trip through
  the proxy into a possibly cold function. For that whole window the page looked
  untouched.

Both forms now run a three-phase state (`idle` → `sending` → `signedIn`/`created`)
and stay disabled through the redirect, with a green "Signed in — opening your
kitchen…" status beside the error slot. `lib/apiMessage.ts` turns a failed
response into something worth reading: the API's own message when there is one,
otherwise a status-derived line, so a 500 from a route that threw at import no
longer reports itself as "Login failed". Six unit tests cover it.

Verified in a browser across all six outcomes — wrong password, crashed server
(500 with an HTML body), network failure, success, duplicate email, and a
network failure during registration — plus the success banner under an
artificially slow redirect.

**Unrelated test bug found on the way.** `tests/e2e/app.spec.ts` built a regex
from a recipe title: `new RegExp(title)`. Harmless until the catalog contained
"Tunisian Couscous (Couscous Tunisien)", whose parentheses became a regex group
so the pattern stopped matching the heading it came from. It matches on the
plain string now.

## Errors that used to be silent: toasts

Every mutation in the app was a bare `await fetch(...)`. A rejected fetch — no
network, a function that never answers, a request cancelled mid-flight — escaped
as an exception, and whether the reader was told anything depended on whether
that particular click handler happened to have a `try`/`catch`. Most didn't.

**`lib/apiClient.ts`** makes failure a value instead: `requestJson` never
throws, and returns either the body or a message worth reading (the API's own
when there is one, otherwise derived from the status by `lib/apiMessage.ts`).
Both stores and every page fetch now go through it, so `readError` — which was
duplicated in `recipeStore` and `mealPlanStore` and only ever read `data.error`
— is gone.

**`lib/stores/toastStore.ts` + `app/components/Toaster.tsx`** cover the actions
with no error slot of their own. Errors get `role="alert"`, confirmations
`role="status"`, the live region is always mounted, identical messages don't
stack, and removal is scheduled in the store so a toast still expires while its
page navigates away. Mounted once in the root layout.

Forms keep their inline errors — a message about a field belongs beside the
field — so nothing is reported twice. What gained a toast is what previously
said nothing at all:

| Action                               | Before                                       |
| ------------------------------------ | -------------------------------------------- |
| Recipe catalog / meal plan list load | list silently came up empty                  |
| Settings page load                   | skeleton stayed on screen for ever           |
| Chat transcript load                 | transcript came up empty, as if never used   |
| "Start a new conversation"           | button did nothing, said nothing             |
| Recipe detail load failure           | reported as "not found", whatever went wrong |
| Upgrade / cancel subscription        | inline only; now both, plus a success toast  |

Verified in a browser with the relevant API aborted: all five paths raise a
toast. Ten new tests — five on `requestJson`, five on the Toaster.

Two things left deliberately alone: the chat send path already renders its
failure as an assistant bubble, and `ProPrice` falls back to "Billed monthly
through Stripe" by design.

## Redesign after faceiqlabs.com

The client asked for the design of faceiqlabs.com in place of the cafebinocle
look. The _design language_ was adopted; the brand was not. MealPlan keeps its
own name, logo, copy and food photography, and nothing on the page is a
fabricated metric or review: faceiqlabs.com opens with "1,300,000+ users" and a
wall of testimonials, and this app has neither to report. Those patterns are
kept with true content instead — the proof row counts the seeded catalog
(20), the planner's slots (21) and the bot (1); the italic serif set piece
shows example prompts, labelled as examples.

**What faceiqlabs.com is made of**, measured from the live page: Playfair
Display (400, tracking about −2.5%) for headlines, Manrope for everything else,
Tailwind's zinc scale and nothing else, a frosted pill nav (`white/80`,
`blur(24px)`, hairline `zinc-200/60` border) floating 16px clear of the top, pill
buttons in `zinc-900`, 24px-radius cards, soft blue-lavender washes behind the
hero and the closing call to action, and one dark `zinc-950` band.

**Foundation** — `app/layout.tsx` loads Playfair Display and Manrope through
`next/font` (Caprasimo, Space Grotesk, Anton and Geist are gone).
`app/globals.css` uses Tailwind's own `zinc-*` utilities rather than bespoke
tokens; it defines `.btn-*`, `.card`, `.input`, `.label`, `.tag`, `.eyebrow`,
and the `hero-wash`, `glass` and `dot-grid` utilities.

One cascade bug found on the way: the `body` and `h1,h2,h3` defaults were
unlayered, and an unlayered rule beats every layered utility regardless of
specificity — so `font-sans` on a card title and `text-white` on a heading in
the dark band both silently lost. They live in `@layer base` now.

**Landing** — rebuilt in faceiqlabs.com's section order: floating nav
(`app/components/landing/LandingNav.tsx`), centred serif hero with the product
in a browser frame (`WeekMockup.tsx`, built in HTML rather than a screenshot so
it stays sharp and can't go stale), image-backed pillar cards with big serif
numerals, a hairline statement band, italic serif prompts, a numbered feature
grid, how-it-works, pricing on the dark band, and a closing call to action. The
morphing hero text is gone with the rest of the old look.

**Everything else** — the app nav is the same frosted pill (`Navbar.tsx`,
sticky so the chat's full-height column still works; links drop to a second row
inside the pill on phones). Auth and checkout pages share `AuthShell`, now a
centred column on the hero wash. Every signed-in page got a serif masthead,
hairline cards, frosted filter bars and soft hovers in place of the old
invert-to-brown.

The bulk conversion was mechanical — a script mapped the old palette, 2px
brown rules, card/pill radii and offset shadows onto zinc hairlines, and dropped
uppercase from serif headings and buttons — followed by a hand pass on every
page's masthead, chips, cards and error colours, checked in screenshots at
1440px and 390px. A grep for the old tokens comes back empty.

**Removed** as dead once the old look went: `Marquee`, `RotatingBadge`,
`CookIllustration`, `WavyWordmark`, `LandingHeaderActions`, the
`components/ui/morphing-text` component, the legacy colour tokens, and the
`logo-rotate`/`floating`/`marquee` keyframes. Three of the standing lint
warnings went with them.

**Fixed along the way**

- _Chat replies numbered every list item "1."_ Models put blank lines between
  items, and a blank line closed the list, so each item became its own
  one-item `<ol>`. Blank lines no longer end a list, and a list that resumes
  keeps the model's numbering via `start`. Two component tests.
- _The catalog's cuisine chips were clipped on the left_ — a centred flex row
  that overflows can't scroll back to its start.
- _Meal-plan slots broke titles mid-word_ ("Avocad / o Toast") in the
  seven-column grid.
- _The settings price E2E assumed its account was on the free plan._ It now
  skips, with the reason, when bob is on Pro — which he is: the deployed site
  and local development share the Neon database, and a test checkout on the
  live site upgraded him.

## Landing intro and hero after agrumeafarm.it

The client asked for agrumeafarm.it's loading intro, exactly, and its hero with
food in place of the jars. Both were studied frame by frame from the live site
before building: a 120ms screenshot sequence through the intro, the loader's
DOM over time, and the hero under hover and scroll.

**The intro** (`app/components/landing/FruitIntro.tsx`) reproduces the
choreography and timings measured from the original: a serif percentage counts
0→100 over about 1.7s; flat fruit drop from above under real physics and pile
up until they bury the screen; a dark panel rushes up from the bottom
(expo-out, ~0.55s), covers everything, and lifts off the top (~0.7s) as the
hero fades in underneath.

- **Physics is matter-js**, as the original's tumbling (rotations up to ~75°
  from collisions) is a rigid-body simulation, not a tween. Imported on demand
  inside the intro only — an 83 KB chunk nothing else loads. If it takes
  over 1.5s the intro runs without the fruit rather than waiting.
- **The fruit are agrumeafarm.it's own loader artwork**, recoloured
  (`fruits.ts`), at the client's request after a first version drawn for the
  app didn't look like real fruit. All eleven drop twice, sized, placed and
  simulated as on the original (its breakpoints, gravity, walls and fruit
  material); each physics body is the convex hull of the original's collision
  outline, aligned with the drawing through the hull's centroid. It is
  another site's artwork, so the client should confirm they may use it
  before this ships.
- **The counter is Playfair Display with lining figures.** The original uses
  IvyMode, a commercial Adobe font.
- Plays once per full page load (module flag), never under reduced motion,
  hidden by the root layout's `noscript` block, and it releases the scroll lock
  as soon as the panel covers the screen _and_ on unmount.

One bug worth recording: the panel's starting offset. Tailwind v4's
`translate-y-full` sets the separate CSS `translate` property, which stacks on
top of GSAP's `transform`; an inline `translateY(100%)` is no better, because
GSAP reads it back as pixels and adds its own `yPercent` on top. Either way every
panel position was a screen too low, so the hero was revealed before the panel
covered anything. The panel is now parked with `top: 100%` and GSAP owns
`transform` from zero.

A second: the scroll lock hides the page's scrollbar, and the hero's pin was
measured while it was hidden. Once the scrollbar came back, the pinned hero
kept the scrollbar-less width (15px wider on Windows), so the dome sat 7.5px
off-centre against its continuation below the hero. Releasing the lock now
calls `ScrollTrigger.refresh()` while the panel still hides the page
shifting, and the hero measures itself again on that refresh. Playwright
hides scrollbars by default, so seeing this in a test takes
`--hide-scrollbars` out of its default arguments.

**The hero** (`PlateHero.tsx`) is agrumeafarm.it's jar slider rebuilt from
its own source (`HomeHero`), constant for constant, after a first version that
only imitated it. Plates stand in for the jars and a ring of text around each
plate (dish, real prep-plus-cook time, cuisine) for the jar's label.

- **Marquee.** The items ride an endless track tilted 10°. Spacing, item size
  (1013:630 boxes) and track height follow the original's phone, tablet and
  desktop breakpoints. Each item is spread out from the centre (`tanh`
  warp), scaled from 0.55 to 1.35 and brightened toward the centre, and
  blurred up to 4px (2px on phones) away from it. Each also gets a sine sway
  of up to 18° and a fixed per-item rise.
- **Motion.** The track eases toward its goal (rate 2.3, or 11 while dragged).
  Speed adds lean, a slight squash, blur, and a turn of the label. Drag moves
  it 1.5px per pixel, with a fling on release, and a drag never follows the
  link. Each item has springs (stiffness about 70, damping 9) for turn, lean,
  lift and pull toward the cursor, plus cursor parallax.
- **Labels.** They do not spin on their own. Each turns once during the
  entrance and once per hover, over 2s eased in and out, once the track has
  settled (260ms dwell). The item carries `data-spin-elapsed` while it turns,
  as on the original.
- **Rings are canvases.** They were SVG `textPath` at first, and scrolling
  the hero ran at about 18fps: Chrome lays SVG text out again whenever a
  transform above it changes, which on a moving marquee is every plate, every
  frame, and each scroll step then forced that layout. Painted once into
  canvases (`paintCircleText`, same font, size, spacing and start point), they
  are only rotated and scaled by the compositor. Measured on this machine's
  GPU at 2× density while scrolling: 18fps before, 119fps after (the display's
  120Hz), with layout down from about 2.3s to 9ms over the run. The original
  draws its labels into canvases too. Canvases are painted at once in whatever
  font is ready and again when the fonts load, and repainted if the browser
  reclaims their GPU memory (`contextrestored`).
- **Dome.** The client's back-slider shape, `max(750px, 80vw)` wide (120vw on
  phones), its artwork 0.96 of that width, drifts with the cursor. Dome,
  badge and items fade and rise in over 1.15s when the intro lifts. The prompt
  fades up 180ms later. Breakpoints match the original's inclusive ones (480
  is a phone, 1024 a tablet), which Tailwind's exclusive `max-*` had shifted
  by a pixel, leaving a 1024px-wide screen with tablet-sized plates on the
  desktop track.
- **The badge's words sit below the plates.** On the original they run round
  a circle behind the jars, in letters big enough to read between them. Our
  plates with their text rings are far wider than jars and hid the words, so
  they sit on a flatter arc in the free band between the centre plate's ring
  and the "Scroll to discover" prompt, centred in it, up to 40px (18px
  minimum). The arc's radius is 1.1 × the dome's width where the hero is tall
  enough, flattening to as much as 8× where it is not, so the centred phrase
  stays clear of the hero's bottom edge; words further along fade out 20px
  above that edge instead of being cut by it. They move as the original's badge
  does: they turn with the track at −0.012° per pixel (−0.03 on phones) and
  from −18° on the way in, converted to how far the original badge's rim
  travels, so they slide along the arc at the original's pace, opposite to the
  plates. The arc is too large to paint once and rotate, so its visible strip
  is redrawn on the frames it moves, by stamping letters pre-rendered into a
  sheet: drawing rotated text afresh each frame cost a fifth of the frame
  rate. The strip is clipped to the dome's outline.
- **The one deliberate difference.** The original page has nothing below the
  hero, so its wheel drives the track. Here the page continues, so the hero
  is pinned for three screen heights and page scroll is fed to the track
  exactly as the wheel is there (1.15px per pixel).
- **Phones (≤480px) depart from the original**, at the client's request: its
  phone layout left small plates floating in a tall, empty screen. Plates are
  1.3× the original's phone size and packed closer, so one fills the middle
  (the track starts with Pasta Carbonara centred) and its neighbours peek in;
  they hang midway between the header and the dome, measured per screen; the
  dome is 150vw wide instead of 120vw. And no pin: holding a thumb-scrolled
  page reads as stuck, so the hero scrolls away normally and the plates turn
  as it goes (`gsap.matchMedia` swaps the trigger at the breakpoint).

Colours are the app's, not agrumeafarm.it's cream, orange and wine, at the
client's request. The intro sits on `hero-wash` with a zinc-900 counter and
panel, and its fruit use zinc tones plus the wash's blue-200 and violet-200 (as
hex in `fruits.ts`, since those SVGs are built as strings). The hero sits on
`hero-wash`, and the dome, header and call to action are zinc-900. The badge
text is white and the rings zinc-500. The badge reads “Plan the week · cook
what you love · shop once · eat well all week”, with “Plan the week · cook
what you love” centred at rest.

**Below the hero, the dome carries on as one shape.** The back-slider path is
a whole polygon, 1411 × 1473 units, and the hero shows its top 601; PlateHero
draws the rest from the same path at the same scale — a sliver tucked under
the hero's edge, a straight run as tall as the content needs, and the
polygon's own bottom — in a box as wide as the dome's and moved by the same
transform, so both outlines snap to the same pixels and drift and sink
together. It holds the three stats and the opening statement with its call
to action (`children`), in white. Getting the join seamless took three fixes:
the lower part first stood still while the dome drifted up to 14px with the
cursor; then the two were rounded to pixels differently, leaving a one-pixel
step; then the scrollbar bug above left it 7.5px off-centre.

- The plates are 720px square crops generated into `public/images/plates`
  (637 KB for eight). The catalog originals are 2560×1792 and image
  optimisation is off, so using them directly meant downloading 28 MB.
- **Two navbars, one set of buttons.** The hero keeps the original's own
  header, the large mark centred between two buttons (a grid with equal
  sides, so the mark stays on the centre line). Once the hero has scrolled
  away a floating bar drops in: a frosted island of mark, sections and the
  way in, with a pill that glides under the hovered section link and rests on
  the section being read. Both use `NavButtons.tsx`: a frosted pill with an
  icon ("Sign in", or "My recipes" when signed in) and a dark pill whose white
  chip passes its arrow through on hover ("Start planning free", or "Open the
  app"). On a phone the labels shorten to "Sign up" and "Open app". A merged
  single bar was tried and dropped at the client's request — the large
  centred mark is part of the hero.
- The previous FaceIQ hero was kept, not deleted: its headline and call to
  action are the statement on the dome below the hero, and its planner mockup
  is the white section after that.
- **Below the planner, the page is two sections**, at the client's request.
  Three cards each show a slice of the app built in HTML like the planner
  (`FeaturePeeks.tsx`: recipe search, the shopping list, Chef Ferraro), with
  the seeded catalog's content — the list is a real stretch of what the
  planner's week produces. Then the two plans over `hero-wash`. The catalog
  cards, pillars, statement band, prompt set piece, feature grid, three steps
  and closing call to action went: they restated the same four features
  four times, and the page was 14,000px tall on a phone (now 7,500). The Pro
  list now reads "a generated photo for each recipe the bot writes", here and
  in settings — only those recipes get one.
- **On a phone** the planner is shown the way a phone would show it
  (`PhoneWeek` in `WeekMockup.tsx`): a strip of the week with a dot for each
  planned meal, then one day's meals as cards, with an empty slot to tap. Seven
  columns of truncated names couldn't be read at that width. The browser
  frame starts at `md`, where names take two lines until `lg`. The dome's stats
  go one to a line, its words fade at the screen's edges instead of being cut
  there, and the hero header's buttons are 40px tall, a comfortable tap.
- **The logo is the client's chef mark** (`ChefLogo`), inline SVG in
  `currentColor`, so it takes the app's zinc-900. The browser icons are drawn
  from the same paths: `app/icon.svg` (the mark in white on a zinc-900 tile),
  `app/apple-icon.png` and `app/favicon.ico`. The chat avatar
  (`/images/chef-badge.png`) is still the earlier artwork.

Five Playwright specs in `tests/e2e/intro.spec.ts` cover it: the intro covers
then clears and unlocks scrolling, clicks work afterwards, a reload replays it,
client-side navigation back does not, and reduced motion skips it.

## Signing in: stuck on "opening your kitchen", and the fruit way in

**The bug.** In production, signing in after visiting the landing page left
the visitor on the login page under "Signed in — opening your kitchen…". The
landing page links into the app (its footer's "Recipes"), and a production
build prefetches those links. Signed out, the proxy answered the prefetch with
a redirect to `/login`, and the client router kept that answer; after sign-in
`router.push("/recipes")` replayed it and landed on `/login?next=/recipes`, the
same page with its state intact. Straight to `/login` it worked, and the dev
server doesn't prefetch, so the tests never saw it.

Telling prefetches apart in the proxy doesn't work: Next 16 strips
`next-router-prefetch` and the other Flight headers from the request the proxy
sees. `router.refresh()` only clears the current route's cache, and
`revalidatePath` from a Server Action would regenerate every static page on
each sign-in.

**The fix**, which is also what was asked for: sign-in and sign-up hand over to
`FruitTransition` (root layout), which plays the landing intro without its
count — the screen washes over, the fruit drop and fill it, the dark panel
rushes up — and then opens the app with a **full page load**, judged by the
proxy on the new cookie. Browsers keep the last frame, the panel, until the
new page paints; that page starts under an identical panel (a head script
reads a session-storage flag before the first paint, `lib/arrival.ts`), which
is then lifted. Reduced motion skips straight to the page load. The fruit and
their physics are shared with the intro (`fruitPile.ts`), and matter-js is
fetched on the login and register pages ahead of time.

`tests/e2e/guard.spec.ts` now signs in after the landing page; in CI's
production build that is the path that used to hang.

## Documented follow-ups (not implemented)

- **`mushroom-risotto.jpg` still shows the wrong subject** (a mountain, not risotto) and `caesar-salad.jpg` contains hands. Both need regeneration against a valid `GEMINI_API_KEY`: `npm run generate:recipe-images -- mushroom-risotto.jpg caesar-salad.jpg`. The prompt bug that caused this class of failure is already fixed.
- **Generated recipe images still land on local disk.** `lib/nanoBanana.ts` writes with a blocking `fs.writeFileSync` into `public/generated`, which won't persist on serverless targets. The chat response no longer waits for it (it runs in `after()`), but the storage itself needs moving. **How:** object storage (S3/Cloud Storage/Blob), writing the returned URL to the recipe. **Where:** `lib/nanoBanana.ts`.
- **The Bearer token still lives in `localStorage`.** Login now also sets an httpOnly cookie, so the XSS blast radius is smaller, but the client still reads the token from `localStorage` for the `Authorization` header. **How:** have the API routes read the cookie only, and drop the header from every authenticated `fetch`.
- **No `prisma/migrations` history.** The schema is applied with `db push`, so there's no reviewable, reversible record of changes. **How:** baseline with `prisma migrate diff --from-empty --to-schema-datamodel` into an initial migration, then `migrate resolve --applied` — not run here because `migrate dev` against a database with data and no history wants to reset it.
- **Rate limiting is process-local** (`lib/rateLimit.ts`, an in-memory `Map`). It resets on restart and doesn't coordinate across multiple server instances. Fine for this exercise; a shared store (Redis) is needed for real production use.
- **Broader validation adoption.** The hand-rolled validator in `lib/recipeInput.ts` covers the recipe payload; if the team wants schema validation more broadly, `zod` (not currently a dependency) would be a reasonable addition.
