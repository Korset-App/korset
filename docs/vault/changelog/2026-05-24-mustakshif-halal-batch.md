# Mustakshif Batch and Source Evaluation — 2026-05-24

## Goal
Evaluate ALL available public halal data sources for bulk EAN-level halal checking, then execute the best option.

## Mustakshif.com — Final Verdict

### Method
- URL: `https://www.mustakshif.com/product/detail/{ean}`
- Parse `<title>` tag:
  - `"is Halal"` → `yes`
  - `"is not Halal"` → `no`
  - `"List of Products"` → `not_found`
- No slug needed; bare EAN works for known products
- Laravel + React hybrid (not Next.js); `/<title>` is server-rendered

### Test Results (50 KZ/RU barcodes)
- **Hit rate: 10%** (5/50 found)
- Found only global brands: Lays (no), Choco Pie (no), Albeni (no), Greenfield tea (yes), ХрусTeam (no)
- KZ barcodes (487xxx): ~3% hit rate
- RU barcodes (460/469xxx): ~27% hit rate
- Sitemaps (7 × 10K products) contain only US/AU barcodes — no KZ products

### Projection for ~11,862 unknown products
- Estimated ~1,200 found (~10%)
- ~10,500 remain unknown
- Will raise coverage from 5.7% to ~16%

### Sitemap Discovery
- robots.txt reveals 7 product sitemaps
- Each contains ~10K product URLs with barcodes and slugs
- But only US/Australian products (001xxx, 93xxx prefixes)
- Uses 3 statuses: permissible (halal), mushbooh (doubtful), haram

## Other Sources Evaluated

### HalalDamu Telegram Bot (@halaldamu_bot)
- NEW bot launched March 2026 with built-in AI
- Can search certified enterprises
- **Cannot automate:** no public API token; would need Telegram MTProto simulation
- Not practical for bulk

### Halal Guide KZ Mobile App
- Official HalalDamu app (50K+ downloads, last updated Feb 2026)
- Features: E-additive directory, certified places map, certificate verification
- **Company-level data only** — no EAN/product lookup
- Same data as halaldamu.kz website (already scraped)

### HalalDamu Registry (1,130 companies) + AHIK Registry (668 companies)
- Already scraped. Data is at enterprise level, not product/EAN level
- Brand cross-referencing → 9 exact matches, many false positives
- No way to determine which specific products from a certified company are halal

### Open Food Facts
- Tested: 0.2% match rate for KZ/RU halal products
- Negligible coverage

## Conclusion for V1
- Best realistic halal coverage: ~15-20% through combination of:
  - Mustakshif batch (~1,200, ~10%)
  - Name/ingredient analysis (already done: 76 → no)
  - Brand whitelist (9 exact matches)
- ~84% will remain `unknown` with no viable source
- AI should handle this gracefully with confidence ladder
- Real solution requires partnership with HalalDamu or GS1 KZ for API access

## Files Changed
- `scripts/mustakshif-halal-check.cjs` — batch checker (paginated)
- `data/` (no new files yet, batch pending)
