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

### Environment Variables

Create a `.env` file in the project root with the variables below (a populated `.env` may be provided for local setup).

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite database file path |
| `OPENAI_API_KEY` | OpenAI API key for Recipe Bot |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (test mode) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public Stripe key for frontend |

**Product goals and seeded test accounts** are in [TEST_INSTRUCTIONS.md](./TEST_INSTRUCTIONS.md).

## Architecture

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
