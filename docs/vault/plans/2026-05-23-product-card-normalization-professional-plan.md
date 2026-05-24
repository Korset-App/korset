---
title: Product Card Normalization Professional Plan
date: 2026-05-23
domain: plans
status: active
area: product
related: [[attribute-extraction]] · [[name-normalization]] · [[product-resolution]] · [[product-comparison-engine]] · [[controlled-product-enrichment]]
---

# Product Card Normalization Professional Plan

> **For agentic workers:** implement this in stages. Do not jump straight to Compare until product data normalization and ProductScreen behavior are stable on real catalog products.

**Goal:** turn ProductScreen and product normalization into a professional, data-aware product card foundation for Fit-Check, alternatives, AI, and future comparison.

**Architecture:** Product data should be normalized once into a stable product shape, then rendered conservatively. Missing data must be hidden in ProductScreen, not advertised as missing. Internal systems may keep data quality and completeness signals for AI, alternatives, and Compare, but shopper-facing product cards should look complete and intentional.

**Tech Stack:** React 18 + Vite, JavaScript, vanilla CSS, Supabase PostgreSQL/RPC, existing product domain modules, node:test, browser smoke checks.

---

## Owner Decisions Locked In

- Product normalization is its own major workstream, not a small transition step before Compare.
- ProductScreen must not show user-facing "data is missing" notes. If a section has no reliable data, hide it.
- ProductScreen should look professional and confident, while AI answers may honestly mention missing or incomplete facts when relevant.
- Show useful characteristics only: quantity/weight/volume/count, fat percentage, flavor, storage conditions, shelf life, manufacturer, country, contextually appropriate unit price, and clean human-readable subcategory.
- Do not show: packaging type, data source, data quality/completeness, NOVA group, Nutri-Score, technical category/subcategory codes, or product scoring in ProductScreen.
- Flavor must not be limited to a fixed category whitelist. It should be detected across the full grocery catalog when the product name genuinely contains a flavor.
- Flavor extraction should use confidence. High-confidence flavor is shown; low-confidence or ambiguous extraction is hidden.
- Packaging type may remain an internal attribute, but it must not appear in ProductScreen characteristics.
- Product scoring for Compare should be designed during the Compare workstream. This normalization workstream should prepare clean inputs for that future score, not expose a public score.

## Communication Rule For Future Agents

The owner does not want unexplained code terms. Use human language first and include the original technical term in parentheses when needed.

Examples:

- "единый формат данных (canonical shape)"
- "обратное заполнение старых товаров (backfill)"
- "уверенность извлечения (confidence)"
- "источник данных (provenance)"
- "лёгкий запрос каталога (catalog RPC)"

## Current Findings From Audit

Live Supabase and code inspection found that many "missing" product facts are actually mapping and normalization problems.

Catalog counts from the active audit:

- `global_products` active total: 11,535.
- MARS/store-one active catalog: 10,222.

MARS/store-one active coverage:

- Ingredients: 8,905.
- Description: 5,451.
- Any nutrition: 8,266.
- `energy_kcal`: 8,172.
- `protein_100g`: 6,972.
- `fat_100g`: 6,883.
- `carbohydrates_100g`: 7,405.
- Sugar/sugars: 51.
- Salt: 32.
- `specs_json.storage_conditions`: 2,175.
- `specs_json.storage`: 0.

All active products:

- Ingredients: 9,859.
- Description: 5,451.
- Any nutrition: 9,019.
- `energy_kcal`: 8,925.
- `protein_100g`: 7,678.
- `fat_100g`: 7,591.
- `carbohydrates_100g`: 8,141.
- Sugar/sugars: 51.
- Salt: 32.
- `storage_conditions`: 3,068.

Image facts:

- `image_ingredients_url`: 0.
- `image_nutrition_url`: 0.
- `image_url`: 11,482.
- `images` array: 134.

Conclusion: nutrition-table photos and ingredient photos effectively do not exist in the current database, so ProductScreen should not add an image-based composition/nutrition section.

## Root Problems To Fix

### Nutrition Key Mismatch

Parsers store nutrition under keys such as `energy_kcal`, `protein_100g`, `fat_100g`, and `carbohydrates_100g`.

Current UI/domain code often expects keys such as `kcal`, `calories`, `energy-kcal_100g`, `energy_kcal_100g`, `protein`, `proteins_100g`, `fat`, `fat_100g`, `carbs`, and `carbohydrates_100g`.

This is why fats and carbohydrates can appear while calories and protein disappear. It is mostly a data contract issue, not true absence of nutrition data.

