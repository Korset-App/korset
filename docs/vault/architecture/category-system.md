# Category Normalization System

> Связи: [[attribute-extraction]] · [[name-normalization]] · [[data-moat-pipeline-strategy]] · [[2026-05-05-catalog-showcase-redesign]]

## Overview

All 7046 active products in `global_products` are classified into **18 categories** with **~85 subcategories** using stable English keys stored in DB. Russian/Kazakh labels are rendered at display time via `getCategoryLabel(key, lang)`.

## 18 Category Keys

| Key | RU | KZ |
|-----|----|----|
| dairy_eggs | Молочные продукты и яйца | Сүт өнімдері және жұмыртқа |
| meat | Мясо и птица | Ет және құс |
| deli | Колбасы и деликатесы | Шұжықтар және деликатестер |
| fish | Рыба и морепродукты | Балық және теңіз өнімдері |
| water_beverages | Вода и напитки | Су және сусындар |
| tea_coffee | Чай и кофе | Шай және кофе |
| sweets | Сладости | Тәттілер |
| snacks | Снеки | Снекилер |
| grocery | Бакалея | Бакалея |
| sauces_spices | Соусы и специи | Соустар және дәмдеуіштер |
| bread | Хлеб и выпечка | Нан өнімдері |
| frozen | Замороженное | Мұздатылған |
| fruits_veg | Фрукты и овощи | Жемістер және көкөністер |
| baby_food | Детское питание | Сәби тағамдары |
| ready_meals | Готовые блюда | Дайын тағамдар |
| healthy | Полезное питание | Пайдалы тағамдар |
| personal_care | Гигиена и уход | Гигиена және күтім |
| household | Для дома | Үйге арналған |

## Core File: `src/domain/product/categoryMap.js`

### Key Exports

- `CATEGORIES` — hierarchy with ru/kz labels + subcategories
- `RAW_CATEGORY_MAP` — ~170 Russian raw category strings → {category, subcategory}
- `RAW_SUBCATEGORY_MAP` — ~90 Russian raw subcategory strings → {subcategory}
- `NAME_KEYWORDS` — ~280 keyword rules for classifyByName()
- `VALID_CATEGORIES` — Set of 18 valid category keys (short-circuit for already-normalized)
- `GENERIC_CATEGORIES` — Set of generic OFC keys that need refinement (grocery, snacks, etc.)
- `normalizeCategory(rawCategory, rawSubcategory, name, brand)` — main entry point
- `classifyByName(name, brand)` — keyword-based classification
- `getCategoryLabel(key, lang)` — display label
- `getSubcategoryLabel(catKey, subKey, lang)` — subcategory display label
- `getAllCategoryKeys()` — returns 18 keys

### Algorithm (3-pass)

1. **Direct map**: rawCategory in RAW_CATEGORY_MAP → exact match
2. **Name keywords**: classifyByName scans name for keywords (~280 rules)
3. **Fallback**: `{category: 'grocery', subcategory: null}`

### Already-normalized short-circuit

If `rawCategory` is in `VALID_CATEGORIES` (one of the 18 keys), `normalizeCategory` returns it immediately with the provided subcategory — no re-classification.

## Pipeline Integration

All import scripts use `normalizeCategory()` via dynamic import:

```js
const { normalizeCategory } = await import('../src/domain/product/categoryMap.js')
const norm = normalizeCategory(rawCategory, rawSubcategory, name, brand)
// norm = { category: 'dairy_eggs', subcategory: 'cheese' }
```

Scripts updated:
- `scripts/arbuz-import.cjs` — removed ARBUZ_CATEGORY_MAP
- `scripts/arbuz-catalog-parser.cjs` — category + subcategory from normalizeCategory
- `scripts/korzinavdom-parser.cjs` — category + subcategory from catalogPath

## DB Schema

- `category` — one of 18 valid keys (CHECK constraint)
- `subcategory` — string key matching CATEGORIES[key].subcategories
- `category_raw` — original value preserved for audit
- `subcategory_raw` — original value preserved for audit

## Migration

`supabase/migrations/022_category_normalization.sql`:
1. ALTER TABLE: add category_raw, subcategory_raw columns
2. UPDATE: copy category → category_raw, subcategory → subcategory_raw
3. ALTER TABLE: add CHECK constraint on category (18 valid keys)
4. CREATE INDEX: idx_global_products_category

## Normalize Script

`scripts/normalize-categories.mjs`:
- `--dry-run`: reports without writing
- `--live`: updates all products, deactivates alcohol/non-food
- 3-pass: direct map → name keywords → fallback
- JSON report: `data/audit/category-normalization.json`

## Deprecated

`scripts/add-category-prefix.cjs` — old approach (prepending Russian category to product name) replaced by categoryMap.js
