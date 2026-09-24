# Master Catalog V4 Execution & Handoff Plan — Körset

> Status: APPROVED / READY FOR FRESH CHAT EXECUTION  
> Date: 2026-09-24  
> Related Decisions: `docs/vault/decisions/2026-09-24-catalog-v3-image-and-ean-integrity-policy.md`  
> Architecture: `docs/vault/knowledge/2026-09-24-multi-source-catalog-pipeline-architecture.md`  

---

## 1. Executive Summary & Why We Are Here

Over three days of catalog building (V1–V3), development suffered from two critical pitfalls:
1. **Tunnel Vision on Incomplete Data:** We attempted to solve the problem of missing barcodes on Arbuz by building complex AI matching schemes to map products to dry government GTIN records (National Catalog / НКТ) with 40M entries. This led to empty cards (e.g. Saryagash) and mismatched flavors (e.g. MacCoffee 3in1 mapped to condensed milk).
2. **Ignoring the Obvious Source:** All along, Kazakhstan supermarket chain **«Семейный» (`semeiniy.kz`)** had real factory GS1 EAN-13 barcodes exposed directly in its product SKUs, accompanied by high-res 700x700 studio packshots and dual Russian/Kazakh compositions.

This document serves as the **complete, self-contained handoff specification** for the fresh agent session.

---

## 2. Key Discoveries from Live Probing (2026-09-24)

1. **Semicolon-Separated EANs (Scale > 90%):**
   - Probing revealed that many products on `semeiniy.kz` contain multiple EAN-13 barcodes separated by semicolons (e.g. `4870004908499;4870233466432` for ice cream). These represent packaging revisions by the factory.
   - Preserving both barcodes increases barcode coverage of factory FMCG goods to **>90%** (over 40,000–50,000+ items).
   - Only ~8% are store-internal 7-digit weighed PLUs (e.g. `2103734` for store-sliced sausages), which are cleanly filtered out via GS1 Luhn mod-10 checks.
2. **Dual-Language Compositions Already on Page:**
   - On `semeiniy.kz`, the `s-features-wrapper` table frequently contains the full authentic Kazakh composition (`Құрамы:...`), while the `s-product-desc` block contains the Russian composition (`Состав:...`). Both are extracted directly without synthetic machine translation.
3. **Database Disk Crisis (425 MB / 500 MB):**
   - Supabase free tier is 500 MB. Postgres currently uses ~425 MB (85% quota).
   - The breakdown:
     - `product_ean_aliases`: **184 MB** (142k rows of legacy quarantine from June 2026).
     - `global_products`: **123 MB** (20k rows of contaminated old data with 5.2k watermarks).
     - `vault_embeddings`: **43 MB** (HNSW vector index for project RAG).
     - `store_products`: **27 MB** (31k rows linking pilot stores to old global products).
     - `clean_products_v3`: **24 MB**.
     - `clean_products_v2`: **24 MB**.
   - **Cleanup Plan:** Back up `clean_products_v2/v3`, `product_ean_aliases`, `global_products`, and `store_products` to local files on disk in `data/archive/`. Then `TRUNCATE` / `DROP` them in Supabase.
   - **Result:** Reclaims **~380 MB**, dropping active DB size to **~45 MB** (over 450 MB free!).

---

## 3. The 8 Multi-Store Enrichment Sources

To guarantee rich, professional cards, we combine the barcode backbone with the 8 core Kazakhstan retail services:

1. **Семейный (`semeiniy.kz`):** Barcode backbone (EAN-13), primary title, 700x700 studio front photo, dual RU/KZ packaging text.
2. **Arbuz.kz:** Detailed descriptions, recipe/usage notes, KBZHU per 100g, and store «Халал» verification badges.
3. **ВкусМарт (`vkusmart.vmv.kz`):** Dairy, poultry, meat, bakery, local ready-to-eat foods.
4. **Астыкжан Экспресс (`astykzhan.kz`):** Seasonings, spices, grains, pasta, canned items.
5. **Clevermarket (`clevermarket.kz`):** Farm brands, local artisanal producers.
6. **Galmart (`galmart.kz`):** Premium European imports, studio photography, organic items.
7. **Interfood (`interfood.kz`):** Premium European grocery imports.
8. **Дина Маркет (`dinamarket.kz`) / Корзина (`korzina.kz`):** Regional supermarket coverage.

