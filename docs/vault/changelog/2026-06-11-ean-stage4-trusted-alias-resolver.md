# EAN Stage 4 Trusted-Alias Resolver Path

Date: 2026-06-11

Status: local implementation complete; owner applied live migration; live no-op smoke passed.

## Summary

Implemented the no-op-safe resolver path for Product EAN integrity recovery:

- Buyer resolution still prefers exact primary/store EAN matches.
- Legacy `global_products.alternate_eans` is no longer part of the new RPC contract in migration `049_trusted_ean_alias_resolver.sql`.
- Non-primary scanned EANs can resolve only when `product_ean_aliases` has an active `trusted` row with confidence >= 80.
- Client-side scan containment now accepts mismatch results only when the RPC returns explicit trusted-alias metadata for the scanned EAN.
- `review`, `quarantined`, `rejected`, low-confidence, inactive, and legacy alternate evidence remain non-resolvable for buyers.

## Changed Files

- `supabase/migrations/049_trusted_ean_alias_resolver.sql`
- `src/domain/product/resolver.js`
- `src/domain/product/normalizers.js`
- `src/domain/product/eanAliases.js`
- `tests/unit/productScanContainment.test.mjs`
- `tests/unit/eanAliasModel.test.mjs`

## Important Notes

- Migration 049 replaces existing `public.fn_resolve_product_by_ean(text, uuid)`.
- Live `trusted` count is still 0, so applying migration 049 is behaviorally no-op for aliases until a real trusted candidate is manually promoted.
- No live trusted promotion was executed.
- No broad alternate resolution was enabled.
- The old function in migration 026 remains historical; migration 049 is the current intended resolver contract.
- Live source-count check shows all existing alias evidence currently has `source='legacy_alternate_eans'`; there are no trustable-source candidates yet (`manual_admin`, `audit_scan`, `store_import`, `external_exact_barcode`, `arbuz_barcode`, `openfoodfacts`).

## Verification

- TDD red observed for missing `normalizeTrustedAliasResolverProduct()` export.
- TDD red observed for missing `isResolvedProductAllowedForScannedEan()` export.
- `node --test tests/unit/productScanContainment.test.mjs tests/unit/eanAliasModel.test.mjs` passed 18/18.
- `npx eslint src/domain/product/resolver.js src/domain/product/normalizers.js src/domain/product/eanAliases.js` passed with 0 errors and one existing `EventTarget` warning.
- Live no-op smoke after owner applied migration 049 passed: alias counts `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`; anon RPC resolved exact primary EAN `4660298502127`; anon RPC returned `null` for quarantined alias `4870209550257`.
