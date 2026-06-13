# Masrufe WhatsApp Webhook — Implementation Spec

> **How to use this file:** Open Claude Code, attach this `.md` file, and say:
> *"Read the attached spec and implement or update the WhatsApp webhook exactly as described."*

---

## What already exists

The file `/api/whatsapp.mjs` (or `.ts`) is already written and working. The architecture is:

- Pages Router style (`export default async function handler(req, res)`)
- Raw body parsed manually to support `X-Hub-Signature-256` verification
- Perplexity `sonar` model for expense parsing
- Supabase via raw `fetch` REST calls (no SDK) using the service-role key
- Per-user routing via `whatsapp_links` table (phone → user_id)
- Link-code flow: user sends a 6-char code to bind their WhatsApp number

---

## Change: Replace Perplexity with OpenRouter (free model)

The only meaningful change is swapping the LLM provider from Perplexity to OpenRouter so that parsing is free.

### What to change

Replace the `parseWithPerplexity` function with `parseWithOpenRouter` below.
Everything else — routing, Supabase inserts, reply logic, signature verification — stays exactly as-is.

### New function

```javascript
async function parseWithOpenRouter(text, categories) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000',
      'X-Title': 'Masrufe',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-8b-instruct:free',
      messages: [
        { role: 'system', content: systemPrompt(categories) },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 200,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';

  // json_object mode returns clean JSON, but fall back to regex just in case
  let obj;
  try {
    obj = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Could not parse JSON from model output: ${content}`);
    obj = JSON.parse(match[0]);
  }

  if (!categories.includes(obj.category)) {
    obj.category = categories.includes('Other') ? 'Other' : categories[0];
  }
  return obj;
}
```

### Call-site change

In the `handler` function, replace:

```javascript
const parsed = await parseWithPerplexity(text, categories);
```

with:

```javascript
const parsed = await parseWithOpenRouter(text, categories);
```

### Remove

Delete the `parseWithPerplexity` function entirely.

---

## Environment variables

Add to `.env.local` and Vercel project settings:

```env
OPENROUTER_API_KEY=    # from openrouter.ai → Keys (free account is enough)
```

Remove or leave unused (no longer called):

```env
PERPLEXITY_API_KEY=    # no longer needed after this change
```

All other existing env vars stay unchanged:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=         # optional
NEXT_PUBLIC_APP_URL=         # used as HTTP-Referer header for OpenRouter
```

---

## systemPrompt — no changes needed

The existing `systemPrompt(categories)` function in the file is correct and works with OpenRouter as-is. Do not change it.

---

## Model options

The free model used is `meta-llama/llama-3.3-8b-instruct:free`.

If you want to upgrade later, change only the `model` field in `parseWithOpenRouter`:

| Model | Cost | Notes |
|---|---|---|
| `meta-llama/llama-3.3-8b-instruct:free` | Free | Good for short structured prompts |
| `meta-llama/llama-3.1-8b-instruct` | ~$0.0001/req | Faster, more stable |
| `google/gemma-3-27b-it` | ~$0.0003/req | Better accuracy on ambiguous messages |
| `anthropic/claude-haiku-3-5` | ~$0.0008/req | Most reliable JSON output |

---

## What the final file should look like (structure only)

```
whatsapp.mjs
  export const config = { api: { bodyParser: false } }
  DEFAULT_CATEGORIES  (unchanged)
  SUPABASE_URL / SERVICE_KEY  (unchanged)
  sbHeaders()         (unchanged)
  systemPrompt()      (unchanged)
  readRawBody()       (unchanged)
  verifySignature()   (unchanged)
  fmt()               (unchanged)
  findUserByPhone()   (unchanged)
  tryConsumeLinkCode()(unchanged)
  getRate()           (unchanged)
  getCategories()     (unchanged)
  parseWithOpenRouter()  ← NEW (replaces parseWithPerplexity)
  insertExpense()     (unchanged)
  replyWhatsApp()     (unchanged)
  extractLinkCode()   (unchanged)
  export default handler()  (unchanged except one line: parseWithOpenRouter call)
```

---

## Verification checklist for Claude Code

After making the change, verify:

- [ ] `parseWithPerplexity` is deleted
- [ ] `parseWithOpenRouter` is added with `response_format: { type: 'json_object' }`
- [ ] The call in `handler` uses `parseWithOpenRouter`
- [ ] `OPENROUTER_API_KEY` is referenced in the new function
- [ ] `PERPLEXITY_API_KEY` is not referenced anywhere
- [ ] All other functions are untouched
- [ ] `export const config` and `export default handler` are still present (Pages Router)
