# 4. Deployment (Vercel)

Masrufe is a static site (`index.html`, `app.html`) plus one serverless function
(`api/whatsapp.mjs`). It's built for the Vercel free tier.

## Deploy

From the project root:

```bash
npm i -g vercel   # if you don't have it
vercel            # first run: link/create the project
vercel --prod     # promote to production
```

Vercel automatically:
- serves `index.html` at `/` and `app.html` at `/app` (via `cleanUrls` in
  [`vercel.json`](../vercel.json) — `.html` URLs redirect to their clean form),
- builds `api/whatsapp.mjs` as a Node function at `/api/whatsapp` (zero-config —
  no runtime needs to be declared).

## Environment variables

In the Vercel dashboard → **Project → Settings → Environment Variables**, add
every value from your [`.env`](../.env.example) (see
[Configuration](03-configuration.md) for the table). Redeploy after adding them
so the function picks them up.

> The frontend keys also need to be in the `CONFIG` blocks of `index.html` /
> `app.html` — Vercel env vars are **not** injected into static HTML.

## After deploying

1. Go back to [Authentication](02-authentication.md) and make sure your
   **production** URL (e.g. `https://masrufe.vercel.app/app.html`) is in the
   Supabase redirect allow-list and Site URL.
2. Visit `/`, sign in, and confirm you land on `/app` (e.g.
   `https://masrufe.vercel.app/app`).
3. (Optional) Set up [WhatsApp](05-whatsapp.md).

## Routes

| URL | Serves |
|-----|--------|
| `/` | Landing page + auth |
| `/app` | The tracker (requires sign-in) |
| `/api/whatsapp` | WhatsApp webhook (GET verify, POST messages) |

→ Next: [WhatsApp setup](05-whatsapp.md)
