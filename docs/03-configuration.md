# 3. Configuration

Two places need your Supabase values: the **frontend HTML** (public anon key)
and the **`.env`** (server-side keys for the WhatsApp function).

## Frontend

A static HTML file can't read `.env`, so the public values live in a `CONFIG`
block near the bottom of the `<script>` in **both** files. Set them to the same
values:

`index.html` and `app.html`:
```js
const CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-ref.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...your anon public key...',
};
```

That's the only frontend change. The anon key is safe to expose — Row Level
Security restricts every row to its owner.

> If you forget this step, the landing page shows a "Supabase isn't configured"
> message in the auth modal, and the app shows a config banner.

## Environment variables (`.env`)

Copy [`.env.example`](../.env.example) to `.env` and fill it in. These are used
by the **WhatsApp serverless function** (and mirrored into Vercel's project
settings for deployment):

| Variable | Where to get it | Notes |
|----------|-----------------|-------|
| `SUPABASE_URL` | Supabase → Settings → API | same as frontend |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API | same as frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **secret**, bypasses RLS |
| `PERPLEXITY_API_KEY` | perplexity.ai API settings | parses WhatsApp messages |
| `WHATSAPP_TOKEN` | Meta → WhatsApp | permanent access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta → WhatsApp | your number's ID |
| `WHATSAPP_VERIFY_TOKEN` | you invent it | any random string |
| `WHATSAPP_APP_SECRET` | Meta → App settings | optional; verifies signatures |

`.env` is git-ignored. Only the frontend `SUPABASE_URL` / anon key are ever
shipped to the browser; everything else stays server-side.

→ Next: [Deployment](04-deployment.md)