Known files:

- `src/components/product/NutritionUnified.jsx`
- `src/domain/product/model.js`
- `src/screens/ProductScreen.jsx`
- `src/contexts/StoreContext.jsx`

### Product Card May Start From A Thin Catalog Product

`fn_get_store_catalog` from `supabase/migrations/029_catalog_bulk_rpc.sql` is a lightweight catalog RPC. It does not return all full product fields: `description`, `ingredients_raw`, `nutriments_json`, `specs_json`, or nutrition/ingredient image fields.

`ProductScreen` has full-fetch logic, but the full product path still needs consistent normalization after fetch.

Known files:

- `src/screens/ProductScreen.jsx`
- `src/contexts/StoreContext.jsx`
- `src/domain/product/model.js`
- `supabase/migrations/029_catalog_bulk_rpc.sql`

### Storage Conditions Are Stored Under A Different Name

The database has `specs_json.storage_conditions`, while ProductScreen/spec rendering currently expects fields such as `specs.storage`.

Known files:

- `src/components/product/SpecsGrid.jsx`
- `src/domain/product/model.js`
- `src/domain/product/normalizers.js`

### Flavor Is Not A First-Class Attribute Yet

`attributeExtractor` currently handles packaging, fat percentage, diet tags, and halal upgrades, but not flavor.

Known files:

- `src/domain/product/attributeExtractor.js`
- `src/domain/product/normalizers.js`
- `src/domain/product/model.js`
- `docs/vault/architecture/attribute-extraction.md`
- `docs/vault/architecture/name-normalization.md`

### Unit Price Visibility Is Too Mechanical

Current unit-price display can look inappropriate on products where "price per 100 g/ml" is not useful to a shopper. This needs product-aware visibility rules.

Known files to inspect during implementation:

- `src/screens/ProductScreen.jsx`
- `src/components/product/SpecsGrid.jsx`
- `src/utils/parseQuantity.js`
- product price/unit helpers found by targeted search.

## Non-Goals

- Do not implement Compare scoring in this workstream.
- Do not expose a public product score on ProductScreen.
- Do not launch a large internet enrichment project for sugar/salt now.
- Do not add nutrition/ingredients image display unless real image data exists.
- Do not show packaging type in ProductScreen.
- Do not show data quality/source/NOVA/Nutri-Score in ProductScreen.
- Do not redesign the entire ProductScreen without owner approval.

## Enrichment Position

The best immediate return is to fix already available data, not to scrape new data.

Recommended order:

1. Normalize existing nutrition keys.
2. Normalize existing `storage_conditions`.
3. Add robust flavor extraction from product names.
4. Verify on real catalog samples.
5. Only then consider separate enrichment.

External enrichment options:

- Open Food Facts by EAN may help some imported products, but coverage and local Kazakhstan catalog quality will be uneven.
- OCR is not useful now because nutrition/ingredient label images are effectively absent.
- USDA is not suitable as a main source for packaged local grocery products.
- National Product Catalog can help EAN identity and attributes in some cases, but not reliably complete nutrition.

## Stage Plan

Stage 1 status: completed on 2026-05-23. Details: `docs/vault/plans/2026-05-23-product-card-normalization-stage1-audit.md`.

Stage 2 status: completed on 2026-05-23. Details: `docs/vault/changelog/2026-05-23-product-card-normalization-stage2.md`.

Stage 3 status: completed on 2026-05-23. Details: `docs/vault/changelog/2026-05-23-product-card-normalization-stage3.md`.

Stage 4 status: completed on 2026-05-23. Details: `docs/vault/changelog/2026-05-23-product-card-normalization-stage4.md`.

Stage 5 status: completed on 2026-05-23. Details: `docs/vault/changelog/2026-05-23-product-card-normalization-stage5.md`.

Stage 6 status: completed on 2026-05-23. Details: `docs/vault/changelog/2026-05-23-product-card-normalization-stage6.md`.

Stage 7 status: completed on 2026-05-23. Details: `docs/vault/changelog/2026-05-23-product-card-normalization-stage7.md`.

Stage 8 status: completed on 2026-05-24. Details: `docs/vault/plans/2026-05-24-product-card-normalization-stage8-qa.md` and `docs/vault/changelog/2026-05-24-product-card-normalization-stage8.md`.

Stage 9 status: completed on 2026-05-24. Details: `docs/vault/plans/2026-05-24-product-card-normalization-stage9-compare-readiness.md` and `docs/vault/changelog/2026-05-24-product-card-normalization-stage9.md`.

