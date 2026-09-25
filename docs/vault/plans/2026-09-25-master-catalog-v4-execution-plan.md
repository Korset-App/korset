# Master Catalog V4 Execution Plan — Körset FMCG Multi-Store Consensus

> Date: 2026-09-25  
> Status: APPROVED / ACTIVE ROADMAP  
> Target: 58,643+ Master FMCG Catalog for Kazakhstan Grocery Stores  
> Scope: 100% Packaging Parity (30 Packaging Attributes), AI Vision Quality Gate, Zero Fake Data  

---

## 1. Executive Summary & Root Cause Resolutions

### 1.1. Semeiniy.kz Studio Packshot Breakthrough
- **Previous False Assumption:** Webasyst CMS was assumed to have corrupted internal image IDs on the server (Ariel showing Nescafe Gold, waffles showing washing powder).
- **The True Reality Uncovered:** The website database is completely sound. The root cause was a one-letter typo in the legacy crawler regex:
  ```javascript
  // BUGGY: Matched plural carousel of recommendations
  html.match(/<!--\s*app:\s*shop;\s*template:\s*html\/products\/images\s*-->/i)
  ```
  This bypassed the actual product photo template (`html/product/images`) and grabbed whatever item was in the recommendation swiper widget at the bottom of the page (e.g., Must Have muesli bar repeated on 7,606 items; Nescafe Gold attached to Ariel).
- **Storefront Verification:** Across active store categories on `semeiniy.kz` (Confectionery, Dairy, Beverages, Grocery, Bakery), **90–100% of active products have authentic 700x700 studio packshots on pure white backgrounds**.
- **Action:** Re-extract photos strictly via singular hero selector `<!-- app: shop; template: html/product/images -->`, filtering out `empty_photo.svg`.

### 1.2. The 58,000 Alternate Barcode Bug (Resolved)
- Earlier scripts mistakenly populated `p.alternate_eans = [p.ean, ...alts]`.
- Filtering self-referential primary EANs leaves **exactly 2,553 products** with genuine secondary factory packaging barcodes (separated by `;` in SKU). Primary barcode is never duplicated.

### 1.3. Catalog Scalability & RPC Speedup (Resolved)
- Created covering index `idx_gp_cat_name_active` on `global_products(category, name) WHERE is_active = true`.
- Updated `fn_get_store_catalog` to accept `p_limit` and `p_offset`. Query latency reduced from 10,208 ms to 765 ms (13x speedup).

---

## 2. The 30 Mandatory Packaging Attributes Checklist

Every product in Körset Golden Master V4 strives for 100% packaging parity:

| # | Attribute | Description | Primary Sources |
|---|-----------|-------------|-----------------|
| 1 | `ean` | Valid GS1 EAN-13 primary barcode | Semeiniy, Galmart, KDV, Arbuz |
| 2 | `alternate_eans` | Genuine packaging redesign variants (no self-duplication) | Semeiniy (semi-colon SKUs) |
| 3 | `name` | Normalized commercial title (RU) | Semeiniy, Galmart, Arbuz |
| 4 | `name_kz` | Commercial title in Kazakh | Semeiniy, Galmart, Arbuz |
| 5 | `brand` | Verified brand name | Semeiniy, Galmart, KDV, Arbuz |
| 6 | `category` | Single source of truth from `categoryMap.js` (18 categories) | Körset Category Engine |
| 7 | `subcategory` | Granular department / subcategory | Semeiniy, Galmart, Vkusmart |
| 8 | `quantity` / `weight` | Net weight / volume with unit (e.g., 400 г, 1 л) | Semeiniy, Galmart, Arbuz |
| 9 | `ingredients_raw` | Full factory composition (RU) | Vkusmart, Galmart, KDV, Korzina |
| 10 | `ingredients_kz` | Full factory composition in Kazakh (Құрамы) | Semeiniy, Galmart, Korzina |
| 11 | `allergens_json` | Identified allergens array | OFF, Vkusmart, KDV, Composition Regex |
| 12 | `nutriments_json` | Calories, protein, fat, carbohydrates per 100g | KDV, Galmart, Korzina, Vkusmart |
| 13 | `salt_sugar_fat` | Saturated fats, sugars, salt per 100g | OFF, KDV, Galmart |
| 14 | `fat_percent` | Fat percentage (dairy, meat, cheese) | Title parser / Specs parser |
| 15 | `taste_flavor` | Specific flavor profile (e.g. вишня, карамель) | Title & Specs token extractor |
| 16 | `packaging_type` | Packaging material (пэт, ст/б, к/у, т/п, фольга) | Semeiniy specs, Galmart |
| 17 | `cooking_instructions` | Preparation / cooking method | Vkusmart, Galmart, Korzina |
| 18 | `shelf_life` | Expiration duration (e.g., 12 месяцев) | Semeiniy, Korzina, Galmart |
| 19 | `storage_conditions` | Temperature & humidity conditions | Semeiniy, Korzina, Galmart |
| 20 | `manufacturer` | Factory / manufacturer name | Semeiniy, Korzina, Galmart |
| 21 | `country_of_origin` | Production country (Казахстан, РФ, etc.) | Semeiniy, Korzina, Galmart |
| 22 | `halal_status` | Multi-signal status (`halal`, `not_halal`, `unknown`) | Store badges + QMDB/AHIK |
| 23 | `halal_certifier` | Certifying body (QMDB Halal Damu, AHIK, etc.) | Store tags, QMDB registry |
| 24 | `diet_tags_json` | Dietary tags (`vegan`, `keto_safe`, `sugar_free`) | Körset Tag Engine |
| 25 | `additives_tags_json` | Detected E-numbers array (e.g. `['E322', 'E471']`) | Open Food Facts, Composition regex |
| 26 | `nutriscore` | Nutri-Score grade (A, B, C, D, E) | Open Food Facts / Nutrition calculation |
| 27 | `nova_group` | NOVA food processing group (1 to 4) | Open Food Facts |
| 28 | `description` | Comprehensive product description | Semeiniy, Galmart, Vkusmart |
| 29 | `image_url` & `images` | Verified studio packshots (700x700, WebP on R2) | Semeiniy Hero, Galmart, KDV (AI Vision Gate) |
| 30 | `price_kzt` | Current retail price in Tenge | Semeiniy, Store POS, Arbuz |

