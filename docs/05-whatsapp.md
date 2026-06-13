# 5. WhatsApp setup

Log expenses by texting a casual message to your WhatsApp number, e.g.:

> Toters 45k groceries x2 chips
> $20 Claude pro subscription

The serverless function parses it with an LLM (OpenRouter, free model),
converts to LBP, stores it, and replies with a confirmation.

## Per-user routing (how messages reach the right account)

A webhook has no logged-in session, so the function uses the **service-role key**
and figures out *which user* a message belongs to by the **sender's phone
number**, looked up in the `whatsapp_links` table.

Users connect their own number with a one-time **link code** — so each person's
WhatsApp messages land in their own account:

```
┌─────────────┐   generate code    ┌──────────────┐
│  Masrufe    │ ─────────────────► │ whatsapp_     │
│  app        │   (Settings →      │ links row:    │
│             │    WhatsApp)       │ code=ABC123   │
└─────────────┘                    └──────────────┘
       │                                  ▲
       │ user sends "ABC123" on WhatsApp  │ webhook matches the code,
       ▼                                  │ saves phone, clears code
┌─────────────┐   POST /api/whatsapp  ┌──────────────┐
│  WhatsApp   │ ────────────────────► │ whatsapp_     │
│  (Meta)     │                       │ links row:    │
│             │                       │ phone=+961..  │
└─────────────┘                       └──────────────┘
```

After that, every message from that number is matched to the user and logged
against their account, using **their** conversion rate and **their** category
list. Messages from an unknown number get a friendly "connect first" reply.

### What the user does
1. Open Masrufe → **Settings (gear icon) → WhatsApp → Generate link code**.
2. Send that code (or `link ABC123`) to the Masrufe WhatsApp number.
3. Get `✅ WhatsApp connected` — done. They can disconnect anytime from Settings.

## Meta / Vercel setup (one-time, by you)

1. Create a **Meta app** with the **WhatsApp** product and get a **permanent
   access token** and your **Phone number ID**.
2. Set these env vars in Vercel (see [Configuration](03-configuration.md)):
   `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `WHATSAPP_TOKEN`,
   `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, and optionally
   `WHATSAPP_APP_SECRET` and `NEXT_PUBLIC_APP_URL`.
3. In Meta → **WhatsApp → Configuration → Webhook**:
   - **Callback URL:** `https://<your-app>/api/whatsapp`
   - **Verify token:** the same string you set as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the **messages** field.
4. Send a test message from a connected number.

## Security notes

- The link code proves the sender controls a Masrufe account, so numbers can't
  be hijacked by guessing.
- Set `WHATSAPP_APP_SECRET` to verify Meta's `X-Hub-Signature-256` on every
  request (recommended for production).
- The service-role key must stay in Vercel env vars only — never in the HTML.

→ Next: [Categories](06-categories.md)
