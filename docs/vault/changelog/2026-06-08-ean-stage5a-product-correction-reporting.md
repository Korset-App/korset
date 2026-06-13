---
title: EAN Stage 5A Product Correction Reporting
domain: changelog
status: complete-live-smoke-passed
date: 2026-06-08
language: ru
---

# EAN Stage 5A Product Correction Reporting

## Context

After Stage 1-3B, buyer scan false positives are contained and legacy aliases are stored as review/quarantine evidence. The next product need is a user-facing way to report wrong product identity or incorrect product facts.

Stage 5A implements the client and schema foundation but does not add photos or admin review tooling.

## Changes

- Added `src/domain/product/correctionReports.js`.
- Added `tests/unit/productCorrectionReports.test.mjs`.
- Added migration `supabase/migrations/048_product_correction_events.sql`.
- Added ProductScreen report action and modal:
  - “Сообщить об ошибке” button;
  - reason selection;
  - optional short comment;
  - submit to `product_correction_events`.
- Added RU/KZ i18n keys under `product.report.*`.

## Data Contract

Stored metadata:

- scanned/display route EAN;
- shown product EAN;
- shown global/store product ids;
- store id;
- reason;
- context (`product_card` or `scan_result` from current UI);
- optional <=500 char comment;
- client token;
- small metadata JSON with shown product name only.

Not stored:

- shopper profile;
- allergens;
- ingredients;
- AI messages;
- email/phone/IP;
- photos.

## Verification

- `node --test tests/unit/productCorrectionReports.test.mjs` — 4/4 passed.
- `node --test tests/unit/productCorrectionReports.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/productScanContainment.test.mjs` — 17/17 passed.
- `node scripts/check-i18n.mjs` — PASS.
- `npx eslint src/domain/product/correctionReports.js src/screens/ProductScreen.jsx` — passed with no output.
- `npm run check:agent:docs` — PASS.
- `npm run build` — passed with existing Vite/Sentry warnings.
- Live smoke after owner-applied migration 048: `submitProductCorrectionReport()` through the anon key returned `{ ok: true }`; the smoke row was deleted with service role (`deleted: 1`).

## Live Status

Migration 048 has been applied to live Supabase by the owner. A live correction submit using the same domain helper as ProductScreen passed with anon insert permissions and RLS. A test using `insert().select()` failed for anon because the table intentionally has no public read policy; this is expected and preserves the private review queue posture. The app submit path does not request readback.

## Next

Continue to admin review tooling and trusted alias promotion workflows. Do not bulk-promote legacy aliases and do not re-enable broad alternate resolution.
