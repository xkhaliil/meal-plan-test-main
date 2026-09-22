# Test instructions — product expectations

Use this document as the **behavioral baseline** for MealPlan Pro: what the product is meant to offer at a high level. How you explore the app, validate behavior, prioritize work, and improve the experience is up to you.

## Interview schedule (three parts)

1. **Phase 1 — Live session (~1 hour)**  
   You work with the interviewer on the repo in real time (cleanup, triage, fixes). Details and prompts are given at the start of the call.

2. **Phase 2 — Async work (~3–4 hours, within roughly 1–2 days)**  
   Continue improving and optimizing the app on your own. No extra feature brief is provided here—use your judgment and the product baseline below. **Spend on the order of ~3 hours actually fixing things** and push as far as you reasonably can. If you **cannot** address everything in that time, that is fine: add a **short write-up** (for example `NOTES.md`, a PR description section, or a doc linked in the PR) that lists **each issue you identified**, **what you would change**, and **how you would fix it** (file or area, approach). Documenting remaining work clearly **counts as a valid outcome** alongside whatever code you did ship.

3. **Phase 3 — Follow-up (~1 hour)**  
   You’ll answer **roughly 25–30 questions** spanning architecture, security, data flow, React/TypeScript, and related topics. You’ll also **walk through** what you changed, what you didn’t, and why.

---

## What you’re working on

MealPlan Pro is an AI-assisted meal planning app. Users maintain a **recipe catalog**, use a **Recipe Bot** chat to add ideas, and build **weekly meal plans** from recipes they already have.

## Core product areas

### Recipe catalog

- The app should expose a **catalog of recipes** (seed data provides a starting library).
- Recipes are owned per user where the data model implies it; the overall UX should make browsing and opening recipes straightforward.

### Recipe Bot (chat)

- The assistant should help users **create new recipes from natural language** (for example, dinner ideas or dietary preferences).
- The backend is designed around the model returning **structured data** (JSON-shaped recipe payloads) that the server **parses** and turns into persisted recipes (title, ingredients, timing, tags, and related fields as modeled in Prisma).
- The pipeline may use **tools or follow-up steps** so new recipes can get **images** where that integration exists in the codebase.
- Treat reliability, validation, security, and performance of this path as part of your review—not only “does it sometimes work.”

### Meal plans

- Users should be able to get a **meal plan for a week** (or the app’s equivalent date range) using **recipes from their catalog**.
- Creating, viewing, and editing plans should feel coherent with the rest of the app.

### Authentication

- There is a **login** (and registration if present). Auth should behave predictably for signed-in vs signed-out users.

### Landing & positioning

- There is a **landing page**. It should **clearly communicate the value proposition** of MealPlan Pro to a new visitor (what problem it solves, why sign up). Polish and messaging quality count.

### Subscription

- The commercial model is simple: **one paid tier — Pro**. Free vs Pro should be understandable in the UI (for example, settings or upgrade entry points).
- **Stripe (test mode)** is used for upgrading. You’ll need test keys and, for end-to-end checkout, appropriate Stripe dashboard setup as described in the main README. This is already set up for you.

## Test accounts (after `npx prisma db seed`)

The seed script created **three users** so you can exercise **Free** and **Pro** behavior:

| Email               | Password    | Plan |
| ------------------- | ----------- | ---- |
| alice@example.com   | password123 | Pro  |
| bob@example.com     | bob2024     | Free |
| charlie@example.com | letmein     | Free |

## Scope of your work

- **Explore the codebase**, run the app, and align implementation with this baseline where it makes sense.
- Improvements are **not limited to bugfixes**: better UX/ui, clearer errors, safer handling of AI and payments, performance, (accessibility), and tests are all in scope where they strengthen the product.
- Use your judgment on **what to fix first** and what to document as follow-ups. For async work specifically: **fix what you can in ~3 hours**; for anything left, a **written plan** (issue + how you’d fix it) is **acceptable** and expected when you run out of time.

### `AGENTS.md` and `CLAUDE.md`

The repo includes root-level **[AGENTS.md](./AGENTS.md)** and **[CLAUDE.md](./CLAUDE.md)** for editor and AI-assistant tooling (for example, Cursor or Claude Code). You may **update them appropriately** as you work—e.g. note new conventions, commands, or stack-specific guidance you rely on. Product expectations for this exercise remain defined here and in the README, not in those files.

For setup, environment variables, and stack details, see [README.md](./README.md).
