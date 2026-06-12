# Masrufe — Documentation

Everything you need to set up, configure, and run Masrufe. Work through the
guides in order the first time.

| # | Guide | What it covers |
|---|-------|----------------|
| 1 | [Supabase setup](01-supabase-setup.md) | Create the project, run the schema, grab your keys |
| 2 | [Authentication](02-authentication.md) | Enable magic-link + Google, set redirect URLs |
| 3 | [Configuration](03-configuration.md) | Wire the keys into the frontend and `.env` |
| 4 | [Deployment](04-deployment.md) | Ship to Vercel |
| 5 | [WhatsApp setup](05-whatsapp.md) | Meta webhook + the per-user linking flow |
| 6 | [Categories](06-categories.md) | How editable categories work |

## Quick start

```
1. Create a Supabase project and run supabase-schema.sql          → guide 1
2. Enable Google + set redirect URLs in Supabase Auth             → guide 2
3. Put SUPABASE_URL + SUPABASE_ANON_KEY in index.html & app.html  → guide 3
4. `vercel` deploy and set env vars                               → guide 4
5. (Optional) Wire up the WhatsApp webhook                        → guide 5
```

## How the app is structured

| Path | Role |
|------|------|
| `index.html` | Marketing landing page + auth (served at `/`) |
| `app.html` | The tracker, gated behind sign-in (served at `/app`) |
| `api/whatsapp.js` | Vercel serverless function — WhatsApp webhook |
| `supabase-schema.sql` | Database tables + Row Level Security |
| `vercel.json` | Function runtime + `/app` rewrite |

Visitors land on `index.html`, sign in (magic link or Google), and are sent to
`/app`. The app verifies the session on load and bounces back to `/` if signed
out. All data is **per-user**, isolated by Supabase Row Level Security.
