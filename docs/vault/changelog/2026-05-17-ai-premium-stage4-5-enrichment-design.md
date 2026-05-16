---
type: changelog
status: active
date: 2026-05-17
area: ai
---

# AI Premium Stage 4.5: Controlled Product Enrichment Design

## Summary

Stage 4.5 is complete as a design-only safety gate. No live external browsing, network lookup, DB migration, or buyer-chat search was implemented.

## Changes

- Added `docs/vault/architecture/controlled-product-enrichment.md`.
- Defined source priority: current store facts, trusted product card fields, Fit-Check, reviewable external candidates, then Vault knowledge.
- Defined trigger conditions for weak product data.
- Defined allowed lookup keys: EAN, exact product name, brand, package size, manufacturer.
- Defined confidence labels: `exact_ean_match`, `probable_product_match`, `weak_match`, `conflict`, `not_found`.
- Defined user-facing uncertainty wording for missing local data and lower-confidence external references.
- Defined storage direction: reviewable enrichment candidates first, not automatic trusted writes into product facts.
- Reconfirmed that same-store recommendation cards remain store-scoped even when external references are later used for explanation.

## Verification

- `npm run check:agent:docs` passes.
- `git diff --check` passes.
- `npm run memory:save` should be run after this note is saved.

## Remaining Work

- Future implementation needs owner approval because it may affect network access, cost, source provenance, DB/storage design, and buyer-facing safety wording.
