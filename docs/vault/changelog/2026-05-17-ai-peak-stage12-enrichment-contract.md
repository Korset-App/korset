---
type: changelog
status: active
date: 2026-05-17
area: ai
---

# AI Peak Stage 12: Controlled Enrichment Contract

Stage 12 prepared controlled external product enrichment without enabling live lookup, DB writes, or buyer-visible external facts by default.

## What Changed

- Added `src/domain/ai/enrichmentContract.js`
  - `classifyEnrichmentTrigger()` allows enrichment only when a specific product card is weak or a buyer asks for a missing exact fact.
  - `buildEnrichmentRequest()` creates a side-effect-free request from precise product identifiers only: EAN, exact name, brand, quantity, and manufacturer.
  - `normalizeExternalCandidate()` classifies candidates as `exact_ean_match`, `probable_product_match`, `weak_match`, `conflict`, or `not_found`.
  - `canShowExternalCandidateToBuyer()` blocks weak, conflicting, and rejected candidates.
  - `buildExternalReferenceNotice()` produces lower-confidence RU/KZ wording and always requires package checking.

- Added `tests/unit/aiEnrichmentContract.test.mjs`
  - Covers trigger rules, broad request rejection, allowed lookup keys, no buyer text evidence, confidence classification, buyer visibility, and lower-confidence wording.

- Updated `docs/vault/architecture/controlled-product-enrichment.md`
  - Converted the architecture note into a concrete implementation contract and documented hard guarantees.

## Hard Guarantees After Stage 12

- No network calls.
- No DB schema or RLS changes.
- No buyer message text stored as enrichment evidence.
- No broad catalog enrichment.
- No external data promoted into trusted product facts.
- No weak/conflicting candidate shown confidently to buyers.

## Verification

- `node --test tests/unit/aiEnrichmentContract.test.mjs` passed: 6/6.
- `node --test tests/unit/ai*.test.mjs` passed: 101/101.
- `npm run check:ai:qa` passed: 12/12 no-spend scenarios.
- `npm run check:agent:docs` passed.

## Next Stage

Stage 13 may implement controlled enrichment only behind the Stage 12 contract. Before live network lookup, DB persistence, paid APIs, or buyer-visible external facts, ask the owner for explicit approval.
