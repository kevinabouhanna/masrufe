// Vercel serverless function: Meta WhatsApp Business webhook -> Perplexity parse -> Supabase insert -> reply.
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PERPLEXITY_API_KEY,
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
// Optional:
//   WHATSAPP_APP_SECRET  (Meta App Secret; if set, X-Hub-Signature-256 is verified)
//
// ROUTING: the data model is per-user with RLS, but a webhook has no logged-in
// session. So this function uses the SERVICE ROLE key (which bypasses RLS) and
// routes each message to the right user by looking up the sender's phone number
// in the `whatsapp_links` table. Users link their number by generating a code in
// the app and sending it here once. Keep the service-role key server-side only.

import crypto from 'node:crypto';

// We need the raw body to verify the Meta signature, so disable the default parser.
export const config = { api: { bodyParser: false } };

const DEFAULT_CATEGORIES = [
  'Groceries', 'Activity', 'Books', 'Car Maintenance', 'Food Delivery',
  'Subscriptions', 'Taxi', 'Mobile Internet', 'Parking', 'Tips', '$ Exchange',
  'Fashion', 'Electronics', 'Meds', 'Government', 'Private', 'Electricity',
  'Waste', 'Health', 'Gift', 'Other',
];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function systemPrompt(categories) {
  return `You are an expense parser. Extract structured expense data from a casual message.
Return ONLY valid JSON with these fields:
{
  "source": string,       // merchant or description
  "category": string,     // one of: ${categories.join(', ')}
  "amount": number,       // numeric value only
  "currency": "LBP"|"USD",
  "notes": string         // extra detail, can be empty string
}
Rules:
- "k" suffix means thousands (e.g. 45k = 45000)
- "$" prefix or "usd" means USD
- If currency is ambiguous and amount > 1000, assume LBP
- If currency is ambiguous and amount <= 500, assume USD
- Date is always today (do not include in output)`;
}

/* ---------------- helpers ---------------- */

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifySignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) return true; // No secret configured -> skip verification.
  if (!signatureHeader) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

const fmt = (n) => Number(n).toLocaleString('en-US');

/* ---------------- Supabase (service role) ---------------- */

// Find the user linked to a WhatsApp sender phone number.
async function findUserByPhone(phone) {
  const url = `${SUPABASE_URL}/rest/v1/whatsapp_links?phone=eq.${encodeURIComponent(phone)}&select=user_id`;
  const res = await fetch(url, { headers: sbHeaders() });
  const rows = await res.json();
  return rows?.[0]?.user_id || null;
}

// If `code` matches a pending link code, bind it to this phone and return user_id.
async function tryConsumeLinkCode(code, phone) {
  const url = `${SUPABASE_URL}/rest/v1/whatsapp_links?link_code=eq.${encodeURIComponent(code)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify({ phone, link_code: null }),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.user_id || null;
}

async function getRate(userId) {
  const url = `${SUPABASE_URL}/rest/v1/settings?user_id=eq.${userId}&key=eq.usd_to_lbp&select=value`;
  const res = await fetch(url, { headers: sbHeaders() });
  const rows = await res.json();
  const rate = rows?.[0]?.value ? Number(rows[0].value) : 89500;
  return Number.isFinite(rate) && rate > 0 ? rate : 89500;
}

async function getCategories(userId) {
  const url = `${SUPABASE_URL}/rest/v1/categories?user_id=eq.${userId}&select=name&order=sort_order.asc`;
  const res = await fetch(url, { headers: sbHeaders() });
  const rows = await res.json();
  const names = (rows || []).map((r) => r.name);
  return names.length ? names : DEFAULT_CATEGORIES;
}

async function parseWithPerplexity(text, categories) {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt(categories) },
        { role: 'user', content: text },
      ],
      temperature: 0,
    }),
  });
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Could not parse JSON from model output: ${content}`);
  const obj = JSON.parse(match[0]);
  if (!categories.includes(obj.category)) obj.category = categories.includes('Other') ? 'Other' : categories[0];
  return obj;
}

async function insertExpense(userId, parsed, rate) {
  const currency = parsed.currency === 'USD' ? 'USD' : 'LBP';
  const amountInput = Number(parsed.amount) || 0;
  const amountLbp =
    currency === 'USD' ? Math.round(amountInput * rate) : Math.round(amountInput);
  const today = new Date().toISOString().slice(0, 10);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/expenses`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify({
      user_id: userId,
      source: parsed.source || 'Unknown',
      category: parsed.category || 'Other',
      amount_lbp: amountLbp,
      currency_input: currency,
      amount_input: amountInput,
      date: today,
      notes: parsed.notes || '',
    }),
  });
  if (!res.ok) throw new Error(`Supabase insert failed: ${await res.text()}`);
  return { amountLbp, currency };
}

async function replyWhatsApp(to, message) {
  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, text: { body: message } }),
  });
}

// Pull a candidate link code out of a message: "link ABC123", or a bare 6-char code.
function extractLinkCode(text) {
  const t = text.trim();
  const m = t.match(/^link\s+([A-Za-z0-9]{4,10})$/i);
  if (m) return m[1].toUpperCase();
  if (/^[A-Za-z0-9]{6}$/.test(t)) return t.toUpperCase();
  return null;
}

/* ---------------- handler ---------------- */

export default async function handler(req, res) {
  // Webhook verification handshake (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).send('Bad Request');
  }

  if (!verifySignature(rawBody, req.headers['x-hub-signature-256'], process.env.WHATSAPP_APP_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  let body;
  try {
    body = JSON.parse(rawBody.toString('utf8') || '{}');
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  try {
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];

    if (msg && msg.type === 'text') {
      const from = msg.from;
      const text = (msg.text?.body || '').trim();

      try {
        // 1) Is this a link code? (try to bind the phone to a pending code)
        const code = extractLinkCode(text);
        if (code) {
          const linkedUser = await tryConsumeLinkCode(code, from);
          if (linkedUser) {
            await replyWhatsApp(from, '✅ WhatsApp connected to your Masrufe account. Send me an expense like "Toters 45k groceries".');
            return res.status(200).json({ received: true });
          }
          // Not a valid code — fall through to normal handling / onboarding.
        }

        // 2) Route by sender phone number.
        const userId = await findUserByPhone(from);
        if (!userId) {
          await replyWhatsApp(from, '👋 To connect, open Masrufe → Settings → WhatsApp, generate a link code, and send it to me here.');
          return res.status(200).json({ received: true });
        }

        // 3) Parse + insert against this user's rate and categories.
        const [rate, categories] = await Promise.all([getRate(userId), getCategories(userId)]);
        const parsed = await parseWithPerplexity(text, categories);
        const { amountLbp, currency } = await insertExpense(userId, parsed, rate);

        let confirmation = `✅ Added: ${parsed.source} — ${parsed.category} — LBP ${fmt(amountLbp)}`;
        if (currency === 'USD') confirmation += ` ($${fmt((amountLbp / rate).toFixed(2))})`;
        await replyWhatsApp(from, confirmation);
      } catch (err) {
        console.error('Processing error:', err);
        await replyWhatsApp(from, '⚠️ Sorry, I couldn\'t add that. Try e.g. "Toters 45k groceries".');
      }
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }

  return res.status(200).json({ received: true });
}