**Supplementary:**
- **Open Food Facts (OFF API):** Matched by exact EAN. Extracts: Nutri-Score, Eco-score, allergens, E-additives, KBZHU, secondary back packshot (`back.webp`).
- **KDV Online (`data/kdv_catalog.json`):** 100% factory compositions and nutrition for confectionery/snacks.
- **Halal Damu (QMDB) & AHIK Registries:** Formal certification verification.

---

## 4. Crash-Resilience & Fault Tolerance

Given unstable network connections:
- **Streaming Append-Only:** Write each product immediately to `data/semeiniy_raw_products.jsonl`.
- **State Tracking:** `data/semeiniy_checkpoint.json` records processed URLs, last batch, and retry list.
- **Instant Resume:** On restart, reads existing JSONL in <1 sec, skips processed URLs, and resumes smoothly.
- **Exponential Backoff:** Retries network timeouts 3 times before deferring URL to a final pass.

---

## 5. Execution Roadmap for Fresh Agent

### Phase 1: Local Backup & Supabase Cleanup (Freeing 380 MB)
1. Run export script to dump `clean_products_v2`, `clean_products_v3`, `product_ean_aliases`, `global_products`, and `store_products` to `data/archive/*.jsonl.gz`.
2. Truncate/drop those legacy tables in Supabase.
3. Verify Postgres disk size drops to ~45 MB.

### Phase 2: Semeiniy Backbone Scraping (40,000–60,000 Products)
1. Read sitemaps 2 through 7 from `semeiniy.kz`.
2. Run concurrent scraper (8–10 workers) with checkpointing and retry logic.
3. Extract: all EAN-13s (splitting `;`), title, category breadcrumbs, RU/KZ compositions, features, 700x700 image URL.
4. Filter out non-food using breadcrumbs and filter out 7-digit internal store PLUs. Keep all valid GS1 barcodes.
5. Save to `data/semeiniy_raw_products.jsonl`.

### Phase 3: Multi-Source Enrichment Engine
1. Query Open Food Facts by exact EAN for Nutri-Score, allergens, additives, KBZHU, back photos.
2. Join KDV Online catalog for confectionery.
3. Match against Arbuz / Galmart pre-indexed catalog files for enhanced descriptions and «Халал» badges.
4. Normalize categories to `src/domain/category/categoryMap.js`.

### Phase 4: Image Pipeline to Cloudflare R2
1. Download 700x700 packshots.
2. Convert to WebP format.
3. Upload to `https://cdn.korset.app/products/{ean}/front.webp` (and `back.webp` if available).

### Phase 5: Production Deployment & Store Re-Linking
1. Populate clean `global_products` table in Supabase.
2. Link the active catalog to the 4 pilot stores in `store_products` (`nurly`, `kalina`, `mars`, `bereke`).
3. Verify mobile scanning on real test products (Saryagash, Knorr, Toffifee, MacCoffee).

---

## 6. Anti-Patterns & Hard Invariants (DO NOT VIOLATE)

1. **NO TUNNEL VISION:** Never spend hours trying to fuzzy-match or invent AI bridges for missing barcodes when another store has them wide open.
2. **NO TRUNCATING VALID EANs:** Keep both barcodes when a product lists multiple EANs separated by semicolons.
3. **NO ARTIFICIAL CAPS:** Do not limit the catalog to 30k. Allow all 40k–60k+ valid FMCG items into the database.
4. **NO SYNTHETIC COMPOSITIONS:** Use only authentic packaging text from store cards or manufacturers.
5. **NO HOTLINKING:** All photos must be hosted on Cloudflare R2 (`https://cdn.korset.app`).
6. **NO WATERMARKS:** Watermarked photos (especially `korzinavdom`) are strict defects.
