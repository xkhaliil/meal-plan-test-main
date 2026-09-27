# MealPlan Pro

An AI-powered meal planning application built with Next.js, Prisma, OpenAI, and Stripe.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **AI:** Recipe Bot via the OpenAI SDK — OpenAI (`gpt-4o-mini`) or
  Anthropic (`claude-haiku-4-5`), chosen by the key in `OPENAI_API_KEY`
- **Image Generation:** Nano Banana Pro (recipe image generation)
- **Payments:** Stripe (test mode)
- **Auth:** Custom JWT authentication
- **Styling:** Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20.9+
- npm
- **A PostgreSQL database.** Anything reachable works: a local server, a
  container (`docker run -d -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mealplan -p 5432:5432 postgres:16`),
  or a free hosted branch (Neon, Supabase). Put its URL in `DATABASE_URL`.
  The app was on SQLite until it moved to Vercel, which cannot host a database
  file — see "Deploying to Vercel".

### Setup

```bash
# Install dependencies
npm install

# Copy the env template and fill in DATABASE_URL (plus the keys you need)
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Push database schema and create tables
npx prisma db push

# Seed the database with sample data
npx prisma db seed

# Start development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Other scripts

| Command                | What it does                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `npm test`             | Runs the vitest suite once (`lib/__tests__`, `app/api/__tests__`) |
| `npm run test:watch`   | Same suite in watch mode                                          |
| `npm run lint`         | ESLint over the project                                           |
| `npm run build`        | Production build — run this before claiming a change is done      |
| `npm run typecheck`    | `tsc --noEmit`                                                    |
| `npm run format`       | Rewrites files with Prettier                                      |
| `npm run format:check` | Fails if anything is unformatted (what CI runs)                   |

### Formatting

Prettier owns formatting; `eslint-config-prettier` switches off every ESLint
rule that would argue with it, so the two never disagree.

- **In the editor:** `.vscode/settings.json` sets Prettier as the default
  formatter with format-on-save, and `.vscode/extensions.json` recommends the
  extensions to install. Nothing to configure by hand.
- **On commit:** a husky `pre-commit` hook runs `lint-staged`, which formats and
  ESLint-fixes only the staged files. Bypass it with `git commit --no-verify`
  when you need to; CI still checks.
- **In CI:** `npm run format:check` fails the build on anything unformatted.

`endOfLine` is `"auto"` because Windows checkouts get CRLF and CI runs on Linux;
without it, line endings alone would fail the check on one platform or the other.

### Testing

Four layers, each answering a different question:

| Layer           | Where                                | Command                    | What it covers                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | `lib/__tests__`, `app/api/__tests__` | `npm run test:unit`        | Single functions in isolation — the ingredient scaler's fraction maths, the recipe validator, the rate limiter's decisions. Prisma is mocked.                                                                                                     |
| **Integration** | `tests/integration`                  | `npm run test:integration` | Real route handlers + real validator + real Prisma against a throwaway Postgres schema, created fresh by `globalSetup` and dropped after. Proves rows actually land, ingredients are replaced rather than orphaned, and a second user gets a 403. |
| **Component**   | `tests/component`                    | `npm run test:component`   | UI pieces in jsdom with Testing Library — the confirm dialog only confirms when asked, pagination windows correctly, and `RichText` renders model output as text rather than markup.                                                              |
| **E2E**         | `tests/e2e`                          | `npm run test:e2e`         | A real browser against a real server: the landing page, the proxy redirecting signed-out visitors, signing in, searching the catalog, signing out.                                                                                                |

`npm test` runs the first three (they're fast and need no browser); `npm run
test:all` adds the E2E suite. `npm run test:e2e:ui` opens Playwright's
interactive runner.

Two things worth knowing:

- **The integration project needs a Postgres it can create a schema in.** Set
  `TEST_DATABASE_URL`, or point `DATABASE_URL` at a _local_ Postgres and it will
  use that (it refuses to do this against a remote host — the tests create and
  drop a schema). Without one the project is left out of the run and vitest says
  so, rather than failing; CI always sets the variable, so nothing there goes
  unchecked.
- **E2E runs against the development database** and the seeded accounts, so the
  specs are deliberately read-only. Anything that creates or deletes data
  belongs in the integration project, which gets its own disposable database.
- They sign in as **bob@example.com**, not alice — alice is the Pro account, but
  her seeded password no longer matches `TEST_INSTRUCTIONS.md`. Re-run
  `npx prisma db seed` to restore it (that wipes all data first).
- **The live-price test skips itself when Stripe isn't configured.** It asks
  `/api/stripe/price` first: with a real `STRIPE_PRICE_ID` (or
  `STRIPE_PRO_PRODUCT_ID`) it asserts the figure reaches the settings page;
  with CI's placeholder keys the endpoint answers `amount: null`, the UI falls
  back to "billed monthly", and the test reports skipped rather than failing.
  Add `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` as repository secrets to have
  CI run it for real.

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request into `main`, and on `main`
itself. The `verify` job goes format check → lint → typecheck → unit,
integration and component tests → build, in that order, so a failure points at
the cheapest thing that broke. A second `e2e` job then seeds a database,
installs Chromium and runs Playwright against a production build, uploading the
HTML report as an artefact. It `needs: verify`, so the browser download only
happens once the quick checks are green. It installs with `npm ci` and
generates the Prisma client first. The API keys in the workflow are
placeholders — several modules read them at import time, and the suite mocks
Prisma rather than opening a database.

To make it block merges, enable branch protection on `main`
(**Settings → Branches → Add rule**) and require the
**"Format, lint, types, tests, build"** status check.

> Note: `npx prisma generate` fails with `EPERM` on Windows while `npm run dev`
> is running, because the dev server holds the Prisma query engine open. Stop
> the dev server first.

### Environment Variables

Create a `.env` file in the project root with the variables below (a populated `.env` may be provided for local setup).

| Variable                                       | Description                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                 | SQLite database file path                                                               |
| `OPENAI_API_KEY`                               | Recipe Bot model key. An OpenAI key (`sk-proj-…`) or an Anthropic one (`sk-ant-…`)      |
| `STRIPE_SECRET_KEY`                            | Stripe secret key (test mode)                                                           |
| `STRIPE_PUBLISHABLE_KEY`                       | Stripe publishable key (test mode)                                                      |
| `STRIPE_WEBHOOK_SECRET`                        | Stripe webhook signing secret                                                           |
| `JWT_SECRET`                                   | Secret for signing JWT tokens                                                           |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`           | Public Stripe key for frontend                                                          |
| `GEMINI_API_KEY`                               | Google Imagen key, for generated recipe photos (Pro accounts)                           |
| `STRIPE_PRICE_ID` _or_ `STRIPE_PRO_PRODUCT_ID` | The Pro price. Either a recurring price (`price_…`), or the product to look one up from |

