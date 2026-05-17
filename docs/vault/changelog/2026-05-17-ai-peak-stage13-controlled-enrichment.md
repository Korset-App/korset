---
type: changelog
status: active
date: 2026-05-17
area: ai
---

# AI Peak Stage 13: Controlled Enrichment Implementation

Stage 13 turned the Stage 12 contract into a real server-side controlled enrichment path. This is not a broad browsing feature: it is exact product fact lookup behind strict triggers, cache, confidence labels, and buyer-safety wording.

## What Changed

- Added `src/domain/ai/productEnrichmentService.js`
  - Checks `external_product_cache` first.
  - Uses Stage 12 `buildEnrichmentRequest()` and candidate visibility rules.
  - Supports live USDA lookup for branded food composition/nutrition when `USDA_API_KEY` is available.
  - Supports live National Product Catalog lookup for Kazakhstan product identity/manufacturer signals when `NPC_API_KEY` is available.
  - Persists candidates into existing `external_product_cache` with `controlledConfidence`, `reviewStatus`, source metadata, and TTL in `raw_payload`.
  - Returns buyer-visible `externalReference` only for strong non-conflicting candidates.

- Updated `api/ai.js`
  - Product AI now calls controlled enrichment before building the developer prompt.
  - Strong references are passed as `EXTERNAL_REFERENCE` lower-confidence context.
  - The prompt explicitly says the external reference must not override local product card data, Fit-Check, direct allergy matches, price, stock, or `halalStatus=no`.
  - API response can include `externalReference` and `externalEnrichmentStatus`.

- Updated `src/domain/ai/responseShape.js`
  - Preserves `externalReference` and `externalEnrichmentStatus` in normalized AI responses.

- Added tests
  - `tests/unit/aiProductEnrichmentService.test.mjs`
  - Product prompt coverage for lower-confidence external references.
  - Response normalization coverage for external-reference metadata.

## Safety Guarantees

- Broad catalog requests do not trigger enrichment.
- Buyer message text is not stored as evidence.
- Weak, conflicting, rejected, and not-found candidates are not shown to buyers.
- External facts are never promoted into trusted product card fields by this path.
- Direct allergy risk, Fit-Check, trusted local facts, current-store stock, and current-store price remain higher priority.
- No new DB/RLS migration was added in this stage; existing `external_product_cache` is used server-side.

## Live Verification

- A real NPC request returned product identity candidates.
- An end-to-end NPC + Supabase smoke inserted a weak candidate as review-only.
- The weak candidate was correctly not buyer-visible.
- The artificial test cache row was deleted after verification.
- USDA was attempted, but the environment timed out against USDA network endpoints; the service handles this by falling back without failing Product AI.

## Verification

- `node --test tests/unit/ai*.test.mjs` passed: 108/108.
- `npm run check:ai:qa` passed: 12/12.
- `npm run check:ai:live:dry` listed 13 scenarios and made no OpenAI calls.

## Next Stage

Stage 14 should clean up compare/ranking and visible scoring. Do not expand enrichment sources, auto-promote facts, or add DB review UI unless the owner explicitly asks for that as a separate step.
