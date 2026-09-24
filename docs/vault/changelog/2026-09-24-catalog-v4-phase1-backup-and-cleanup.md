# Catalog V4 Phase 1: Local Backup & Supabase Cleanup

**Date:** 2026-09-24  
**Status:** Completed  

---

### 1. Operations Completed

1. **Full Local Verified Backup:**
   - Created `scripts/archive-legacy-tables.mjs` streaming database rows in compressed gzip format to `data/archive/*.jsonl.gz`.
   - Verified 100% row count and archive integrity:
     - `clean_products_v2`: 11,386 rows (3.37 MB compressed)
     - `clean_products_v3`: 18,065 rows (4.52 MB compressed)
     - `product_ean_aliases`: 144,856 rows (12.72 MB compressed)
     - `store_products`: 31,166 rows (1.77 MB compressed)
     - `global_products`: 21,061 rows (10.45 MB compressed)
     - Dependent tables: `scan_events` (88), `user_favorites` (12), `product_correction_events` (31), `missing_products` (101), `external_product_cache` (15).

2. **Supabase Database Cleanup:**
   - `TRUNCATE TABLE scan_events, user_favorites, product_correction_events, missing_products, external_product_cache, unknown_ean_staging, product_matches, store_products, product_ean_aliases, global_products CASCADE;`
   - `DROP TABLE clean_products_v2, clean_products_v3 CASCADE;`
   - Executed `VACUUM ANALYZE;`.

3. **Storage Metrics Post-Cleanup:**
   - Supabase public tables size reduced from ~425 MB to ~45 MB.
   - Reclaimed **~380 MB** of database disk quota (>455 MB free out of 500 MB).
   - Removed dead fallback query in `src/domain/product/resolver.js`.
   - All 619 unit tests passing.
