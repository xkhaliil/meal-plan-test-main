# Fix notes

Write-up of what was found, what was fixed, and what's left, per `TEST_INSTRUCTIONS.md`. Fixes were verified against a running instance: curl for API-level checks, a signed-webhook simulation and a real Stripe test-mode subscription for billing, and headless-browser passes (Playwright) for the UI, at desktop, tablet and phone widths.

Contents: security and authorization · core features · Recipe Bot · billing · state, errors and feedback · tests and CI · deployment · design and user experience · the landing page · signing in · documented follow-ups.

## Security and authorization

### Secrets, passwords and sessions

- The hardcoded JWT secret in `lib/auth.ts` is now `process.env.JWT_SECRET`.
- Passwords were stored and compared in plaintext. They are hashed with `bcryptjs` on register and checked with `bcrypt.compare` on login; the seed data matches.
- Login answered a wrong password with a fabricated "password already in use by another user". It now gives a generic invalid-credentials error.
- Register had no validation and no duplicate-email handling (a unique-constraint violation became a 500). It validates and returns a clean 409.
- Logout left the token in `localStorage`, so the session survived "logging out".
- `next.config.ts` had an `env` block that inlined every server secret (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DATABASE_URL`, …) into the client bundle. It is gone; server code reads `process.env` directly.

### Ownership (IDOR)

- `PUT`/`DELETE /api/recipes/[id]` checked no ownership, and `DELETE` no session at all: anyone, signed out, could delete any recipe. Both verify `recipe.userId === session.userId`.
- `GET`/`POST /api/meal-plans/[id]` let any signed-in user read or add to anyone's plan by id. Both verify ownership.
- The recipe detail endpoint no longer exposes the author's email.
- `GET /api/recipes` and `GET /api/recipes/[id]` required no session. Both do now. The catalog stays shared across accounts on purpose — every seeded recipe belongs to alice, so scoping reads would leave bob and charlie with an empty app — while writes stay owner-checked. To make catalogs per-user: add `where: { userId: session.userId }` to both reads and spread ownership in `prisma/seed.ts`.

### The route guard (`proxy.ts`)

- Signed-out visitors could reach the whole app: `/recipes` rendered the catalog, `/meal-plans` and `/chat` sent `Bearer null`, `/settings` sat on its skeleton for ever. `proxy.ts` now redirects them to `/login?next=…` and bounces signed-in users off `/login` and `/register`. (Next 16 renamed `middleware` to `proxy`; the file must export a function named `proxy`.)
- The proxy can't read `localStorage`, so login and register also set an httpOnly `token` cookie (`setAuthCookie`). `POST /api/auth/logout` clears it, as does account deletion.
- The proxy verifies the JWT signature with `jose` (`jsonwebtoken` needs Node built-ins the edge runtime lacks) and deletes a cookie that fails. **The API routes remain the authorization boundary** and verify the token themselves.
- Both ways the session travels — the cookie and the `Authorization` header — are now sent together. Four catalog reads sent no header and only worked through the cookie, which would have half-broken the app once the 7-day cookie expired ahead of the token.

### A debug overlay that logged every token

`ClientChaosShell` wrapped the whole app, on by default. It ran a perpetual animation loop, grew memory to a cap, replaced the cursor, and monkey-patched `window.fetch` to `console.log` every request's headers — so **every bearer token the app sent was printed to the browser console** for every user. It was made opt-in and its logging redacted, and later removed together with `CookingGifPlaster` (originals in commit `ad76ce1`).

### Account management

`PATCH /api/auth/me` changes name, email and password (email and password need the current password). `DELETE` is password-verified and cancels any live Stripe subscription **before** deleting, so a deleted account can't keep billing.

## Core features

- **Adding a recipe to a meal plan ignored the recipe picked** and always attached the oldest recipe in the database. `POST /api/meal-plans/[id]` now uses and validates the submitted `recipeId`, `day` and `mealType`.
- The recipe delete button called the wrong endpoint with the wrong method and no auth header (a silent no-op).
- "+ Save Recipe" was an empty stub; there was also no way to create a meal plan from the UI. Both have forms now.
- The search box was tracked but filtered nothing. It searches title, description and cuisine.
- `PUT /api/recipes/[id]` silently dropped `ingredients`; it now replaces the list in one nested write.
- Meal plans gained `PUT`/`DELETE` (rename, re-date, delete) and `/api/meal-plans/[id]/entries/[entryId]` (move or remove one meal). The entry route checks both that the plan is yours and that the entry belongs to it.
- Every update and delete in the UI goes through `ConfirmDialog`, built on `<dialog>` so the browser owns focus trapping and Escape. Cancelling Pro, the one destructive action that fired on click, now does too, and its copy says what happens: the subscription ends immediately.
- Relations declare `onDelete: Cascade`; the delete handlers still remove dependents explicitly, in a transaction, deepest first.
- `lib/recipeInput.ts` is the one validator for recipe payloads, used by create, update and the Recipe Bot's tool call.
- The catalog endpoint takes `?view=summary` (two counts) and `?view=options` (id/title pairs): settings downloaded every recipe with all its ingredients to show two numbers, and the meal-plan picker did the same to fill a `<select>`.

## Recipe Bot

- **The system prompt held a literal "admin password" and internal cost figures**, and both `GET` and `POST /api/chat` returned the full prompt to any signed-in caller. Removed, and the prompt is no longer returned.
- Recipe creation `JSON.parse`d the raw reply inside an empty `catch {}`, failing silently whenever the model wrapped JSON in prose. It uses a `create_recipe` tool call plus the shared validator.
- The model lost the conversation: history was read oldest-first with `take: 50`, so past fifty messages it never saw anything recent. It takes the newest fifty now. The transcript, persisted all along, is finally shown on return (`GET /api/chat`, with the remaining quota).
- Every upstream call is time-bounded (`lib/withTimeout.ts`: 30s for the completion, 25s for an image), with server-side logging and clean responses that never leak internals.
- **Free vs Pro is enforced server-side**: five messages a day on Free, unlimited on Pro, and a generated photo only for recipes the bot writes for a Pro account. Image generation runs in `after()`, so the reply doesn't wait for it.
- "New conversation" archives rather than deletes: archived messages leave the transcript and the model's context but still count toward the daily limit.
- **Which provider answers** is read from the key: `OPENAI_API_KEY` starting `sk-ant-` routes the OpenAI SDK to Anthropic's compatible endpoint with a Claude model, anything else goes to OpenAI. `CHAT_MODEL` is exported from `lib/openai.ts`, so the model can't drift from the base URL. Verified with a real tool call that saved a recipe.
- Chat replies numbered every list item "1." (a blank line between items closed the list); lists now survive blank lines and keep the model's numbering.

## Billing (Stripe)

Verified against the test-mode account: the Pro price resolves to $29.99/month, and is read live (`GET /api/stripe/price`, cached for an hour) wherever it is shown — `ProPrice` falls back to "Billed monthly through Stripe" rather than ever showing a hardcoded figure.

- Checkout billed `quantity: 3` per subscription.
- Pro never reverted. The webhook records `stripeSubscriptionId` and downgrades when the subscription is deleted or goes unpaid, leaving an active one alone.
- `POST /api/stripe/cancel` didn't exist — the settings page called it, always got a 404, and claimed success anyway. Implemented, and checked against a real subscription.
- Checkout returned Stripe's raw error text to the browser; a Pro subscriber could buy a second subscription (now a 409); every upgrade created a new Stripe customer; the webhook failed silently without `metadata.userId`; and cancelling stranded the account on Pro if Stripe had already forgotten the subscription (`resource_missing` now reconciles locally).
- **`/checkout/success` told everyone "You're on Pro"**, paid or not. It now reads the session back (`GET /api/stripe/session`, refusing other accounts' sessions with a 403), reconciles a late webhook, and has five honest states: checking, on Pro with a receipt, paid but not yet applied, not completed, and couldn't confirm.
- A hardcoded fake secret key and a `console.log` of it were removed from settings, and the billing copy — three different prices — became one plain statement.

## State, errors and feedback

- **Client state lives in zustand stores** (`lib/stores/`): `authStore` owns the session and `authHeaders()`, replacing two dozen scattered `localStorage` reads; `recipeStore` and `mealPlanStore` own their lists and mutations, so an edit on a detail page shows up in its list without a refetch. Nothing reads the session during the first render — `AuthHydrator` fills the store after mount — so server and client HTML agree.
- **Failure is a value, not an exception.** `lib/apiClient.ts`'s `requestJson` never throws; it returns the body or a readable message (the API's own, or one derived from the status by `lib/apiMessage.ts`). Both stores and every page fetch use it.
- **Toasts** (`lib/stores/toastStore.ts`, `app/components/Toaster.tsx`) cover actions with no error slot of their own: list loads that silently came up empty, a settings skeleton that stayed for ever, a chat reset that did nothing. Forms keep their inline errors, so nothing is reported twice.
- **Sign in and register said nothing on failure.** `fetch` had no `try`/`catch`, so a network error left the button on "Signing in…" for ever; and on success the button snapped back before the redirect began. Both forms now run `idle → sending → signedIn/created`, stay disabled through the redirect, and show "Signed in — opening your kitchen…". The email is trimmed (a pasted trailing space failed the exact lookup).
- **Rate limiting is database-backed** (`RateLimitHit`), so it survives restarts and is shared between instances, and fails open if the database is unreachable.

## Tests and CI

| Layer       | Where                                | Covers                                                                      | Tests |
| ----------- | ------------------------------------ | --------------------------------------------------------------------------- | ----- |
| Unit        | `lib/__tests__`, `app/api/__tests__` | Pure functions and route decisions, with Prisma and Stripe mocked           | 80    |
| Component   | `tests/component`                    | jsdom + Testing Library: dialog, pagination, rich text, toasts, auth fields | 30    |
| Integration | `tests/integration`                  | Real handlers and Prisma against a throwaway Postgres schema                | 15    |
| End-to-end  | `tests/e2e`                          | Chromium via Playwright, signed out and signed in                           | 19    |

`npm test` runs the first three (integration only when a Postgres is configured — it creates and drops a schema, so it never falls back to a hosted database); `npm run test:e2e` the last.

CI (`.github/workflows/ci.yml`) runs formatting, lint, typecheck, the tests (integration against a `postgres:16` service) and the build; then a second job seeds a database and runs Playwright against a production build. Prettier owns formatting, and a pre-commit hook runs it and ESLint on staged files.

Worth knowing: jsdom has no `<dialog>` modal methods (the component setup polyfills them); E2E signs in as **bob**; and the settings-price test skips itself, with the reason, when bob is on Pro — which he is, because local development and the deployed site share a database.

## Deployment (Vercel + Neon)

- **SQLite → Postgres.** SQLite can't run on Vercel (read-only, ephemeral filesystem). The models needed no changes; the integration setup creates a schema per run instead of a file.
- **Image optimization is off** (`images.unoptimized: true`), so every image is served as authored and nothing is billed per transformation. Images were sized for that by hand (see below).
- `npm run build` is `prisma generate && next build`, since Vercel can restore a cached `node_modules` without running `postinstall`. `engines.node` is pinned to `>=20.9`.
- `lib/nanoBanana.ts` checks it can write before paying for an image: on a read-only host it now fails up front instead of after a 25-second generation.
- **Neon**: `vercel install neon` provisioned the database and injected `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`. `prisma db push` and `prisma db seed` filled it (3 users, 20 recipes, 2 meal plans). The env files are read by different tools, which cost some confusion:

| File         | Read by                       | Holds                           |
| ------------ | ----------------------------- | ------------------------------- |
| `.env.local` | Next.js (takes precedence)    | What `vercel env pull` wrote    |
| `.env`       | The Prisma CLI, and only this | Everything; the direct database |

## Design and user experience

### The design system

One system across the app, defined in `app/globals.css`: Playfair Display for headlines and Manrope for everything else (loaded through `next/font`), Tailwind's zinc scale plus a soft blue-lavender wash (`hero-wash`), pill buttons (`btn btn-primary|secondary|ghost|danger`), 24px-radius hairline cards (`card`), and `input`, `label`, `tag`, `eyebrow` and `glass`. Emerald and red appear only for success and error states.

One cascade bug found on the way: the `body` and heading defaults were unlayered, and an unlayered rule beats every layered utility regardless of specificity, so `font-sans` on a card title and `text-white` on a dark-band heading silently lost. They live in `@layer base`.

The app's navbar is a frosted pill, sticky so the chat's full-height column still fits; on a phone its links take a second row inside the pill. Signed-in pages share serif mastheads, hairline cards and frosted filter bars; sign-in, register and checkout pages share `AuthShell`, a centred column on the wash.

### Motion

`lib/motion.ts` registers GSAP with ScrollTrigger, SplitText and CustomEase, and defines the shared easings and a 70ms stagger. `RevealText` reveals headlines line by line out of a mask, `Reveal` staggers entrances as they scroll in, `PageTransition` cross-fades route changes, and Lenis smooths scrolling. Under `prefers-reduced-motion` nothing animates and everything starts in its final state; without JavaScript a `noscript` style shows whatever would have been revealed.

### Accessibility

A visible `:focus-visible` ring everywhere (only inputs had one), a skip link to `#main` (and a `<main id="main">` on the auth pages, where it pointed at nothing), and `AuthField`, the shared input: label pairing through `useId`, `aria-describedby` for hints, `aria-invalid` for a failed rule, and a show-password toggle. Hidden navigation is `inert` and `aria-hidden`; purely illustrative mockups are hidden from assistive tech, and the copy around them says what they show.

### Images

- Three seed photos had the generation prompt drawn into the frame ("No text, No watermark…"), because `scripts/generate-seed-recipe-images.ts` listed negations and the model drew them. The prompt uses positive phrasing now, and the three files were cropped to the dish (and from ~2MB to ~250KB each).
- With optimization off, the 2560px catalog originals would have cost 28MB on the landing page. The hero's plates are 720px crops (637KB for eight), and six of them are now the client's own transparent cut-outs as WebP — 55–78KB each, down from ~550KB PNGs.

### Fixed along the way

The catalog's cuisine chips were clipped on the left (a centred flex row that overflows can't scroll back to its start); meal-plan slots broke titles mid-word in the seven-column grid; and an E2E test built a regex from a recipe title, which broke on "Tunisian Couscous (Couscous Tunisien)".

