---
title: Product Card Normalization Stage 9 Compare Readiness
date: 2026-05-24
domain: plans
status: completed
area: product
related: [[2026-05-23-product-card-normalization-professional-plan]] · [[product-comparison-engine]] · [[attribute-extraction]]
---

# Product Card Normalization Stage 9 Compare Readiness

Stage 9 defines which normalized product facts are ready for the future Compare workstream and which fields must remain internal or ignored for shopper-facing scoring.

This stage intentionally does not redesign `src/domain/product/comparison.js`. The current comparison engine remains a conservative deterministic layer for safety, halal, availability, data completeness, and direct price. Product scoring should be designed separately in the Compare workstream.

## Compare Can Trust

- `nutritionPer100`: canonical nutrition fields such as `kcal`, `protein`, `fat`, `carbs`, `sugar`, `salt`, `fiber`, `saturatedFat`, and `alcohol` when present.
- `ingredients` and `ingredientsKz`: normalized composition text suitable for safety and completeness checks.
- `allergens`, `dietTags`, `additives`, and `traces`: normalized safety and diet signals, with the existing Fit-Check safety contract still taking priority.
- `halalStatus`: normalized halal signal, while low-confidence assumptions should remain conservative.
- `fatPercent`: useful for dairy and other category-aware comparison rules.
- `flavor`: high-confidence extracted flavor only. `flavorMeta` may be used internally for QA and diagnostics, but medium/low confidence flavor must not be shown or scored as a shopper fact without a dedicated rule.
- `specs.storage` and `specs.bestBefore`: display-ready storage and shelf-life facts normalized from `specs_json` aliases.
- `manufacturer` and `country`: normalized product origin/manufacturer facts when present.
- `category`: normalized category key. Use raw `subcategory` only after cleaning or through the ProductScreen characteristic builder.
- `quantityParsed`: normalized quantity parse result. For visible and comparable unit price, prefer `buildProductUnitPrice(product)` over raw quantity math.
- `priceKzt`: direct store price, subject to existing tie thresholds and future category-aware value rules.
- `productScreenFull`: useful as a load-contract marker, not as a product quality score.

## Compare Should Not Trust Yet

- `qualityScore`, `sourceConfidence`, `sourceMeta`, data provenance, or completeness metadata as shopper-facing quality.
- `novaGroup`, `nutriscore`, and `packagingType` for ProductScreen or Compare scoring until there is a deliberate product decision and real-data QA.
- Raw technical category/subcategory labels from import sources.
- Medium/low confidence `flavorMeta` values as buyer-visible flavor facts.
- Generic nutrition comparisons across unrelated categories. Nutrition scoring must be category-aware.
- Current data completeness rank as a final recommendation driver. It can break ties or flag uncertainty, but it is not a quality score.

## Future Compare Implications

- The next Compare workstream should design an internal product score from stable facts, not expose a score on ProductScreen.
- Compare should avoid fake precision and fix weak `50/50` behavior by using category-aware tie handling and clear uncertainty states.
- Product safety remains the first-order criterion: allergy and halal risk should outrank nutrition, price, and completeness.
- Unit price should use the shared product-domain helper so Compare does not repeat misleading per-unit calculations.
- Flavor, fat percentage, storage, quantity, and category are now ready as inputs for explicit future rules, but each rule needs real-data QA before affecting a recommendation.

## Verification Baseline

- Stage 8 fixture/domain QA passed 24/24 on the real MARS/store-one sample fixture.
- Targeted normalization + Compare unit set passed 61/61:
  `tests/unit/productScreenData.test.mjs`, `tests/unit/productScreenSections.test.mjs`, `tests/unit/unitPrice.test.mjs`, `tests/unit/flavorExtraction.test.mjs`, `tests/unit/normalizers.test.mjs`, and `tests/unit/productComparison.test.mjs`.
- Targeted ESLint passed for affected product-domain and ProductScreen files.
- Documentation syntax check and memory save passed after the handoff docs were added.

## Residual Risks

- Browser/mobile ProductScreen smoke remains pending before pilot-ready signoff.
- Fresh live Supabase QA remains useful because fixture coverage is intentionally small.
- Future Compare scoring must be tested on same-category pairs first: dairy vs dairy, drinks vs drinks, snacks vs snacks, and only then broader cases.