### Stage 1: Data Contract Audit And Sample Set

Goal: create a precise product data map and a real-product QA set before changing behavior.

Tasks:

- Confirm all product fields used by ProductScreen, alternatives, AI, and Compare.
- Build a sample list from real store-one/MARS products: yogurts, curd snacks, milk/kefir/sour cream, drinks, sweets, chips/snacks, ice cream, sauces, dry grocery, products with no flavor, and ambiguous marketing names.
- Record expected visible sections for each sample.
- Record expected hidden sections for missing or low-confidence data.

Expected outcome: a durable QA fixture or script and a field map: database field -> normalized product field -> ProductScreen display.

### Stage 2: Canonical Nutrition Normalization

Goal: calories, protein, fat, and carbohydrates should display consistently when present.

Tasks:

- Update `normalizeNutrition()` and related product mappers to accept Arbuz keys and existing UI aliases.
- Make `NutritionUnified` read the normalized product shape first.
- Hide sugar/salt rows when absent.
- Add unit tests for Arbuz-style nutrition keys.

Expected outcome: existing database nutrition appears correctly without new parsing, and missing sugar/salt does not create an empty or weak-looking card.

Implementation note: completed. `normalizeNutrition()` now maps Arbuz keys to canonical product keys, ProductScreen full fetch and catalog RPC mapping normalize `nutriments_json`, and Fit-Check handles raw `protein_100g` defensively.

### Stage 3: Full Product Loading Contract

Goal: ProductScreen must reliably render full product data, even when entered from a lightweight catalog card.

Tasks:

- Trace ProductScreen entry from catalog, scan, history, alternatives, and compare.
- Ensure full fetch is used when the product object lacks description, ingredients, nutrition, or specs.
- Ensure full fetch results pass through the same normalization path.
- Default recommendation: keep catalog RPC thin for performance and make ProductScreen full-fetch reliable.
- Add tests or a targeted smoke check for catalog -> product card.

Expected outcome: product cards stop depending on whether the route was opened from catalog, scan, or direct URL.

Implementation note: completed. ProductScreen product selection and fetch decisions now live in `src/domain/product/productScreenData.js`, stale route-state/full products are ignored, and full fetch results are marked with `productScreenFull: true`.

### Stage 4: Product Specs Normalization

Goal: Product characteristics should be clean, useful, and not expose internal noise.

Tasks:

- Normalize `storage_conditions` into a display-ready storage field.
- Normalize best-before/shelf-life fields if present.
- Normalize manufacturer and country if available.
- Keep packaging type internal only.
- Keep source/data-quality/NOVA/Nutri-Score internal only.
- Show human-readable subcategory only if it is clean and useful.
- Add tests for storage and hidden-field behavior.

Expected outcome: ProductScreen characteristics stop showing random sparse fields and start showing useful facts.

Implementation note: completed. ProductScreen characteristics now use a tested product-domain builder, `storage_conditions` and shelf-life aliases are normalized, country is exposed as a normalized product field, and internal-only fields remain hidden from the shopper-facing card.

### Stage 5: Flavor Extraction

Goal: add product-wide flavor detection without limiting it to a narrow category whitelist.

Recommended approach:

- Add a flavor dictionary with RU/KZ/Latin variants where current catalog names require them.
- Support simple and compound flavors, including fruit, dessert, dairy, snack, drink, and savory flavors found in real samples.
- Use stop words and context rules to avoid confusing brand/line/product type with flavor.
- Assign confidence: high, medium, low.
- Show only high-confidence flavor in ProductScreen.
- Keep medium/low confidence internal for QA review only.

Important limitation: fully perfect flavor extraction is not possible using deterministic code because product names are messy and ambiguous. The professional solution is conservative extraction plus QA, not blind display.

Expected outcome: ProductScreen shows "Вкус" for genuinely flavored products across categories, and products without flavor do not get fake flavor rows.

Implementation note: completed. Runtime flavor extraction now lives in `src/domain/product/attributeExtractor.js`; normalized products keep `flavorMeta`, and only high-confidence flavor is exposed as shopper-visible `product.flavor`. No database backfill was added.

### Stage 6: Unit Price Visibility Rules

Goal: show "price per 100 g/ml/unit" only when it helps shoppers compare products.

Recommended rules:

