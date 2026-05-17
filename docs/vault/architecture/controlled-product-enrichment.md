---
type: architecture
status: active
date: 2026-05-17
area: ai
---

# Controlled Product Enrichment

## Purpose

Körset AI should be useful when local product data is weak, but buyer chat must not perform uncontrolled live web search on every message. External facts are lower-confidence support data, not the source of truth.

This note defines the V1-safe direction for controlled enrichment before implementation.

## Source Priority

Use facts in this order:

1. Current store product overlay: price, stock, store-specific availability.
2. Trusted product card fields in `global_products`: composition, allergens, halal status, nutrition, images, manufacturer.
3. Deterministic Fit-Check result from local product/profile data.
4. Reviewable external enrichment candidates for the exact product.
5. General Vault knowledge for ingredients, allergens, additives, halal concepts, and safety wording.

External data must not override a deterministic red Fit-Check, confirmed allergen match, trusted `halalStatus: no`, or current-store stock/price.

## Trigger Conditions

Enrichment can be offered or queued only when at least one important field is missing or weak:

- missing composition;
- unknown halal status and the user has halal preference;
- missing nutrition when the user asks about sugar, calories, protein, diabetes, diet, or daily use;
- missing image or manufacturer for product confidence;
- unknown EAN request or repeated scans of weak-data products;
- buyer asks a specific product fact that is absent from the local card.

Do not trigger enrichment for broad catalog questions like "что купить на ужин" or "покажи дешевле". Recommendations must stay store-scoped.

## Allowed Lookup Keys

Use only precise product identifiers:

- EAN / barcode;
- exact product name;
- brand;
- quantity / package size;
- manufacturer when already known.

Avoid broad natural-language searches without EAN/name/brand constraints.

## Confidence Labels

External candidates should carry one of these labels:

- `exact_ean_match`: same EAN found in a trusted source.
- `probable_product_match`: name + brand + quantity strongly match, EAN absent.
- `weak_match`: name is similar but brand/quantity/source are incomplete.
- `conflict`: external data conflicts with local card or another source.
- `not_found`: lookup produced no useful candidate.

Only `exact_ean_match` and strong `probable_product_match` should be shown to the buyer as external reference. `weak_match` and `conflict` should go to owner/admin review or data quality tasks, not confident buyer guidance.

## User-Facing Wording

When local data is missing:

```text
В карточке товара нет состава. Я могу использовать внешние источники как ориентир, но они могут отличаться от вашей упаковки. Для аллергий и halal всё равно лучше сверить маркировку на товаре.
```

When external data is used:

```text
По внешним данным, которые нужно считать менее надёжными, состав может быть таким: ... Проверьте упаковку перед покупкой.
```

When data is weak or conflicting:

```text
Я не нашёл достаточно надёжных внешних данных по этому товару. Лучше проверить состав и маркировку на упаковке.
```

## Storage Policy

Suggested V1 path:

1. Store enrichment output as reviewable candidates, not immediately trusted product facts.
2. Keep source URL/domain, fetched timestamp, lookup keys, confidence label, and normalized candidate fields.
3. Do not store buyer message text as enrichment evidence.
4. Allow owner/admin tooling to promote candidate facts into product data later.
5. Cache failed lookups briefly to avoid repeated cost on the same weak product.

## Product AI Integration

Product AI may show an external-reference note only when the server explicitly provides enrichment candidates. It should not browse or search by itself inside `/api/ai.js`.

The structured Product AI response should eventually add:

- `externalReference`: short lower-confidence fact summary;
- `externalConfidence`;
- `sourceLabel`;
- `needsPackageCheck: true`.

Same-store alternatives remain based on current store catalog only.

## Recommended Implementation Order

1. Add pure normalization tests for enrichment candidates.
2. Add an internal endpoint or job for exact EAN/name enrichment with mocked network in tests.
3. Store candidates in a reviewable table or file-backed/admin queue after DB design approval.
4. Surface explicit "external reference" wording in Product AI only after candidates exist.
5. Add cost/rate limits before any production use.

## Stage 12 Implementation Contract

Stage 12 added the pure contract module `src/domain/ai/enrichmentContract.js`. This is not a network implementation and must stay side-effect free.

The module owns these decisions:

- `classifyEnrichmentTrigger()` decides whether enrichment is allowed for a product/question pair.
- `buildEnrichmentRequest()` builds a precise lookup request from allowed product identifiers only: EAN, exact product name, brand, quantity, and manufacturer.
- `normalizeExternalCandidate()` classifies external candidates as `exact_ean_match`, `probable_product_match`, `weak_match`, `conflict`, or `not_found`.
- `canShowExternalCandidateToBuyer()` allows buyer-visible use only for strong non-conflicting candidates.
- `buildExternalReferenceNotice()` generates lower-confidence RU/KZ wording and always sets `needsPackageCheck: true`.

Current hard guarantees:

- No live network calls.
- No buyer message text is stored as enrichment evidence.
- Broad shopping requests are rejected.
- Strong local cards do not trigger enrichment.
- External candidates remain reviewable candidates, not trusted product facts.
- Weak/conflicting candidates are not buyer-visible.

## Stop Points

Ask the owner before:

- adding DB tables or migrations;
- enabling live network lookup;
- storing source data;
- showing external facts to buyers by default;
- using paid APIs or model calls for enrichment.
