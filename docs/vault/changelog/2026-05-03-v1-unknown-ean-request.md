# 2026-05-03 — V1 unknown EAN request flow

> Связи: [[ean-recovery-system]] · [[data-moat-strategy]] · [[i18n-migration]]

## Summary

Implemented the first V1 slice of the unknown EAN flow. After the central i18n migration landed, the UI copy was aligned with the new locale system.

## Decisions preserved

- No 100-point product score in V1.
- No public ratings or general feedback system in V1.
- ProductScreen stays focused on scan outcome and Fit-Check, not trust-score/source-badge UI.
- Unknown EAN is handled as a product coverage request, not as an AI guess.
- Alcohol and tobacco are mentioned only in the general unsupported/not-found state. The app must not claim an unknown barcode is alcohol unless the category is known.

## Implementation

- Added `src/domain/product/unknownEanRequest.js` as a pure domain helper with no UI copy.
- Added `tests/unit/unknownEanRequest.test.mjs`.
- Added RU/KZ locale keys under `product.unknownEan.*`.
- Updated ProductScreen not-found state:
  - shows a clear not-found message;
  - mentions alcohol/tobacco are unsupported;
  - shows scanned EAN;
  - offers "Request product check" when EAN and store id are valid;
  - calls existing Supabase RPC `increment_missing_scan_count`.

## Notes

- Existing resolver already logs missing scans through `missing_products`; the explicit request button adds an intentional user signal using the same RPC.
- Unknown EAN copy now lives in `src/locales/{ru,kz}/product.json`.
- Post-i18n cleanup also fixed safe migration seams in `CompareScreen`, `ProfileScreen`, and `RetailProductsScreen` where translated helpers needed explicit `lang`/`t`/placeholder props.

## Verification

- `node --test tests/unit/unknownEanRequest.test.mjs` — passed.
- i18n unit tests (`resolve`, `plural`, `interpolate`, `format`) — passed when run directly through Node.
- `node scripts/check-i18n.mjs` — passed: 0 missing KZ, 0 orphan, 0 empty.
- `npm run build` — passed.
- `npm run lint` — passed with warnings only; no lint errors.
