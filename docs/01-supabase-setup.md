# 1. Supabase setup

Masrufe stores all data in Supabase (Postgres) and uses Supabase Auth for login.

## Create the project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Pick a region close to you and save the database password somewhere safe.

## Run the schema

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase-schema.sql`](../supabase-schema.sql)
   and click **Run**.

This creates four tables — all with Row Level Security so each user only ever
sees their own rows:

| Table | Purpose |
|-------|---------|
| `expenses` | One row per expense (stored in LBP, owned by `user_id`) |
| `settings` | Per-user key/value: conversion rate + monthly income |
| `categories` | Per-user, editable category list with colours |
| `whatsapp_links` | Maps a verified WhatsApp phone number to a user |

> **Re-running / upgrading:** the script uses `CREATE TABLE IF NOT EXISTS`, so
> it won't recreate existing tables. If you previously ran an **older
> single-user** version of the schema, drop the old tables first
> (`DROP TABLE expenses, settings CASCADE;`) and re-run, because the column
> layout changed (a `user_id` was added).

## Grab your keys

Open **Project Settings → API** and copy:

| Value | Used by | Secret? |
|-------|---------|---------|
| **Project URL** | frontend + function | no |
| **anon public** key | frontend (`index.html`, `app.html`) | no (RLS-safe) |
| **service_role** key | WhatsApp function only | **YES — server-side only** |

The anon key is safe to ship in the browser because every table is protected by
RLS. The **service_role key bypasses RLS** — it must only ever live in Vercel
environment variables, never in the HTML.

→ Next: [Authentication](02-authentication.md)
