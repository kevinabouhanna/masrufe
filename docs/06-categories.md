# 6. Categories

Categories are **per-user and editable** — not everyone wants the same set.

## Defaults

The first time a user opens the app, Masrufe seeds their account with a default
set of 21 colour-coded categories (Groceries, Activity, Books, … Other). From
there they can change anything.

## Managing categories

Open **Settings (gear icon) → Categories**:

| Action | How |
|--------|-----|
| **Add** | Click **+ Add**, type a name, pick a colour swatch, **Add** |
| **Rename** | Click the name, edit it, press Enter (or click away) |
| **Recolour** | Click the colour dot, pick a new swatch |
| **Delete** | Click the trash icon (you must keep at least one) |

Changes save to Supabase immediately and the table badges + charts update live.

## Behaviour you should know

- **Renaming cascades.** Because expenses store the category as text, renaming a
  category also updates that label on all of the user's existing expenses, so
  history stays consistent.
- **Deleting is non-destructive to expenses.** Past expenses keep the old
  category label; since the category no longer exists, that label just renders
  with a neutral grey colour. (Rename instead if you want to merge/clean up.)
- **Colours** are stored as an OKLCH hue (0–360) per category and used for the
  pill badges, the doughnut chart, and the report breakdowns.

## WhatsApp + categories

When an expense comes in via WhatsApp, the parser is given **that user's**
current category names and is constrained to pick one of them (falling back to
`Other`, or the first category if `Other` was deleted). So custom categories
work over WhatsApp too.

← Back to [docs index](README.md)
