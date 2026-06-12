# Masrufe — Expense Tracker

A personal expense tracker for Lebanon with dual **LBP/USD** currency, monthly +
yearly reports, charts, **editable categories**, and optional **add-by-WhatsApp**.

Multi-user: everyone who signs in gets their own private data, isolated by
Supabase Row Level Security. Sign-in is passwordless **magic link** or **Google**.
Amounts are stored in LBP and shown in both currencies using an editable, per-user
conversion rate (default `89,500 LBP = $1`).

## Setup

Full step-by-step instructions live in **[`docs/`](docs/README.md)**. The short
version:

1. **Supabase** — create a project, run [`supabase-schema.sql`](supabase-schema.sql).
   → [docs/01](docs/01-supabase-setup.md)
2. **Auth** — enable Google, set redirect URLs. → [docs/02](docs/02-authentication.md)
3. **Config** — put `SUPABASE_URL` + `SUPABASE_ANON_KEY` in the `CONFIG` block of
   both `index.html` and `app.html`. → [docs/03](docs/03-configuration.md)
4. **Deploy** — `vercel`, then set env vars. → [docs/04](docs/04-deployment.md)
5. **WhatsApp** (optional) — wire the Meta webhook. → [docs/05](docs/05-whatsapp.md)

## Structure

```
.
├── index.html            ← marketing landing + auth (served at /)
├── app.html              ← the tracker, gated behind sign-in (served at /app)
├── api/whatsapp.js       ← Vercel serverless function (WhatsApp webhook)
├── supabase-schema.sql   ← run once in the Supabase SQL editor
├── vercel.json           ← function runtime + /app rewrite
└── docs/                 ← setup & usage guides
```

## Features

- **Landing page** — hero, feature grid, how-it-works, WhatsApp demo, auth modal.
- **Auth** — magic link + Google, session-gated app, sign-out, per-user data.
- **Monthly view** — month selector, income/expenses/savings, expense table,
  per-category doughnut, add-expense modal (LBP/USD toggle), inline rate + income
  editing, delete.
- **Reports view** — year selector, per-month table with expandable breakdowns,
  expenses bar chart with income line overlay.
- **Editable categories** — add/rename/recolour/delete from Settings; renames
  cascade to past expenses. → [docs/06](docs/06-categories.md)
- **WhatsApp** — per-user routing via a one-time link code; messages parse,
  convert and log to the right account. → [docs/05](docs/05-whatsapp.md)
- Light/dark mode, Nexus design system, responsive.
