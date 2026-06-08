---
title: EAN Stage 2 Trusted Alias Model
domain: changelog
status: complete-local
date: 2026-06-01
language: ru
---

# EAN Stage 2 Trusted Alias Model

## Context

Stage 1 made buyer scan resolution safer by rejecting unsafe alternate-only matches. Stage 2 creates the controlled data model needed to rebuild multi-EAN support safely.

No live Supabase schema was changed in this stage.

## Changes

- Added `src/domain/product/eanAliases.js` as the shared JS contract for EAN alias status/source behavior.
- Added `tests/unit/eanAliasModel.test.mjs`.
- Created local migration following the repo's manual numbering convention:
  - `supabase/migrations/047_product_ean_aliases.sql`.
- The migration creates `public.product_ean_aliases` with status/source/confidence/evidence, active row tracking, reviewer metadata, indexes, updated-at trigger, RLS, and admin-only authenticated policies.
- Added a partial unique index so one scannable EAN can have at most one active trusted product mapping.

## Security

- `anon` and `public` have no direct table access.
- `authenticated` access is limited to admins through `public.is_admin_user(auth.uid())`.
- `service_role` has full table privileges for scripts and future server-side review workflows.
- Buyer-facing reads are intentionally not exposed yet; Stage 4 should use controlled RPC instead of direct table access.

## Verification

- `node --test tests/unit/eanAliasModel.test.mjs` — 4/4 passed.
- `node --test tests/unit/eanAliasModel.test.mjs tests/unit/productScanContainment.test.mjs` — 8/8 passed.
- `npx eslint src/domain/product/eanAliases.js` — passed with no output.
- `node --check scripts/audit-ean-integrity.mjs` — passed with no output.
- `npm run check:agent:docs` — passed.

## Limitation

`npx supabase migration list --local` failed because the Supabase CLI could not parse the current `.env.local` (`unexpected character '-' in variable name`). The migration should be reviewed and applied through Supabase SQL Editor or after fixing/overriding CLI env parsing.

## Next

Before Stage 3, approve/apply the Stage 2 migration. Stage 3 should be dry-run first and classify legacy `alternate_eans` into trusted/review/quarantined/rejected candidates without deleting the old JSON field.