## The landing page

The page is short on purpose: the intro and hero, the planner, three feature cards, the plans, and a footer. It replaced a page that restated the same four features four times and ran to 14,000px on a phone; it is now about 5,300px there.

### The intro

`app/components/landing/FruitIntro.tsx`: a serif percentage counts to 100 over about 1.7s while flat fruit drop from above under real physics and pile up until they bury the screen; a dark panel then rushes up (0.55s), covers everything, and lifts off the top (0.7s) as the hero comes in underneath.

- **Physics is matter-js**, a rigid-body simulation (`fruitPile.ts`, shared with the sign-in transition): eleven flat fruit illustrations in the palette, each dropped twice, sized by breakpoint, each body the convex hull of its outline. The library is an 83KB chunk loaded on demand; if it takes over 1.5s the intro runs without the fruit rather than waiting.
- Plays once per full page load, never under reduced motion, and is hidden without JavaScript. It holds the page still only while it plays.
- **Two bugs worth recording.** The panel is parked with `top: 100%`, not a transform: Tailwind v4's `translate-y-full` (the separate `translate` property) and an inline `translateY(100%)` both stacked with GSAP's own transform, leaving every panel position a screen too low. And the scroll lock hides the page's scrollbar: the hero's pin was measured without it, so once it came back the hero stood 15px wider than the page and its dome 7.5px off-centre. Releasing the lock now calls `ScrollTrigger.refresh()` while the panel still covers the screen. (Playwright hides scrollbars by default; seeing this needs `--hide-scrollbars` removed from its arguments.)

