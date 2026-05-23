---
title: Product Card Normalization Stage 1 Audit
date: 2026-05-23
domain: plans
status: completed
area: product
related: [[2026-05-23-product-card-normalization-professional-plan]] · [[attribute-extraction]] · [[product-resolution]] · [[product-comparison-engine]]
---

# Product Card Normalization Stage 1 Audit

Stage 1 created the factual base for the professional ProductScreen/product normalization workstream.

## Artifacts

- Read-only Supabase audit script: `scripts/audit-product-card-normalization.cjs`.
- Generated real-data fixture: `tests/fixtures/product-card-normalization-samples.json`.
- Main plan: `docs/vault/plans/2026-05-23-product-card-normalization-professional-plan.md`.

The audit script is intentionally read-only. It loads MARS/store-one products from Supabase and writes a representative QA fixture when called with `--write`.

Run:

```bash
node scripts/audit-product-card-normalization.cjs --write --store=store-one
```

## Live Data Snapshot

Store: MARS (`store-one`).

Active products in store catalog: 10,222.

Coverage from the generated audit:

- Ingredients: 8,905.
- Description: 5,451.
- Any nutrition: 8,364.
- Full main nutrition: 6,289.
- Legacy nutrition key gap: 8,193.
- `energy_kcal`: 8,172.
- `protein_100g`: 6,972.
- `fat_100g`: 6,883.
- `carbohydrates_100g`: 7,405.
- Sugar/sugars: 145.
- Salt: 129.
- `specs_json.storage_conditions`: 2,175.
- `specs_json.storage`: 0.
- `fat_percent`: 1,158.
- `packaging_type`: 203.
- Nutrition label image: 0.
- Ingredients label image: 0.

## Main Findings

### 1. Nutrition Is Mostly Present, But The Contract Is Broken

The database often stores nutrition under Arbuz-style keys:

- `energy_kcal`
- `protein_100g`
- `fat_100g`
- `carbohydrates_100g`

Current rendering/normalization does not consistently support those keys:

- `src/domain/product/model.js::normalizeNutrition()` does not read `energy_kcal` or `protein_100g`.
- `src/components/product/NutritionUnified.jsx` does not read `energy_kcal` or `protein_100g`.
- `src/contexts/StoreContext.jsx::mapRowToProduct()` passes raw `nutriments_json` into `nutritionPer100` instead of normalized nutrition.

Impact:

- Calories and protein can disappear even when they exist in Supabase.
- Fat and carbohydrates appear more often because the UI already supports `fat_100g` and `carbohydrates_100g`.

### 2. Catalog RPC Is Newer Than The Old Assumption, But Frontend Mapping Is Still Incomplete

Old migration `029_catalog_bulk_rpc.sql` returned a thinner catalog row.

Migration `037_catalog_fit_fields.sql` already extended `fn_get_store_catalog` with:

- `ingredients_raw`
- `nutriments_json`
- `traces_json`

But `src/contexts/StoreContext.jsx::mapRpcRowToProduct()` still ignores those fields.

Impact:

- Catalog/offline products still enter the app without ingredients/nutrition/traces even though the RPC now returns them.
- ProductScreen usually triggers a full fetch because base catalog products look incomplete, but other flows that rely on catalog product objects may be weaker than necessary.

### 3. Full Product Fetch Exists, But Its Mapping Is Not Canonical Enough

`src/contexts/StoreContext.jsx::fetchFullProduct()` loads full product fields through PostgREST, including `description`, `ingredients_raw`, `nutriments_json`, `specs_json`, images, manufacturer, country, and internal quality fields.

However, full fetch maps `nutriments_json` directly:

```js
nutritionPer100: parseJson(gp.nutriments_json, {})
```

Impact:

- ProductScreen receives raw nutrition keys and depends on `NutritionUnified.jsx` aliases.
- Because `NutritionUnified.jsx` misses `energy_kcal` and `protein_100g`, full fetch still does not fully fix the KБЖУ display.

### 4. Storage Conditions Are In The Database Under `storage_conditions`

Live data has 2,175 products with `specs_json.storage_conditions`, but 0 with `specs_json.storage`.

Current normalized specs prefer `storage` only:

- `src/domain/product/model.js::normalizeSpecs()`
- `src/components/product/SpecsGrid.jsx`

Impact:

- Storage conditions are present but hidden in ProductScreen.

### 5. Flavor Needs A Dedicated Extraction Layer

Current `src/domain/product/attributeExtractor.js` extracts:

- packaging type;
- fat percentage;
- diet tags;
- halal hints.

It does not extract flavor.

The fixture now includes flavor candidates across dairy, drinks, sweets, snacks, and ambiguous products. This supports the owner decision: flavor should be extracted across the catalog, not only through a category whitelist.

### 6. Unit Price Needs Product-Domain Rules

Current `computePricePerUnit()` is purely mechanical:

- weight -> per 100 g;
- volume -> per 100 ml;
- pieces -> per unit.

ProductScreen and SpecsGrid both call it directly.

Impact:

- Unit price can appear in places where it looks strange or unhelpful.
- This should become a product-domain display decision, not just a math helper.

## QA Fixture Coverage

The generated fixture contains representative products for:

- full Arbuz-style nutrition keys;
- partial nutrition;
- no nutrition;
- ingredients without description;
- description plus ingredients;
- storage conditions mapping;
- fat percentage;
- packaging type as internal-only data;
- flavor candidates in dairy, drinks, sweets, snacks;
- no-flavor control;
- sugar/salt present;
- unit price review;
- yogurt/curd or dairy flavored candidates;
- milk/kefir/sour cream;
- drinks;
- sweets;
- snacks;
- ice cream;
- sauces/spices;
- dry grocery;
- ambiguous flavor control.

## Field Contract For Implementation

Normalize these database fields into the product object:

- `global_products.description` -> `product.description`
- `global_products.ingredients_raw` -> `product.ingredients`
- `global_products.ingredients_kz` -> `product.ingredientsKz`
- `global_products.nutriments_json.energy_kcal` -> `product.nutritionPer100.kcal`
- `global_products.nutriments_json.protein_100g` -> `product.nutritionPer100.protein`
- `global_products.nutriments_json.fat_100g` -> `product.nutritionPer100.fat`
- `global_products.nutriments_json.carbohydrates_100g` -> `product.nutritionPer100.carbs`
- `global_products.nutriments_json.sugars_100g` / `sugars` / `sugar` -> `product.nutritionPer100.sugar`
- `global_products.nutriments_json.salt_100g` / `salt` -> `product.nutritionPer100.salt`
- `global_products.specs_json.storage_conditions` -> `product.specs.storage`
- `global_products.fat_percent` -> `product.fatPercent`
- future flavor extraction -> `product.flavor` plus internal confidence metadata.

Keep these internal or hidden from ProductScreen:

- `packaging_type`
- `source_primary`
- `source_confidence`
- `data_quality_score`
- `is_verified`
- `needs_review`
- `nova_group`
- `nutriscore`

## Stage 2 Readiness

Stage 2 should start with failing tests around nutrition normalization:

- `energy_kcal` must normalize to `kcal`.
- `protein_100g` must normalize to `protein`.
- `fat_100g` must normalize to `fat`.
- `carbohydrates_100g` must normalize to `carbs`.
- sugar/salt should stay optional and hidden when absent.

Primary files for Stage 2:

- `src/domain/product/model.js`
- `src/domain/product/normalizers.js`
- `src/components/product/NutritionUnified.jsx`
- `src/contexts/StoreContext.jsx`
- `tests/unit/` new or existing product normalization tests.

