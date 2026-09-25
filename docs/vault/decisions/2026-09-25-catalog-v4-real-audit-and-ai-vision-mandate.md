# Catalog V4 Real Audit & AI Vision Quality Gate Mandate — Körset

> Status: APPROVED / MANDATORY INVARIANT  
> Date: 2026-09-25  
> Domain: Decisions / Catalog Architecture  

---

## 1. Context & The Critical Failures Uncovered

During the construction of Golden Master Catalog V4 across 58,648 Kazakhstan FMCG products, several critical defects and false assumptions were caught:

1. **Semeiniy.kz Photo Scraper Bug Fixed (Server IDs Were NOT Corrupted):**
   - The previous assumption that Webasyst CMS had internal ID corruption was incorrect.
   - Root Cause: `scripts/crawl-semeiniy.mjs` had a regex matching `html/products/images` (plural = recommendation carousel) instead of `html/product/images` (singular = hero product photo). Whenever a product lacked a photo or matched the carousel first, it grabbed whatever item was in the recommendation widget (e.g. Must Have muesli bar repeated on 7,606 items; Nescafe Gold coffee attached to Ariel capsules).
   - Real Reality: Across active storefront categories on `semeiniy.kz` (confectionery, bakery, dairy, beverages, grocery), **90–100% of products have authentic 700x700 studio packshots**.
   - **Resolution:** Semeiniy.kz is restored as a primary studio packshot source, extracted strictly via the singular selector (`html/product/images`) with `empty_photo.svg` filtered out, and passed through the AI Vision Quality Gate.

2. **The 58,000 Alternate Barcode Bug:**
   - A data preparation script mistakenly populated `p.alternate_eans = [p.ean, ...alts]`, putting the primary barcode into the alternate array for all 58,643 items.
   - **True Reality:** Filtering out self-referential primary EANs leaves **exactly 2,553 products** with genuine secondary factory packaging barcodes (separated by `;` in SKU). This bug was fixed on disk and in database.

3. **Artificial Scraping Bottlenecks in Previous Datasets:**
   - `data/v3_cache/arbuz_products.json` had only 2,089 items because legacy `arbuz-catalog-parser.cjs` queried only 50 hardcoded keyword searches (`limit=50`). Real Arbuz catalog has 15,000–25,000+ items.
   - `data/galmart_catalog.json` had only 2,859 items because `crawl-galmart.mjs` had an artificial page cap (`if (page > 20) break;`) and ignored nested subcategories.
   - `korzinavdom.kz` photos contain watermarks and must NEVER be used for product images.

4. **Flawed Text Matching in Early Pass:**
   - The initial consensus matcher required exact first-word string match (`pFirst === cFirst`) and dropped items with null brand, rejecting 95% of valid matches from Galmart and Arbuz.
   - An updated token/keyword matcher with brand detection correctly resolves 2,771 Galmart items (97%) and 1,725 Arbuz items (83%).

---

## 2. Mandatory Decisions & Rules

### Rule 1: Product Images Strategy & Spot-Check Verification
- Semeiniy.kz is the primary packshot backbone (~95%+ coverage). Extract all studio packshots directly from the product hero gallery (`html/product/images`), collecting all angles: primary front packshot (`image_url`) and gallery packshots (`images` array: front, back/composition, sides).
- Filter out `empty_photo.svg` and never match plural recommendation carousels (`html/products/images`).
- **Spot-Check Protocol:** The first 200 items across diverse categories are verified via AI Vision (Gemini / OpenAI Vision) to confirm 100% precision. If 200/200 match cleanly, mass ingestion proceeds directly without per-item AI overhead.
- AI Vision is mandatory when falling back to external sources (Galmart, Arbuz, KDV, OFF) with heuristic/fuzzy matching.
- **STRICTLY BANNED:** Zero photos from Korzina v Dom (watermarked).

### Rule 2: Image Source Hierarchy
1. **Semeiniy.kz Hero Packshots:** Primary source (95%+ expected coverage). 700x700 studio packshots extracted strictly via `html/product/images` (singular), multi-angle (front + back composition).
2. **External Fallbacks (For remaining <5%):** Galmart (white background), KDV Online (740x740), Arbuz, Open Food Facts — verified via AI Vision.
3. **STRICTLY BANNED:** Korzina v Dom (watermarks) and recommendation carousel widgets.

### Rule 3: Alternate EANs Invariant
- `alternate_eans` must NEVER contain the primary EAN.
- Only ~2,500 products in the catalog have genuine factory barcode redesigns.

### Rule 4: Catalog Scalability & RPC Performance
- `fn_get_store_catalog` must always use the covering index `idx_gp_cat_name_active` and push `p_limit` and `p_offset` down into SQL.
