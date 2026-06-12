-- Run this in the Supabase SQL editor to provision the database.
-- This schema is MULTI-USER: every row is owned by an authenticated user
-- (auth.users) and Row Level Security scopes all access to that user.

-- ============================================================
-- expenses
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  source TEXT NOT NULL,              -- e.g. "Toters", "Sakr Market"
  category TEXT NOT NULL,            -- e.g. "Groceries", "Activity"
  amount_lbp BIGINT NOT NULL,        -- always stored in LBP
  currency_input TEXT DEFAULT 'LBP', -- currency the user entered ('LBP' or 'USD')
  amount_input NUMERIC,              -- original entered value before conversion
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_user_date_idx ON expenses (user_id, date);

-- ============================================================
-- settings (key/value per user; holds per-month income as income_YYYY-MM
-- and the per-user conversion rate as usd_to_lbp)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);

-- ============================================================
-- categories (per user, editable). Seeded with defaults by the app on first
-- load, then fully manageable from Settings. `hue` is an OKLCH hue 0-360 used
-- for the badge colour. `name` is what expenses.category stores (denormalised).
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hue INT NOT NULL DEFAULT 250,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS categories_user_idx ON categories (user_id, sort_order);

-- ============================================================
-- whatsapp_links — maps a WhatsApp sender phone number to a user, so messages
-- route to the right account. Verified with a one-time link code generated in
-- the app. The webhook (service role) reads/updates this; the app manages its
-- own row. One active link per user.
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_links (
  user_id UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  phone TEXT UNIQUE,            -- WhatsApp sender number (E.164 digits), set once verified
  link_code TEXT UNIQUE,        -- pending verification code; nulled after linking
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_links_phone_idx ON whatsapp_links (phone);
CREATE INDEX IF NOT EXISTS whatsapp_links_code_idx ON whatsapp_links (link_code);

-- ============================================================
-- Row Level Security — each user only sees / manages their own rows.
-- The WhatsApp webhook uses the service-role key, which bypasses RLS.
-- ============================================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own expenses" ON expenses;
CREATE POLICY "own expenses" ON expenses
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own settings" ON settings;
CREATE POLICY "own settings" ON settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own categories" ON categories;
CREATE POLICY "own categories" ON categories
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own whatsapp link" ON whatsapp_links;
CREATE POLICY "own whatsapp link" ON whatsapp_links
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Note: there is no global seed for usd_to_lbp or categories — each user gets
-- their own. The app defaults the rate to 89,500 and seeds the default category
-- set the first time a user opens it.