### The hero

`app/components/landing/PlateHero.tsx`: dishes from the seeded catalog ride an endless track tilted 10° across a dark dome.

- **The track.** Plates spread out from the centre and grow, brighten and sharpen toward it (scaled 0.55–1.35, blurred up to 4px away from it); each sways and has springs for turn, lean, lift and a pull toward the cursor, plus cursor parallax. Speed adds lean, squash and blur. It can be dragged, with a fling on release, and a drag never follows a plate's link. Each plate's ring of text — dish, real prep-plus-cook time, cuisine — turns once on the way in and once per hover, after the track settles.
- **The plates.** Six are the client's transparent cut-outs, floating on their own shadow, each scaled so its smallest enclosing circle sits inside its ring of text; Grilled Salmon and Tom Yum Soup are still round photos in a white rim until theirs are drawn.
- **Scrolling.** On wider screens the hero is pinned for three screen heights and the page's scroll drives the track. On a phone (≤480px) it isn't: holding a thumb-scrolled page reads as stuck, so the hero scrolls away normally and the plates turn as it goes. Phones also get one large plate across the middle with its neighbours peeking in, placed midway between the header and the dome for each screen's height, and a wider dome.
- **The dome's words** run on an arc in the free band under the plates: as round as the hero's height allows (1.1× the dome's width, flattening to 8×), fading out above the hero's edge — and at the screen's edges on a phone — instead of being cut. They slide along the arc as the track moves.
- **Performance.** The rings were SVG `textPath`, and scrolling ran at about 18fps: Chrome lays SVG text out again whenever a transform above it changes, which here was every plate, every frame. Painted once into canvases and only rotated by the compositor, it runs at 119fps (the display's 120Hz). The arc is redrawn on the frames it moves by stamping letters from a pre-rendered sheet; drawing rotated text afresh cost a fifth of the frame rate.
- **Breakpoints** are inclusive (480 is a phone, 1024 a tablet), written `max-[481px]`/`max-[1025px]`, since Tailwind's `max-*` excludes the width itself.

### Below the hero

- **The dome carries on as one shape.** Its path is a whole polygon (1411 × 1473 units) of which the hero shows the top 601; the rest is drawn below the hero from the same path, in a box as wide as the dome's and moved by the same transform, so the outlines meet exactly. It holds the stats and the opening statement, in white. Getting the join seamless took three fixes: the lower part stood still while the dome drifted with the cursor; the two were rounded to pixels differently; and the scrollbar bug above.
- **The planner** is shown as the device would show it: in a browser frame on wider screens (names wrap to two lines between tablet and desktop widths), and on a phone as a day view under a strip of the week, with an empty slot inviting a tap.
- **Three feature cards** each show a slice of the app built in HTML — recipe search, the shopping list, Chef Ferraro — with real content: the list is a stretch of what the planner's week actually produces (94 items from 17 meals).
- **The plans**, over the wash. The Pro list reads "a generated photo for each recipe the bot writes" here and in settings, because only those recipes get one.

### Navigation and brand

- **Two navbars, one set of buttons.** The hero's header puts the large chef mark between two buttons, on a grid with equal sides so the mark stays centred whatever they say. Once the hero has scrolled away, a frosted bar drops in, with a pill that glides under the hovered section link and rests on the section being read. Both use `NavButtons.tsx`: a frosted pill with an icon ("Sign in", or "My recipes") and a dark pill whose white chip passes its arrow through on hover ("Start planning free", or "Open the app"), shortened to "Sign up" and "Open app" on a phone, and 40px tall there.
- **The logo is the client's chef mark** (`ChefLogo`), inline SVG in `currentColor`. The app icon, Apple touch icon and favicon are drawn from the same paths.

## Signing in: stuck on "opening your kitchen"

**The bug.** In production, signing in after visiting the landing page left the visitor on the login page under "Signed in — opening your kitchen…". The landing page links into the app, and a production build prefetches those links; signed out, the proxy answered the prefetch with a redirect to `/login`, and the client router kept that answer. After sign-in, `router.push("/recipes")` replayed it and landed on `/login?next=/recipes`. Straight to `/login` it worked, and the dev server doesn't prefetch, so no test saw it.

The proxy can't tell prefetches apart — Next 16 strips `next-router-prefetch` and the other Flight headers from the request it sees — `router.refresh()` only clears the current route, and `revalidatePath` from a Server Action would regenerate every static page on each sign-in.

**The fix.** Sign-in and sign-up hand over to `FruitTransition` (in the root layout): the screen washes over, the fruit drop and fill it, the dark panel rushes up, and the app opens with a **full page load**, which the proxy judges on the new cookie. Browsers keep the last frame — the panel — until the new page paints, and that page starts under an identical panel (a `<head>` script reads a session-storage flag before the first paint, `lib/arrival.ts`), which then lifts. Reduced motion goes straight to the page load. `tests/e2e/guard.spec.ts` signs in after the landing page; in CI's production build that is the path that used to hang.

## Documented follow-ups (not implemented)

- **`mushroom-risotto.jpg` shows a mountain, and `caesar-salad.jpg` contains hands.** Both need regenerating against a valid `GEMINI_API_KEY`: `npm run generate:recipe-images -- mushroom-risotto.jpg caesar-salad.jpg`.
- **Generated recipe images land on local disk** (`lib/nanoBanana.ts`, `public/generated`), which doesn't persist on serverless hosts. They belong in object storage, with the URL saved on the recipe.
- **The bearer token still lives in `localStorage`.** The httpOnly cookie narrows the XSS exposure; having the API routes read only the cookie would close it.
- **No `prisma/migrations` history** — the schema is applied with `db push`. Baseline with `prisma migrate diff --from-empty --to-schema-datamodel`, then `migrate resolve --applied`. Relatedly, Prisma warns that `package.json#prisma` is deprecated in favour of `prisma.config.ts`.
- **Rate limiting counts, then inserts**, which isn't atomic: two simultaneous requests can both pass at the limit. Redis `INCR` with a TTL would be.
- **Integration tests don't run locally against Neon**, by design; point `TEST_DATABASE_URL` at a Neon branch or a local Postgres to run them. The old `prisma/dev.db` was not migrated (it holds earlier test data only).
- **Artwork still to come:** cut-outs for Grilled Salmon and Tom Yum Soup; touch-ups to the avocado toast and Greek salad cut-outs; and the chat avatar (`/images/chef-badge.png`), which predates the new chef mark.
- **CI's Node.** `actions/checkout@v4` and `actions/setup-node@v4` run on the deprecated Node 20 runtime, and the workflow tests the app on Node 20, past its end of life. Moving to the v5 actions and Node 22 is a one-file change.
- **Two lint warnings**: unused `StatusPill` and `QuotaMeter` helpers in the chat page.
- **Housekeeping.** The Neon install left `.agents/skills/`, `.claude/skills/neon*` and `skills-lock.json` (agent documentation, untracked; nothing in the build reads them) — commit or delete. If schema validation is wanted beyond the recipe payload, `zod` would be a reasonable addition.
