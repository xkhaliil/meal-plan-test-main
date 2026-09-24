# MealPlan Pro

An AI-powered meal planning application built with Next.js, Prisma, OpenAI, and Stripe.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Database:** SQLite via Prisma ORM
- **AI:** OpenAI API (GPT-4o-mini) for Recipe Bot
- **Image Generation:** Nano Banana Pro (recipe image generation)
- **Payments:** Stripe (test mode)
- **Auth:** Custom JWT authentication
- **Styling:** Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20.9+
- npm

### Setup

```bash
# Install dependencies
npm install

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

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request into `main`, and on `main`
itself: format check → lint → typecheck → tests → build, in that order, so a
failure points at the cheapest thing that broke. It installs with `npm ci` and
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
| `OPENAI_API_KEY`                               | OpenAI API key for Recipe Bot                                                           |
| `STRIPE_SECRET_KEY`                            | Stripe secret key (test mode)                                                           |
| `STRIPE_PUBLISHABLE_KEY`                       | Stripe publishable key (test mode)                                                      |
| `STRIPE_WEBHOOK_SECRET`                        | Stripe webhook signing secret                                                           |
| `JWT_SECRET`                                   | Secret for signing JWT tokens                                                           |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`           | Public Stripe key for frontend                                                          |
| `GEMINI_API_KEY`                               | Google Imagen key, for generated recipe photos (Pro accounts)                           |
| `STRIPE_PRICE_ID` _or_ `STRIPE_PRO_PRODUCT_ID` | The Pro price. Either a recurring price (`price_…`), or the product to look one up from |

**Product goals and seeded test accounts** are in [TEST_INSTRUCTIONS.md](./TEST_INSTRUCTIONS.md).

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
