---
title: EAN Stage 6C-A Trusted Promotion Guardrails
domain: changelog
status: complete-local
date: 2026-06-08
language: ru
---

# EAN Stage 6C-A Trusted Promotion Guardrails

## Context

After Stage 6B, retail owners/admins can mark shopper correction reports as `reviewing`, `fixed`, `rejected`, or `duplicate`. The next risky area is trusted alias promotion. Stage 6C-A intentionally adds only local guardrail logic and tests; it does not expose promotion UI/API and does not write to Supabase.

## Scope

Added trusted-promotion guard helpers in `src/domain/product/eanAliases.js`:

- `canPromoteEanAliasToTrusted()`
- `buildTrustedAliasPromotionUpdate()`

These helpers define the minimum contract for any future Stage 6C promotion UI/API.

## Promotion Requirements

A candidate may pass only when:

- EAN is scannable numeric 8-14 digits.
- Alias row is active.
- Current status is not already `trusted`.
- Confidence is at least `80`.
- Source is trustable: `manual_admin`, `audit_scan`, `store_import`, `external_exact_barcode`, `arbuz_barcode`, or `openfoodfacts`.
- Evidence includes `reviewerConfirmedSameSku: true`.
- The EAN is not another active product's primary EAN.
- The EAN is not already trusted for another product.

Blocked sources include legacy/broad search evidence:

- `legacy_alternate_eans`
- `npc_search`
- `arbuz_search`
- `kaspi`
- `korzinavdom`
- `unknown`

## Safety

- No `product_ean_aliases` writes.
- No `trusted` rows created.
- No UI/API promotion action.
- No `global_products.alternate_eans` changes.
- No broad alternate resolution.
- Live `product_ean_aliases` remains `trusted=0`.

## Verification

- TDD red: `node --test tests/unit/eanAliasModel.test.mjs` failed before the new exports existed.
- `node --test tests/unit/eanAliasModel.test.mjs` — 8/8 passed.
- Targeted EAN/correction set — 28/28 passed.
- `npx eslint src/domain/product/eanAliases.js` — passed with no output.
- Live count check: `product_ean_aliases` total `144856`, `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`.

## Next

Stage 6C-B should design the server-side promotion action, but it must stay disabled until the API checks current trusted conflicts and primary-EAN conflicts directly from Supabase inside the same request. Do not add a UI promotion button before that server-side contract exists and is tested.
