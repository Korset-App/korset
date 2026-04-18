# EAN/Barcode Lookup Methods — Comprehensive Research 2026-04-18

> Full investigation of ALL methods to find EAN codes for KZ-market products.
> Priority: finding EAN for products that only have name+brand (reverse lookup).

---

## CATEGORY 1: BARCODE/EAN LOOKUP APIs & DATABASES

### 1.1 EAN-DB (ean-db.com) ⭐⭐⭐⭐⭐ — BEST FOR KÖRSET

| Field | Value |
|-------|-------|
| **URL** | https://ean-db.com |
| **DB Size** | 69.4M products |
| **API** | ✅ REST API v2, JWT auth, Swagger playground |
| **Free Tier** | 250 requests on signup |
| **Pricing** | 5K for 9 EUR · 50K for 69 EUR · 300K for 249 EUR |
| **Bulk/Dumps** | 0.005 EUR/barcode by prefix/category/country |
| **Rate Limit** | No documented rate limit, 99.99% <0.1s |
| **Data Quality** | Clean, deduplicated from hundreds of sources |
| **Russian Coverage** | 13.9M products with Russian titles (#2 after English) |
| **Food Metadata** | ✅ ingredients (E-additives, vegan/veg) · nutriScore (790K) · КБЖУ per 100g (1.3M) |
| **Categories** | 52% categorized (Google product taxonomy) |
| **Manufacturers** | 85% have manufacturer, 22% identified with Wikidata |
| **Images** | 39% have images |
| **KZ Coverage** | 487-prefix exists. Can buy full dump of 487-prefix barcodes |
| **Reverse Search** | ❌ No name→EAN search (only barcode→product) |
| **Legal** | Fully legal, commercial service |

**VERDICT:** Best API for EAN→product enrichment. 13.9M Russian titles + food metadata with ingredients/КБЖУ. BUY a 487-prefix dump for all KZ barcodes. Use API for real-time lookups when user scans.

---

### 1.2 EAN-Search.org ⭐⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://ean-search.org |
| **DB Size** | 1.1 billion products (largest claimed) |
| **API** | ✅ REST API, XML/JSON, OpenAPI/Swagger spec |
| **Free Tier** | Trial: 100 queries/month for 1 EUR first month, then 9 EUR |
| **Pricing** | Pro: 5K/19EUR · Bronze: 50K/39EUR · Silver: 150K/99EUR · Gold: 300K/149EUR |
| **Features** | Search by EAN, name, prefix (e.g. 0885909*), Excel assistant, MCP server for AI |
| **Reverse Search** | ✅ Search by product name! Can search "Milka chocolate" → get EANs |
| **Rate Limit** | Per plan monthly limit |
| **KZ Coverage** | Unknown — likely similar coverage as other global DBs |
| **Legal** | Fully legal, commercial service |

**VERDICT:** Only major API with **name→EAN reverse search**. This is CRITICAL for the enrichment pipeline (we have product names from Kaspi, need EANs). The prefix search (e.g. `460*` for Russia) is also unique. Worth getting at least Trial to test KZ/RU coverage.

---

### 1.3 Go-UPC ⭐⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://go-upc.com |
| **DB Size** | 500M+ unique items claimed |
| **API** | ✅ REST API v1, Bearer token auth |
| **Free Tier** | Trial API key available on request |
| **Pricing** | Developer: 5K/$74.95 · Startup: 45K/$245 · Enterprise: 450K/$795 |
| **Rate Limit** | 2 req/sec, monthly limits per plan |
| **Data Fields** | name, description, image, brand, category (Google taxonomy), ingredients, dimensions, specs |
| **Reverse Search** | ❌ No name→EAN search |
| **KZ Coverage** | Claims "better international coverage than other services" |
| **Legal** | Fully legal |

**VERDICT:** Expensive but rich data. Ingredients field is useful. Price is 3-8x higher than EAN-DB for same volume. Only worth it if EAN-DB doesn't have needed data.

---

### 1.4 UPCitemdb ⭐⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://upcitemdb.com + API at devs.upcitemdb.com |
| **DB Size** | 694.8M unique UPC/EAN |
| **API** | ✅ REST API, JSON, two endpoints (lookup + search) |
| **Free Tier** | Explorer: 100 requests/day, no signup |
| **Pricing** | DEV: $99/month (20K lookup/day + 2K search/day) · PRO: $699/month |
| **Reverse Search** | ✅ Search by product name (returns up to 10 items per page, max 1000) |
| **Rate Limit** | Free: 100/day. DEV: burst limit 15 lookup/5 search per 30s |
| **KZ Coverage** | Already tested — ~40% match rate for KZ chocolate brands |
| **Legal** | Fully legal, commercial API |

**VERDICT:** Already in our pipeline (`kaspi-enrich-eans-v2.cjs`). Free 100/day is usable for small batches. Search-by-name works but results are US-centric. Best for global brands (Milka, Kinder, etc.).

---

### 1.5 Open Food Facts ⭐⭐⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://world.openfoodfacts.org |
| **DB Size** | ~3.5M food products (open source, crowdsourced) |
| **API** | ✅ Free REST API v2, no auth required |
| **Endpoints** | `GET /api/v2/product/{barcode}` · `GET /api/v2/search` · JSONL/CSV/MongoDB/Parquet dumps |
| **Data Fields** | name, brand, ingredients (parsed!), allergens, КБЖУ, NutriScore, Nova group, categories, labels (incl. halal), photos |
| **Dumps** | JSONL: `openfoodfacts-products.jsonl.gz` · CSV: `en.openfoodfacts.org.products.csv.gz` (~0.9GB) · Parquet on HuggingFace |
| **Pricing** | Completely free (Open Database License) |
| **Reverse Search** | ✅ Text search API: `/cgi/search.pl?search_terms=...&json=1` |
| **KZ Coverage** | LIMITED. 460-prefix (Russia) has some products. 487-prefix (KZ) very sparse. |
| **Legal** | Open data (ODbL), must attribute. No scraping — use dumps. |

**TEST RESULTS:**
- `GET /api/v2/product/4600494000678` → 404 (not found)
- `GET /api/v2/product/7622210449754` → 404 (Milka not found by this EAN)
- Search by name: currently 503 errors (server overloaded)

**VERDICT:** Best for food-specific data (ingredients, allergens, NutriScore). KZ coverage is poor but can be improved by contributing. The JSONL dump is valuable — can filter for 460/487 prefixes. FREE.

---

### 1.6 GS1 Verified by GS1 / GEPIR ⭐⭐⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://www.gs1.org/services/verified-by-gs1 · https://gepir.gs1.org |
| **DB Size** | 200M+ GTINs in GS1 global registry |
| **API** | ✅ Enterprise API available (batch query, API connection) — contact local GS1 office |
| **Web Lookup** | Free web form — search by GTIN, GLN, company name |
| **Data Fields** | Company that owns the barcode, product validation, basic product info (limited) |
| **Pricing** | Web: free. API: enterprise-level, contact GS1 KZ |
| **KZ Specific** | GS1 Kazakhstan (gs1.kz) has local API: POST HTTPS, JSON, validates GTIN + checks global registry |
| **Legal** | Official GS1 service |

**VERDICT:** For EAN VALIDATION (is this EAN real? who owns it?) — this is the gold standard. Not for enrichment (no ingredients/photos). GS1 KZ API is a MUST for verifying KZ barcodes.

---

### 1.7 GS1 Digital Link ⭐⭐

| Field | Value |
|-------|-------|
| **What** | Standard for encoding GS1 identifiers (GTIN, batch, expiry) in URLs/QR codes |
| **Status** | URI syntax 1.6.0 (Apr 2025), GS1-Conformant resolver 1.2.0 (Jan 2026) |
| **Use Case** | 2D barcodes (QR with GS1 Digital Link) → scan → get online product info |
| **For Körset** | Future-proof: as KZ retailers adopt 2D barcodes, scanning a GS1 Digital Link QR will resolve to product info |
| **Timeline** | Global retail migration to 2D barcodes underway (2027-2030 target) |

**VERDICT:** Future opportunity. Not useful today for KZ market, but should be built into the scanner for when 2D barcodes arrive.

---

### 1.8 barcode-list.com ⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://barcode-list.com |
| **What** | Bulgarian site (Microinvest WarehousePro), barcode→product name lookup |
| **Languages** | BG, EN, RU |
| **DB Size** | Unknown (likely <5M) |
| **API** | ❌ Web search only |
| **KZ Coverage** | Very limited |
| **Legal** | Free web lookup |

**VERDICT:** Minor. Russian-language interface is a plus, but coverage is too limited.

---

### 1.9 barcodelookup.com ⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://barcodelookup.com |
| **DB Size** | Unknown (large, US-centric) |
| **API** | ❌ No public API. 403 on direct access (bot protection/captcha) |
| **Scraping** | Heavy bot protection, captcha on search |
| **Legal** | Scraping would violate ToS |

**VERDICT:** Not viable. No API, aggressive bot protection. Skip.

---

### 1.10 ean-database.org ⭐

| Field | Value |
|-------|-------|
| **Status** | Site unreachable (transport error) |
| **Likely** | Defunct or offline |

**VERDICT:** Dead. Skip.

---

## CATEGORY 2: KZ/RU MARKETPLACE PRODUCT APIs

### 2.1 Wildberries (WB) ⭐⭐⭐⭐ — HIGH POTENTIAL

| Field | Value |
|-------|-------|
| **URL** | https://www.wildberries.ru |
| **API Endpoint** | `https://card.wb.ru/cards/detail?nm={article_id}` |
| **Data in Card** | name, brand, price, sizes, supplierId, vendorCode, images, category, description |
| **EAN in Card?** | ⚠️ **NO direct EAN field** in public card API. WB uses their own article IDs (nm). |
| **Search API** | `https://catalog.wb.ru/catalog/{category}/catalog?...` — catalog by category |
| **Rate Limit** | Aggressive bot protection. Requires proper headers + delays. |
| **Reverse Path** | name→WB article (via search) → card data → NO EAN |
| **Legal** | Scraping violates ToS. No official public product API. |

**TEST RESULTS:**
- `card.wb.ru/cards/detail?nm=155679733` → 404 (from non-browser UA)
- `card.wb.ru/cards/detail?nm=76524582` → 404 (bot blocked)
- Web page returns 498 (invalid request without proper session)

**KEY INSIGHT:** WB sellers DO provide EANs when listing products, but the public API does NOT expose them. The **WB Seller API** (for merchants) likely has EAN data. If we get merchant access → we can query EANs.

**VERDICT:** If you can get WB Seller API access, EAN data should be available. Public API is useless for EAN. Requires browser emulation for scraping.

---

### 2.2 Ozon ⭐⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://ozon.ru |
| **Seller API** | https://docs.ozon.ru/api/seller/ — full product management API |
| **Product Data** | Ozon sellers MUST provide EAN when listing products |
| **EAN in Seller API?** | ✅ YES — `POST /v3/product/info` returns `barcode` field |
| **Public API** | ❌ No public product search API |
| **Legal** | Seller API access requires merchant account |

**KEY INSIGHT:** Ozon Seller API has `barcode` field in product info! This is the most promising marketplace source. Getting merchant access = EAN data for all products in your Ozon store.

**VERDICT:** Ozon Seller API = EAN treasure. Requires merchant account. If a KZ store sells on Ozon → their product list has EANs.

---

### 2.3 Yandex Market ⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://market.yandex.ru |
| **Partner API** | https://yandex.ru/dev/market/ — requires partner account |
| **EAN in API?** | Likely yes — Yandex Market requires barcodes for product cards |
| **Public API** | ❌ No public search API |
| **Legal** | Partner API requires registration |

**VERDICT:** Similar to Ozon — partner API likely has EAN. Requires merchant access.

---

### 2.4 Kaspi.kz ⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://kaspi.kz |
| **Mobile API** | Already used in our pipeline — `kaspi-download.cjs` |
| **EAN in API?** | ❌ NO — mobile API returns product_id, name, brand, price, but NO EAN |
| **HTML Page** | Tested — no EAN in JSON-LD or meta tags |
| **Merchant API** | Kaspi Merchant panel has EANs for merchant's own products |
| **Legal** | Merchant API access requires Kaspi partnership |

**TEST RESULTS:**
- `kaspi.kz/shop/p/bounty-shokolad-57g-100149267/` → 404 (bot blocked)
- HTML parsing script already works but finds composition, not EANs

**VERDICT:** Already maxed out. Kaspi doesn't expose EAN publicly. Only way: merchant panel access.

---

### 2.5 Magnum.kz ⭐

| Field | Value |
|-------|-------|
| **URL** | https://magnum.kz |
| **Status** | 404 on category pages. Site may have changed structure. |
| **API** | Unknown — likely no public API |

**VERDICT:** Couldn't access. Low priority.

---

### 2.6 Technodom.kz ⭐⭐

| Field | Value |
|-------|-------|
| **URL** | https://technodom.kz |
| **Status** | Returns HTML with product listings. Electronics-focused. |
| **EAN?** | Unlikely in HTML — electronics retailers rarely show EAN |
| **API** | Unknown internal API |

**VERDICT:** Electronics store, not food. Skip for v1 (food focus).

---

### 2.7 Sulpak.kz ⭐

| Field | Value |
|-------|-------|
| **URL** | https://sulpak.kz |
| **Status** | 404 on category page. Electronics retailer. |

**VERDICT:** Skip. Electronics only, not food.

---

## CATEGORY 3: SEARCH ENGINE METHODS

### 3.1 Google Search ⭐⭐⭐

| Method | `site:*.kz "{product name}" штрихкод` or `"{product name}" EAN штрихкод` |
|--------|------|
| **Works?** | ✅ Yes, but labor-intensive per product |
| **Data Quality** | Hit-or-miss. Sometimes finds EAN in product reviews, wholesale lists, forum posts |
| **Rate Limit** | Google blocks automated scraping quickly |
| **Legal** | Automated scraping violates ToS. Manual search is fine. |
| **Automation** | Google Custom Search API: $5/1000 queries, 100/day free |

**VERDICT:** Useful for manual verification. Automated scraping will be blocked. Google Custom Search API could work for small volumes.

---

### 3.2 Yandex Search ⭐⭐

| Method | Similar to Google but better for Russian/KZ content |
|--------|------|
| **Works?** | ✅ Better RU/KZ results than Google |
| **API** | Yandex XML search API — free for 30 req/day, paid beyond |
| **Legal** | API is ToS-compliant for reasonable volumes |

**VERDICT:** Better than Google for KZ/RU product searches. Yandex XML API is an option.

---

### 3.3 DuckDuckGo ⭐

| Method | Already tested in `kaspi-enrich-eans-v2.cjs` |
|--------|------|
| **Works?** | ✅ Works initially, rate-limited after ~100 requests |
| **Rate Limit** | Aggressive rate limiting |

**VERDICT:** Already in pipeline. Limited by rate limits. Use sparingly.

---

### 3.4 Google Shopping API ⭐

| Status | Discontinued. Google Shopping was replaced by Google Merchant Center. |
|--------|------|
| **Alternative** | Google Merchant Center API — only for your own product data |

**VERDICT:** Dead. No public product search API from Google Shopping.

---

## CATEGORY 4: "GREY" / SEMI-LEGAL METHODS

### 4.1 Kaspi Merchant Panel ⭐⭐⭐⭐

| Method | If store uses Kaspi Merchant → their product list has EANs |
|--------|------|
| **How** | Kaspi Merchant panel shows all product attributes including barcode |
| **API** | Kaspi Partner API — for merchants only |
| **Extraction** | If a Körset store is a Kaspi merchant → we can import their product catalog WITH EANs |
| **Legal** | ✅ Fully legal if the store is the merchant and authorizes access |

**VERDICT:** IMPORTANT. When onboarding a store that sells on Kaspi → ask them to export their catalog (it includes EANs). This is a B2B integration path.

---

### 4.2 1C:Enterprise Databases ⭐⭐⭐⭐⭐

| Method | KZ stores using 1С have EAN codes in their inventory databases |
|--------|------|
| **CommerceML** | XML format for catalog exchange — includes штрихкод (barcode) field |
| **1С:Розница** | Retail POS system — has barcode for every product |
| **1С:Управление торговлей** | Trade management — full product catalog with EANs |
| **API** | 1С has HTTP API (1С:Предприятие HTTP-сервисы) |
| **For Körset** | When store onboards → offer CommerceML import → get ALL their EANs + prices + stock |
| **Legal** | ✅ Fully legal — it's the store's own data |

**VERDICT:** THE SINGLE BEST SOURCE. 80%+ of KZ grocery stores use 1С. CommerceML export = instant product database with EANs. This should be the primary onboarding path.

---

### 4.3 Russian Barcode Databases (barcodelist.ru etc.) ⭐⭐

| Source | Status |
|--------|--------|
| **barcodelist.ru** | ❌ Transport error (site down or moved) |
| **штрихкод.рф** | ❌ Domain for sale — no longer a barcode database |
| **barcode-list.ru** | ✅ 5M+ barcodes, web search only (from Microinvest) |
| **barcode-list.com** | ✅ Bulgarian site with RU language, limited |
| **aioke/barcodes (GitHub)** | ✅ 1.8M barcodes, Russia 2021-2022, CSV/SQLite, CC0 |

**VERDICT:** barcode-list.ru and aioke/barcodes are useful one-time imports. Coverage is Russia-centric but ЕАЭС overlap means many KZ-market products are included.

---

### 4.4 Telegram Bots ⭐⭐

| Method | Various barcode lookup bots in Telegram |
|--------|------|
| **Known Bots** | @halaldamukz (halal check), various generic barcode bots |
| **KZ-specific** | None found specifically for EAN lookup |
| **Data Quality** | Most bots use OFF or ean-search.org as backend |
| **Legal** | Using bots is fine, scraping their backend isn't |

**VERDICT:** No KZ-specific barcode bots. Generic bots use same sources we already have.

---

### 4.5 Sellers' Price Lists (Excel/CSV) ⭐⭐⭐⭐⭐

| Method | Wholesale suppliers publish price lists with EAN codes |
|--------|------|
| **Format** | Excel (XLSX), CSV, CommerceML XML |
| **Data** | Product name, brand, barcode (EAN), price, stock, category |
| **Sources** | Distributors' websites, WhatsApp groups, 1С exchange files |
| **For Körset** | When store onboards → ask for their supplier price lists |
| **Legal** | ✅ Fully legal — commercial data exchange |

**VERDICT:** CRITICAL. This is how KZ retail actually works — suppliers send Excel price lists to stores. These ALWAYS have EANs. Build an Excel import feature.

---

## COMPREHENSIVE COMPARISON TABLE

| # | Source | EAN→Product | Name→EAN | KZ Coverage | Food Data | Free? | Best For |
|---|--------|-------------|----------|-------------|-----------|-------|----------|
| 1 | **1C/CommerceML** | N/A | ✅ (store catalog) | ⭐⭐⭐⭐⭐ | ❌ | ✅ (store's data) | **Onboarding stores** |
| 2 | **Supplier Price Lists** | N/A | ✅ (EAN column) | ⭐⭐⭐⭐⭐ | ❌ | ✅ | **Onboarding stores** |
| 3 | **EAN-DB API** | ✅ | ❌ | ⭐⭐⭐ | ✅✅✅ | 250 free | **Product enrichment** |
| 4 | **EAN-Search.org** | ✅ | ✅✅ | ⭐⭐⭐ | ❌ | Trial 1 EUR | **Reverse EAN lookup** |
| 5 | **Open Food Facts** | ✅ | ✅ | ⭐⭐ | ✅✅✅ | ✅ | **Food metadata** |
| 6 | **GS1 Kazakhstan** | ✅ | ❌ | ⭐⭐⭐⭐⭐ | ❌ | ❌ (membership) | **EAN validation** |
| 7 | **UPCitemdb** | ✅ | ✅ | ⭐⭐ | ❌ | 100/day free | **Quick lookups** |
| 8 | **Ozon Seller API** | ✅ | ✅ (own products) | ⭐⭐⭐⭐ | ❌ | ❌ (merchant) | **Marketplace EANs** |
| 9 | **WB Seller API** | ✅ | ✅ (own products) | ⭐⭐⭐⭐ | ❌ | ❌ (merchant) | **Marketplace EANs** |
| 10 | **Kaspi Merchant** | ✅ | ✅ (own products) | ⭐⭐⭐⭐⭐ | ❌ | ❌ (merchant) | **KZ marketplace** |
| 11 | **Go-UPC** | ✅ | ❌ | ⭐⭐⭐ | ✅ | Trial | **Rich data (expensive)** |
| 12 | **aioke/barcodes** | ✅ | ❌ | ⭐⭐ | ❌ | ✅ | **1.8M RU EANs** |
| 13 | **barcode-list.ru** | ✅ | ❌ | ⭐⭐ | ❌ | ✅ | **5M RU EANs** |
| 14 | **NPC (July 2026)** | ✅ | ✅ | ⭐⭐⭐⭐⭐ | ✅ | ✅ (gov) | **Future: ALL KZ products** |
| 15 | **Yandex Search API** | N/A | ✅ | ⭐⭐⭐ | ❌ | 30/day free | **Last resort search** |
| 16 | **Google Custom Search** | N/A | ✅ | ⭐⭐ | ❌ | 100/day free | **Last resort search** |
| 17 | **DuckDuckGo** | N/A | ✅ | ⭐⭐ | ❌ | ✅ (rate limited) | **Already in pipeline** |

---

## STRATEGY: EAN ENRICHMENT CASCADE

When we have a product name+brand (from Kaspi/1C) but NO EAN:

```
Priority | Method                    | Expected Hit Rate | Cost
---------|---------------------------|-------------------|--------
1        | 1С/CommerceML import      | 90%+ (store data) | Free (store's data)
2        | Supplier Excel import     | 80%+ (has EANs)   | Free (store's data)
3        | EAN-Search.org name→EAN   | 40-60% (global)   | 19-39 EUR/mo
4        | UPCitemdb name search     | 30-40% (US/EU)    | Free 100/day
5        | OFF text search           | 10-20% (food only)| Free
6        | aioke/barcodes CSV match  | 15-25% (RU 2021)  | Free (one-time)
7        | Yandex XML API search     | 10-20%            | Free 30/day
8        | DuckDuckGo search         | 5-15%             | Free (rate-limited)
9        | AI/LLM extraction         | ?                 | OpenAI API cost
```

When we HAVE an EAN and need to ENRICH product data:

```
Priority | Method                    | Data Gained          | Cost
---------|---------------------------|----------------------|--------
1        | EAN-DB API                | name,cat,ingredients,КБЖУ | 0.0018 EUR
2        | Open Food Facts           | ingredients,allergens,КБЖУ| Free
3        | GS1 Kazakhstan API        | validation,company    | Membership
4        | Go-UPC API                | name,desc,ingredients | $74.95/mo
5        | EAN-Search.org            | name,category         | 19 EUR/mo
```

---

## ACTION ITEMS (PRIORITIZED)

### IMMEDIATE (P0):
1. **Build CommerceML/Excel import** — RetailImportScreen. This is the P0 blocker.
2. **Sign up for EAN-DB** — get 250 free requests, test KZ coverage
3. **Sign up for EAN-Search.org Trial** — 1 EUR, test name→EAN reverse search
4. **Download aioke/barcodes** — 1.8M RU barcodes, one-time import

### SHORT-TERM (P1):
5. **Buy EAN-DB 50K package** (69 EUR) — for production enrichment
6. **Integrate OFF JSONL dump** — filter for 460/487 prefixes, import to Supabase
7. **Add UPCitemdb search-by-name** to enrichment script (already have lookup)
8. **Register with GS1 Kazakhstan** — get GTIN validation API

### MEDIUM-TERM (P2):
9. **Monitor NPC launch** (July 2026) — will have ALL KZ products
10. **Get Ozon/WB seller API access** — partner with a store that sells there
11. **Yandex XML search API** — as fallback enrichment
12. **Build price list (Excel/XLSX) import** — for supplier catalogs

---

## KEY INSIGHT: THE B2B ONBOARDING FLYWHEEL

The most effective way to get EANs is NOT through APIs, but through **store onboarding**:

```
Store signs up for Körset
  → Store provides their 1С CommerceML export (has EANs for ALL their products)
  → OR Store provides supplier Excel price lists (has EANs)
  → OR Store gives Kaspi Merchant access (has EANs for Kaspi products)
  → We import ALL products with EANs into our DB
  → Each new store enriches the GLOBAL product database
  → Next store benefits from existing data → easier onboarding
```

This creates a **data network effect**: every store that joins makes the next store's experience better. This IS the Data Moat.
