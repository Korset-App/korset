# Product Submission & Photo Ingestion Pipeline

> Domain: knowledge
> Context: Scanning unknown barcodes, shopper photo submission, offline/AI ingestion to catalog.
> Command: `npm run submissions:process` (or `node scripts/process-submissions.mjs [--auto] [--dry-run]`)

## 1. Overview & Flow

When a shopper scans an unknown barcode in a store:
1. **Shopper Flow (`ProductSubmissionSheet.jsx`):**
   - Prompt to submit the new product.
   - Takes front photo and back/ingredients photo (compressed with client-side canvas to ~250-400 KB).
   - Uploads directly to Supabase Storage: bucket `public-assets`, path `submissions/<ean>/<timestamp>_<index>_<type>.jpg`.
   - Inserts row into `product_correction_events` with `status: 'new'`, `reason: 'other'`, `context: 'scan_result'`, `metadata_json: { photo_urls: [...], submission_type: 'new_product', price_kzt: ... }`.

2. **Ingestion & Catalog Processing (`scripts/process-submissions.mjs`):**
   - Fetches pending `product_correction_events` where `status = 'new'` and `metadata_json.photo_urls` is non-empty.
   - Runs Vision AI OCR (Gemini 2.0 Flash / OpenAI GPT-4o-mini / Azure OpenAI) to extract:
     - `name` (RU)
     - `name_kz` (KZ if visible)
     - `brand`
     - `category` (strictly mapped to one of the 18 Körset canonical categories)
     - `quantity` (weight / volume)
     - `ingredients_raw` & `ingredients_kz`
     - `nutriments` (calories, protein, fat, carbs)
     - `is_halal_certified`
   - Upserts product into `global_products` and links to `store_products` (with price if provided).
   - Sets event status to `'fixed'` with resolution details.

## 2. Running Ingestion

To process all pending submissions:
```bash
npm run submissions:process
# or with auto-apply:
node scripts/process-submissions.mjs --auto
# or dry-run:
node scripts/process-submissions.mjs --dry-run
```

## 3. Configuration & Costs

- Supported Vision Providers:
  - Google Gemini API (`GEMINI_API_KEY` in `.env.local` - free tier via Google AI Studio).
  - OpenAI / Azure OpenAI (`OPENAI_API_KEY`, `OPENAI_API_BASE_URL`, `OPENAI_VISION_MODEL`).
- Token consumption happens on the configured backend API provider (not inside agent conversation tokens).
