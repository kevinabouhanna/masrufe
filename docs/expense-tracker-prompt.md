# Expense Tracker App — Build Prompt

## Overview
Build a personal expense tracking web app — a single `index.html` file with two pages using hash-based routing (`#monthly` and `#reports`). No login, no auth. Deploy target is Vercel free tier (static file + serverless functions).

---

## Tech Stack

| Layer | Choice |
|---|---|
| **Frontend** | Vanilla HTML + CSS + JS (single `index.html`) |
| **Database** | Supabase (free tier) — PostgreSQL via REST API |
| **Charts** | Chart.js via CDN |
| **WhatsApp parsing** | Perplexity API (via Vercel serverless function) |
| **Hosting** | Vercel free tier |

---

## Currency

The app supports two currencies: **USD** and **LBP**.

- All amounts are stored in **LBP** internally in the database.
- The conversion rate is **89,500 LBP = $1 USD** (this rate is editable in a settings panel or inline input).
- When displaying amounts, show both LBP and USD equivalents.
- When adding an expense, the user can enter the amount in either currency — the app converts and stores in LBP.
- Conversion rate is stored in a Supabase settings table (single row) so it persists and can be updated from the UI.

---

## Database Schema (Supabase)

```sql
-- expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,              -- e.g. "Toters", "Sakr Market"
  category TEXT NOT NULL,            -- e.g. "Groceries", "Activity"
  amount_lbp BIGINT NOT NULL,        -- always stored in LBP
  currency_input TEXT DEFAULT 'LBP', -- currency the user entered ('LBP' or 'USD')
  amount_input NUMERIC,              -- original entered value before conversion
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- seed: INSERT INTO settings (key, value) VALUES ('usd_to_lbp', '89500');
```

---

## App Pages (Hash Routing)

### Page 1 — Current Month (`#monthly`)

**Top bar:**
- Month/year selector (prev/next arrows, defaults to current month)
- Summary cards: Total Income | Total Expenses | Savings (with color — green if positive, red if negative)
- Income is entered separately (one income entry per month, editable inline)

**Main table columns:**
`#` | Date | Source | Category (colored badge) | Amount (LBP) | Amount (USD) | Notes

**Sidebar or below-table:**
- Doughnut chart (Chart.js) showing expense breakdown by category for the selected month

**Add Expense button:**
- Opens a modal form with fields:
  - Source (text)
  - Category (dropdown — see category list below)
  - Amount (number input)
  - Currency toggle (LBP / USD)
  - Date (date picker, defaults to today)
  - Notes (text)
- On submit: convert to LBP if needed, insert to Supabase

**Conversion rate display:**
- Show current rate near the top (e.g., "$1 = 89,500 LBP") with a small edit pencil icon
- Clicking it opens an inline edit to update the rate (saves to Supabase settings table)

---

### Page 2 — Monthly Reports (`#reports`)

**Year selector** at the top (prev/next arrows).

**Table grouped by month:**
- Columns: Month | Income | Total Expenses | Savings | Top Categories (highlight text, e.g. "Groceries $420, Activity $288")
- Clicking a month row expands an inline breakdown by category

**Charts:**
- Bar chart: monthly expenses across the selected year
- Optional: line overlay for income

---

## Categories

Use this fixed list (match the badge colors to these categories consistently):

`Groceries`, `Activity`, `Books`, `Car Maintenance`, `Food Delivery`, `Subscriptions`, `Taxi`, `Mobile Internet`, `Parking`, `Tips`, `$ Exchange`, `Fashion`, `Electronics`, `Meds`, `Government`, `Private`, `Electricity`, `Waste`, `Health`, `Gift`, `Other`

Each category has a distinct color badge. Use the Nexus design system palette — no two adjacent categories should share a color.

---

## WhatsApp Integration

### Flow
1. User sends a WhatsApp message like: *"Toters 45k groceries x2 chips"* or *"$20 Claude pro subscription"*
2. Meta WhatsApp Business webhook (`POST /api/whatsapp`) receives the message
3. The serverless function calls the **Perplexity API** (`llama-3.1-sonar-small-online` or `sonar` model) with a structured prompt to extract expense fields
4. The extracted JSON is inserted into Supabase
5. The function replies to the user via WhatsApp with a confirmation: *"✅ Added: Toters — Groceries — LBP 45,000"*

### Perplexity Parsing Prompt (system prompt to send)
```
You are an expense parser. Extract structured expense data from a casual message.
Return ONLY valid JSON with these fields:
{
  "source": string,       // merchant or description
  "category": string,     // one of: Groceries, Activity, Books, Car Maintenance, Food Delivery, Subscriptions, Taxi, Mobile Internet, Parking, Tips, $ Exchange, Fashion, Electronics, Meds, Government, Private, Electricity, Waste, Health, Gift, Other
  "amount": number,       // numeric value only
  "currency": "LBP"|"USD",
  "notes": string         // extra detail, can be empty string
}
Rules:
- "k" suffix means thousands (e.g. 45k = 45000)
- "$" prefix or "usd" means USD
- If currency is ambiguous and amount > 1000, assume LBP
- If currency is ambiguous and amount <= 500, assume USD
- Date is always today (do not include in output)
```

### Serverless Function (`/api/whatsapp.js`)
- Verify Meta webhook signature (`X-Hub-Signature-256`)
- Parse incoming message text
- Call Perplexity API with the system prompt above
- Convert to LBP using current rate from Supabase settings
- Insert into `expenses` table
- Reply via Meta Graph API with confirmation message

---

## Environment Variables (`.env`)

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
PERPLEXITY_API_KEY=
WHATSAPP_TOKEN=          # Meta permanent access token
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=   # any string you choose for webhook verification
```

---

## File Structure

```
expense-tracker/
├── index.html            ← full frontend (both pages, all CSS and JS inline)
├── api/
│   └── whatsapp.js       ← Vercel serverless function
├── vercel.json
└── .env
```

### `vercel.json`
```json
{
  "functions": {
    "api/*.js": { "runtime": "nodejs20.x" }
  }
}
```

---

## Design System

Use the **Nexus design system**:
- **Font**: Satoshi (Fontshare CDN) for body, General Sans for headings
- **Colors**: Nexus palette — warm beige surfaces in light mode, dark charcoal in dark mode, teal primary accent
- **Both light and dark mode** with a toggle (sun/moon icon in header)
- **Spacing**: 4px base spacing tokens
- **Type scale**: fluid `clamp()` scale — web app caps at `--text-xl` for page titles
- **Borders**: alpha-blended (`oklch(... / 0.12)`), no solid gray
- **Shadows**: tone-matched to surface hue
- Category badges: pill shape (`border-radius: 9999px`), subtle background tint per category

---

## What to Exclude

- No authentication or login
- No PDF export
- No multi-user support
- No localStorage (sandboxed iframes block it — use in-memory JS variables for transient UI state)
- No editing of past expenses (add-only for now; deletion via a trash icon is fine)

---

## Key UX Details

- The app defaults to the current month on load
- Numbers always display with thousand separators (e.g., 1,450,000 LBP / $16.20)
- All LBP numbers use `font-variant-numeric: tabular-nums`
- Empty states are designed (not blank): e.g. "No expenses this month yet. Add your first one →"
- The add-expense modal closes on outside click or Escape key
- Mobile-first: the table scrolls horizontally on small screens; the chart stacks below the table