- Show per 100 g/ml for common comparable grocery products when weight/volume is reliable.
- Prefer per 100 ml for liquids and drinks.
- Prefer per 100 g for packaged solid foods.
- Use per unit only when count is reliable and unit comparison is meaningful.
- Hide unit price when quantity is missing or ambiguous, product is mostly sold as a single functional item, calculated unit price looks misleading, or product category/packaging makes the metric visually strange.

Needs real-product QA before finalizing: spices, gum/candy small packs, eggs, multipacks, bakery items, frozen semi-finished products, tea bags, capsules/sachets, and any non-grocery items that appear in store data.

Expected outcome: unit price feels intentional instead of mechanically repeated everywhere.

Implementation note: completed. Product-aware unit-price visibility now lives in `src/domain/product/unitPrice.js`; ProductScreen and SpecsGrid use the same helper.

### Stage 7: ProductScreen Composition And Visual Order

Goal: assemble the normalized facts into a professional, calm product card.

Recommended visible order:

1. Product image, name, brand/store price.
2. Key facts.
3. Nutrition per 100 g/ml.
4. Ingredients.
5. Characteristics.
6. Description.
7. Storage/shelf-life details if available and not already shown.

Constraints:

- No visible blocks for missing sections.
- No data-source or data-quality badges.
- Flavor belongs inside characteristics, not as a loud standalone block.
- Keep both dark and light theme quality.
- Use i18n for new user-facing text.

Expected outcome: ProductScreen feels complete because it shows the best available facts in a coherent order.

Implementation note: completed. ProductScreen section visibility/order now lives in `src/domain/product/productScreenSections.js`; visible sections render as nutrition, ingredients, characteristics, then description, with empty characteristics hidden.

### Stage 8: Real Catalog QA And Manual Review

Goal: validate against real messy products before declaring the normalization professional.

Tasks:

- Run sample QA from Stage 1.
- Review products with full nutrition, partial nutrition, no nutrition, ingredients only, storage conditions, flavor, no flavor, ambiguous flavor, and problematic unit price.
- Produce a small report with false positives and false negatives.
- Adjust flavor and unit-price rules.

Expected outcome: normalization is tuned on the actual Kazakhstan grocery catalog, not just synthetic examples.

Implementation note: completed at fixture/domain QA level. Stage 1 real MARS/store-one fixture passed 24/24 with 0 contract issues. Flavor extraction was tuned for simple compound flavors and one real multi-word savory flavor. Browser/mobile smoke and fresh live Supabase QA remain useful before pilot-ready signoff.

### Stage 9: Compare Readiness Handoff

Goal: prepare clean inputs for the future Compare workstream.

Do now:

- Ensure normalized nutrition is reliable.
- Ensure flavor/fat/storage/quantity/category fields are available internally.
- Preserve completeness signals internally.
- Document what Compare can safely trust.

Do later in Compare:

- Design internal product score.
- Decide if score is visible in Compare.
- Fix 50/50 comparison behavior.
- Build category-aware scoring and final recommendation logic.

Expected outcome: the future Compare session starts from stable product facts instead of trying to compensate for broken cards.

Implementation note: completed as a handoff contract. The future Compare workstream can trust canonical nutrition, ingredients, allergens, halal status, fat percentage, high-confidence flavor, storage, shelf life, manufacturer, country, normalized category, parsed quantity, shared unit-price helper output, and direct price. Data source, data quality, raw technical categories, NOVA group, Nutri-Score, packaging type, low/medium confidence flavor, and generic completeness score remain internal/non-scoring until a dedicated Compare design approves them.

## Verification Strategy

Minimum checks after code implementation:

- Unit tests for nutrition key normalization.
- Unit tests for flavor extraction high/medium/low confidence.
- Unit tests for storage conditions mapping.
- Unit tests for unit-price visibility rules.
- `node scripts/check-i18n.mjs` if any visible text changes.
- `npm run lint`.
- `npm run build`.
- Browser smoke checks on mobile viewport for representative ProductScreen routes.

Recommended live-data QA:

- Use store-one/MARS sample set.
- Compare before/after ProductScreen facts for at least 30 products.
- Include at least 10 flavored products and 10 non-flavored products.
- Include at least 10 products where unit price is currently inappropriate.

## Open Follow-Up For Implementation Session

- Build the exact sample EAN list from Supabase before coding.
- Decide whether unit-price rules should be pure frontend logic or normalized product-domain logic. Recommendation: product-domain logic, because alternatives and Compare may reuse it later.
- Decide whether extracted flavor should be persisted to the database through a backfill or computed at runtime first. Recommendation: start runtime/domain-level, then persist only after QA proves quality.
