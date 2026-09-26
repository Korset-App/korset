# Phased Photo & Packaging Enrichment Roadmap

## Current Catalog State (Baseline)
- **Total Master Items:** 58,643 items (100% intact, immutable).
- **Phase 1 Complete:** 22,999 items enriched with verified Semeiniy studio packshots (55,131 image files, resolution 700x700, front + composition multi-angles, zero mixups).
- **Items Needing Studio Packshots:** 35,644 items.

---

## Strict Data & Quality Principles
1. **Zero Amateur / Crowd-sourced Photos:** Open Food Facts is strictly excluded from photo sourcing.
2. **Zero Watermarks:** Korzina v Dom is strictly excluded.
3. **Primary Live Sources:**
   - **Arbuz.kz Live API:** Dedicated professional photo studio, high-res WebP/JPG.
   - **Galmart Live API (`api.galmart.kz`):** Supermarket catalog studio packshots.
   - **KDV Online (`kdvonline.kz`):** Official manufacturer renders and packaging packshots.
4. **Mandatory AI Vision Gate:** Every candidate packshot is inspected by Gemini Vision (`gemini-flash-lite-latest`) before attaching. Required: `isMatch: true && confidence >= 0.85`.
5. **Non-Destructive Packaging Parity (30 Attributes):** 
   When a product is matched and verified, we simultaneously ingest:
   - Ingredients / Composition (`ingredients_raw`, `ingredients_kz`)
   - Nutritional Facts KBJU (`nutriments_json`: calories, protein, fat, carbs)
   - Shelf life & Storage conditions (`shelf_life`, `storage_conditions`)
   - Country of origin & Manufacturer (`country_of_origin`, `manufacturer`)
   - Halal marks (`halal_status`)
   - Packaging description

---

## Phased Execution Roadmap

### Phase 1: Semeiniy Studio Backbone (COMPLETED)
- **Scope:** Full harvest of 58,643 sitemap URLs with singular hero gallery filter.
- **Result:** 22,999 items enriched, 55,131 studio photos captured, 0 carousel leakage.

### Phase 2A: High-Velocity Grocery & Confectionery (First 5,000 items)
- **Categories:** 
  - Sweets & Chocolate (3,836 items)
  - Dairy & Cheese (1,164 items from top brands)
- **Sources:** Arbuz Live API + Galmart Live API + KDV Online.
- **Estimated Run Time:** ~45–60 minutes.
- **Verification:** 100% AI Vision inspection + simultaneous extraction of KBJU & Composition.

### Phase 2B: Beverages, Groceries & Condiments (~7,000 items)
- **Categories:**
  - Water & Soft Drinks (1,830 items)
  - Tea & Coffee (1,332 items)
  - Sauces & Spices (708 items)
  - Snacks & Chips (334 items)
  - Grocery, Pasta & Cereals (2,800 items)
- **Sources:** Arbuz Live API + Galmart Live API.
- **Estimated Run Time:** ~1.5 hours.

### Phase 2C: Household & Personal Care (~6,000 items)
- **Categories:**
  - Household cleaning & laundry (3,638 items)
  - Personal Care & Hygiene (2,500 items: shampoos, soaps, dental care)
- **Sources:** Arbuz Live API + Galmart Live API.
- **Estimated Run Time:** ~1.5 hours.

### Phase 2D: Long-Tail & Specialty (~17,000 items)
- **Categories:**
  - Deli & Sausages (883 items)
  - Fish & Seafood (567 items)
  - Fruits & Vegetables (492 items)
  - Bread & Bakery (274 items)
  - Frozen (308 items)
  - Regional & Discontinued Sitemap Archive.
- **Sources:** Multi-source consensus across remaining Kazakhstan retail sources.

---

## Checkpointing & Fault Tolerance
- All phases are append-only to `data/ai_vision_enrichment_log.jsonl`.
- Resumable from `data/ai_vision_checkpoint.json`.
- Master database is atomically updated with verified records.
