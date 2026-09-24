# Multi-Source Catalog Pipeline Architecture — Körset

> Status: Active Standard  
> Date: 2026-09-24  
> Domain: Knowledge / Data Pipeline  

---

## 1. Core Philosophy & Big Picture

In previous catalog versions (V1–V3), development suffered from tunnel vision: trying to build complex AI matching schemes to map products from online stores with hidden barcodes (Arbuz) to dry government GTIN registries (National Catalog / НКТ) with 40M entries. This led to empty cards (e.g. Saryagash with null barcode), mismatched flavors (e.g. MacCoffee 3in1 mapped to condensed milk), and contaminated databases.

**The Golden Standard Pipeline flips the architecture:**
1. **Physical Supermarket First:** We take a live Kazakhstan supermarket chain where EAN-13 barcodes are openly exposed in the website product SKUs (`semeiniy.kz`).
2. **Barcode as Primary Key:** The GS1 EAN-13 string is a deterministic global primary key. Once in hand, merging data across all other retail sources produces ZERO barcode misattribution.
3. **Multi-Store Consensus:** We do not rely on a single store. We enrich each product card from the 8 major Kazakhstan grocery services + Open Food Facts + KDV.
4. **No Artificial Capping:** We do not restrict catalog size to 30,000. All valid FMCG products (estimated 40,000–60,000+) are captured.
5. **Zero Waste in Supabase:** The 500 MB database quota is preserved by backing up old legacy tables (`clean_products_v2/v3`, `product_ean_aliases`, dirty `global_products`) locally to disk and dropping/truncating them in Supabase (saving ~380 MB).

---

## 2. The 8 Kazakhstan Retail Sources

1. **Семейный (`semeiniy.kz`) — The Barcode Backbone:**
   - 69,220 total catalog URLs (Sitemaps 1–7).
   - 369 food categories.
   - Sku field exposes exact factory GS1 EAN-13 (often multiple barcodes separated by `;` for packaging redesigns — both are preserved!).
   - High-resolution studio packshots (700x700, no watermarks).
   - Packaging compositions in both Russian and Kazakh (`s-features-wrapper` and `s-product-desc`).
2. **Arbuz.kz:**
   - Largest online supermarket (Astana / Almaty).
   - Detailed marketing descriptions, usage instructions, KBZHU per 100g, and verified «Халал» badges.
3. **ВкусМарт (`vkusmart.vmv.kz`):**
   - Astana supermarket chain on 1C-Bitrix.
   - Strongest coverage of local dairy, fresh meats, bakery, and local ready-to-eat items.
4. **Астыкжан Экспресс (`astykzhan.kz`):**
   - Major hypermarket chain in Astana / Northern Kazakhstan.
   - Deep coverage of grains, pasta, flour, canned goods, and seasonings (Knorr, Maggi, Priprach).
5. **Clevermarket (`clevermarket.kz`):**
   - Astana grocery delivery. Local farm brands, artisanal foods, and regional dairy/meat producers.
6. **Galmart (`galmart.kz`):**
   - Premium supermarket chain in Astana and Almaty.
   - Ultra-high resolution studio packshots, premium imported goods, organic and gluten-free items.
7. **Interfood (`interfood.kz`):**
   - Premium supermarket chain specializing in direct European FMCG import to Kazakhstan (Germany, Italy, Switzerland, France).
8. **Дина Маркет (`dinamarket.kz`) и Корзина (`korzina.kz`):**
   - Major regional supermarket chains in Western and Central Kazakhstan.

### Supplementary Sources:
- **Open Food Facts (OFF API):**
  - Matched deterministically by exact EAN: `https://world.openfoodfacts.org/api/v2/product/{ean}.json`.
  - Extracted: KBZHU per 100g, Nutri-Score (quality rating A/B/C/D/E), Eco-score, verified allergen tags, food additives (E-numbers), and secondary back packshot (`back.webp`).
- **KDV Online (`data/kdv_catalog.json` / site):**
  - Factory compositions and nutrition for confectionery and snacks (Yashkino, Kiriyezhki, Bondi, Babyfox, O'Zera).
- **Halal Registries:**
  - Official Halal Damu (QMDB / ДУМК) and AHIK registries, combined with on-pack Halal markers from retail cards.

---

## 3. Data Invariants & Quality Gate

- **Barcodes:** Must pass GS1 Luhn mod-10 check. Never truncate semicolon-separated EANs; index all variants.
- **Images:** All images uploaded to Cloudflare R2 bucket (`https://cdn.korset.app/products/{ean}/front.webp`). No hotlinking to store CDNs. Never import watermarked images (`korzinavdom` watermarks are strict defect).
- **Compositions:** Authentic packaging text in RU and KZ. Never generate synthetic ingredients with an LLM.
- **Categories:** Strictly mapped to `src/domain/category/categoryMap.js` (18 core categories).

---

## 4. Fault Tolerance & Internet Resilience

Given unstable internet or system restarts:
- **Append-Only Streaming:** Raw products written line-by-line (`fsync`) to `data/semeiniy_raw_products.jsonl`.
- **Checkpointing:** `data/semeiniy_checkpoint.json` tracks processed URLs, batches, and transient errors.
- **Idempotent Resume:** On launch, the scraper loads already processed URLs into memory in O(1) time and continues from the exact next item without duplicate downloads.
- **Retry Mechanism:** Network failures (`ECONNRESET`, `ETIMEDOUT`) retry up to 3 times with exponential backoff before being scheduled for an end-of-run sweep.
