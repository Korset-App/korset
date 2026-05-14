# Catalog Search Stage 9 — JS Quality Foundation

## Summary

Implemented the first Stage 9 execution slice after preserving the broad quality contract and completing current-code inspection.

## What Changed

- Added `src/domain/product/searchQuality.js` with pure JS search analysis/scoring helpers:
  - query normalization with case, whitespace, punctuation, and `ё` normalization;
  - quantity parsing/normalization for volume/weight forms such as `1л`, `1000 мл`, `0.5л`, `500мл`;
  - curated RU/KZ/Latin aliases for high-value products/brands such as `сникерс`, `doritos`, `coca-cola`, `сүт`;
  - product intent and query mode classification;
  - conservative attribute matching for `без сахара`, `без глютена`, `без лактозы`, `халал`, and `протеин`;
  - local product scoring with relevance tiers, token-order independent matching, typo-tolerant token matching, brand/product boost, and quantity boost.
- Added `tests/unit/catalogSearchQuality.test.mjs` covering broad grocery search behavior, not only milk.
- Updated `CatalogScreen.jsx` local/offline search fallback to use `sortCatalogSearchProducts()` instead of simple `haystack.includes(query)`.
- Updated search-mode default sorting so `searchRank`/relevance is evaluated before Fit-Check. Fit-Check remains visible and secondary within relevant result tiers.
- Expanded `src/domain/product/searchDiagnostics.js` and its test coverage for Stage 9 match types:
  - `phrase_name`, `all_tokens_name`, `intent_category`, `intent_subcategory`, `brand_product`, `quantity_match`, `attribute_tag`, `ingredient_match`, `token_fuzzy`, `local_fallback`, `offline_fallback`.
- Updated Stage 9 checklist in `docs/vault/plans/2026-05-13-catalog-search-stage9-quality-contract.md`.

## Verification

- `npm run check:agent:docs` passed before implementation.
- RED confirmed for `tests/unit/catalogSearchQuality.test.mjs` before creating `searchQuality.js`.
- `node --test tests/unit/catalogSearchQuality.test.mjs` passed after implementation.
- RED confirmed for diagnostics test before expanding diagnostics mapping.
- `node --test tests/unit/catalogSearchQuality.test.mjs tests/unit/catalogSearchDiagnostics.test.mjs tests/unit/catalogSearchRpc.test.mjs` passed.
- `node --check src/domain/product/searchQuality.js` passed.
- `npx eslint src/domain/product/searchQuality.js src/domain/product/searchDiagnostics.js src/screens/CatalogScreen.jsx` passed.

## Remaining Stage 9 Work

- Add new Supabase migration for RPC ranking v2 without editing migration `028`.
- Mirror JS quality concepts in SQL where feasible: token-order matching, intent/category boosts, quantity boost, aliases, token-level fuzzy, conservative attribute/ingredient scoring.
- Run broader build/lint and real pilot-store QA matrix after RPC v2.