**Product goals and seeded test accounts** are in [TEST_INSTRUCTIONS.md](./TEST_INSTRUCTIONS.md).

## Deploying to Vercel

The repo is Vercel-ready except for one thing that no amount of configuration
fixes — read the database note first.

### 1. Provision the database

The schema is already Postgres (`prisma/schema.prisma`) — it was SQLite until
this move, which Vercel cannot host at all: the deployment is read-only and the
instance is discarded between invocations, so a database file is both
unwritable and pointless.

Create a database (Vercel Postgres, Neon, Supabase — any Postgres), set
`DATABASE_URL` in the Vercel project, and push the schema and seed data from
your machine with that URL:

```bash
DATABASE_URL="<your production url>" npx prisma db push
DATABASE_URL="<your production url>" npx prisma db seed   # optional demo data
```

Use the **pooled** connection string in `DATABASE_URL` (Neon's `-pooler` host,
Supabase's port 6543, or PgBouncer). Every serverless invocation opens its own
client, and a direct connection runs a small Postgres out of slots quickly.

### 2. Environment variables

Set every variable from the table above in **Project → Settings → Environment
Variables**, for Production and Preview. `.env` is gitignored and is not
uploaded, so nothing is inherited from your machine.

Two need different values than local:

| Variable                | In production                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `JWT_SECRET`            | A fresh random string. Anyone holding it can mint sessions.                                   |
| `STRIPE_WEBHOOK_SECRET` | The signing secret of the deployed endpoint (next step) — not the one `stripe listen` prints. |

### 3. Stripe webhook

Checkout only upgrades an account when the webhook arrives, so register the
endpoint once the domain exists: **Stripe Dashboard → Developers → Webhooks →
Add endpoint**, `https://<your-domain>/api/stripe/webhook`, subscribed to
`checkout.session.completed`, `customer.subscription.updated` and
`customer.subscription.deleted`. Copy its signing secret into
`STRIPE_WEBHOOK_SECRET` and redeploy.

(`/checkout/success` reconciles a paid session by itself if the webhook is slow
or missing, but only for the person who just paid — cancellations still need
the webhook.)

### 4. Build

Vercel detects Next.js and needs no overrides. `npm run build` is
`prisma generate && next build`: the generate step is explicit because Vercel
can restore a cached `node_modules` without re-running `postinstall`, which
leaves a stale Prisma client.

### 5. Known limits of a deployed instance

- **Generated recipe photos don't persist.** `lib/nanoBanana.ts` writes into
  `public/generated`, which is read-only in production; the code now detects
  that and keeps the placeholder instead of paying for an image it can't save.
  Object storage is the fix (see `NOTES.md`).
- **Rate limiting** is database-backed, so it works across instances.
- **Image optimization is off** (`images.unoptimized` in `next.config.ts`), so
  no image transformations are billed and files are served exactly as authored.

## Architecture

### Authentication

Two things carry the session, and both matter:

- **`Authorization: Bearer <token>`** from `localStorage`, attached by the client
  to API calls. The API routes verify this with `getUserFromRequest`, and they
  are the authorization boundary — every handler checks ownership itself.
- **An httpOnly `token` cookie**, set by `/api/auth/login` and `/api/auth/register`.
  `proxy.ts` reads it to guard the signed-in routes before a page renders;
  `localStorage` is invisible there. Clearing a session needs
  `POST /api/auth/logout`, since the client can't delete an httpOnly cookie.

`proxy.ts` is Next 16's replacement for `middleware.ts` — same idea, different
filename, and the exported function must be named `proxy`. It verifies the JWT
with `jose` (`jsonwebtoken` needs Node built-ins the edge runtime lacks) and
redirects signed-out visitors to `/login?next=…`.

### Plan limits

Enforced server-side in `app/api/chat/route.ts`: free accounts get 5 Recipe Bot
messages a day, and generated photos are Pro-only. If you change the plan copy
on the landing page or in settings, keep it matched to what the code enforces.

### Route Structure

```
app/
├── page.tsx                     # Root redirect
├── login/page.tsx               # Login form
├── register/page.tsx            # Registration form
├── (app)/                       # Authenticated shell
│   ├── layout.tsx               # Shared layout with Navbar
│   ├── recipes/page.tsx         # Recipe catalog
│   ├── recipes/[id]/page.tsx    # Recipe detail
│   ├── chat/page.tsx            # Recipe Bot conversation
│   ├── meal-plans/page.tsx      # Meal plan list
│   ├── meal-plans/[id]/page.tsx # Meal plan detail + weekly grid
│   └── settings/page.tsx        # Account, subscription, upgrade
├── checkout/
│   ├── success/page.tsx         # Stripe success return
│   └── cancel/page.tsx          # Stripe cancel return
└── api/
    ├── auth/{login,register,me} # Authentication endpoints
    ├── recipes/                 # Recipe CRUD
    ├── chat/                    # Recipe Bot AI endpoint
    ├── meal-plans/              # Meal plan management
    └── stripe/{checkout,webhook}# Stripe integration
```

### Database Schema

- **User** — email, password, name, plan (free/pro), Stripe customer ID
- **Recipe** — title, description, image, times, servings, nutrition, dietary tags
- **Ingredient** — name, amount, unit (belongs to Recipe)
- **MealPlan** — name, date range (belongs to User)
- **MealPlanRecipe** — day, meal type (joins MealPlan ↔ Recipe)
- **ChatMessage** — role, content (belongs to User)

### Stripe Integration

The app uses Stripe Checkout in test mode for upgrading from Free to Pro:

1. User clicks "Upgrade to Pro" on the settings page
2. Server creates a Stripe Checkout Session with the Pro price
3. User is redirected to Stripe's hosted checkout page
4. On success, webhook updates the user's plan to "pro"

Create test products in your Stripe dashboard and set the `STRIPE_PRICE_ID` environment variable.