---

## 3. Multi-Store Consensus Architecture (8 Core Sources)

Data enrichment follows the **Law of Non-Destructive Addition (Закон неразрушающего дополнения)**:
1. **Semeiniy.kz (Primary Skeleton):** GS1 EAN-13 barcodes, commercial names, Kazakh titles, categories, packaging types, and hero studio packshots (90-100% active coverage).
2. **Galmart.kz:** Clean white-background packshots, factory ingredients, and manufacturer data.
3. **Arbuz.kz:** Retail halal badges, organic/bio tags, and brand hierarchy.
4. **Vkusmart.kz:** Authentic full factory compositions in `itemprop="description"` across 135 food subcategories.
5. **KDV Online (kdvonline.kz):** Complete 428-product confectionery catalog (Yashkino, O'Zera, Bondi, Babyfox, Kiriezshki) with 100% accurate KBJU and 740x740 studio packshots.
6. **Korzina v Dom (korzinavdom.kz):** Ingest 5,605 products for composition, shelf life, storage conditions, and net weight. **ZERO PHOTOS** (banned due to watermarks).
7. **Open Food Facts:** Additives tags, Nutri-Score, NOVA group, and global user-verified packaging scans.
8. **Astykzhan / Interfood / Clevermarket:** Secondary consensus validation for regional SKUs.

---

## 4. Mandatory AI Vision Quality Gate

To prevent any visual mismatches:
- **Zero photos enter the catalog without AI Vision confirmation.**
- Candidate photos from Semeiniy, Galmart, KDV, Arbuz, or OFF are checked against the product title:
  - Input: Candidate Image URL + Product Name (`name`).
  - Model Prompt: *"Does this packaging photo depict the product '[Product Name]'? Check brand, flavor, and product type. Respond strictly with JSON: { match: boolean, reason: string }."*
  - If `match === true`: Photo is approved, converted to WebP, and staged for R2 upload.
  - If `match === false`: Photo is discarded, and the product falls back to next verified source or placeholder.

---

## 5. Execution Roadmap

### Phase 1: Semeiniy Hero Photo Re-Extraction
- Update `scripts/crawl-semeiniy.mjs` to target `html/product/images` (singular) and filter out `empty_photo.svg`.
- Run parallel re-fetch across the 58,643 active catalog URLs.
- Expected yield: **35,000–45,000 pristine 700x700 studio packshots**.

### Phase 2: Full-Scale Retail Crawling Without Caps
- **Arbuz:** Crawl the full category tree (not 50 search words) -> expect ~15,000+ items.
- **Galmart:** Remove 20-page cap and crawl all subcategories -> expect ~8,000+ items.
- **Vkusmart:** Harvest product pages from all 135 subcategories for compositions.

### Phase 3: AI Vision Validation & Deduplication
- Batch process candidate images through AI Vision Quality Gate.
- Deduplicate identical packshots across SKUs.

### Phase 4: Multi-Store Consensus Merge
- Run `scripts/multi-source-consensus-engine.mjs` with smart token matching and brand detection.
- Populate all 30 packaging attributes.

### Phase 5: Database Upsert & Store Synchronization
- Upsert enriched Master Catalog into Supabase `global_products`.
- Sync inventory for test store `MARS` (`store_products`).
