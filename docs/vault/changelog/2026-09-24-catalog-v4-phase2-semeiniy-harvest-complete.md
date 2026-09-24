# Catalog V4 Phase 2: Semeiniy Backbone Harvest Complete

**Date:** 2026-09-24  
**Status:** Completed  

---

### 1. Harvest Summary

- **Source:** Supermarket «Семейный» (`semeiniy.kz`)
- **Total Sitemap URLs Processed:** 68,465 (100% of all product cards across sitemaps 1–7)
- **Total Valid FMCG Products Harvested:** **58,671**
- **Unique Primary EANs:** **58,648**
- **Total Scannable EAN Barcodes (including semicolon variants):** **61,935**
- **Products with Semicolon-Separated Barcodes:** 2,557 (all revisions preserved)
- **Products with Multi-Angle Studio Packshots (700x700):** 19,098
- **Packaging Compositions Extracted:** 11,827 RU / 538 KZ
- **Network / 404 Errors:** 57 (0.08% failure rate, non-fatal)
- **Output File:** `data/semeiniy_raw_products.jsonl` (101.39 MB)
- **Checkpoint File:** `data/semeiniy_checkpoint.json`

### 2. Category Distribution (18 Standard Categories)

- `grocery` (Бакалея): 17,302
- `personal_care` (Гигиена и уход): 9,879
- `sweets` (Сладости): 5,747
- `household` (Для дома и бытовая химия): 5,342
- `dairy_eggs` (Молоко, сыр, яйца): 4,817
- `water_beverages` (Вода и напитки): 3,351
- `sauces_spices` (Соусы и приправы): 2,492
- `tea_coffee` (Чай и кофе): 2,309
- `baby_food` (Детское питание): 1,381
- `deli` (Колбасы и деликатесы): 1,193
- `fruits_veg` (Овощи и фрукты): 1,030
- `fish` (Рыба и морепродукты): 1,011
- `snacks` (Снеки и орехи): 762
- `bread` (Хлеб и выпечка): 568
- `healthy` (Здоровое питание): 561
- `frozen` (Заморозка): 452
- `meat` (Мясо и птица): 411
- `ready_meals` (Готовые блюда): 63

### 3. Exclusions Enforced

- Alcohol: 100% excluded (beer, wine, spirits), while beer snacks (chechel, nuts, dried fish) were retained in food categories.
- Tobacco, sticks, vapes: 100% excluded.
- Non-FMCG (cookware, appliances, clothing, party decor, garden pots): 100% excluded.
