# Halal Enrichment: Name Fix + Registry Scrape

**Date**: 2026-05-24
**Session**: Post-candy-sweets reimport

## Done

### 1. Fixed halal-from-name bug
The old `arbuz-catalog-parser.cjs` imported `extractAllAttributes` globally but never called it per-product. As a result, 16 products with "халал"/"халяль" in their name had `halal_status = 'unknown'`.

**Fix**: `scripts/fix-halal-from-name.cjs` — UPDATE query matching `name ILIKE '%халал%' OR name ILIKE '%халяль%' OR name ILIKE '%halal%'` with `halal_status != 'yes'`.

**Result**: 598 products now halal (was 582). Coverage: 5.0% (was 4.9%).

### 2. Researched public halal APIs
- **Verify Halal** (verifyhalal.com): Web search requires JavaScript. No public API. Mobile app only.
- **Halal Food Checker** (RapidAPI): Listed but no clear endpoint documentation found.
- **Halal AI** (halalai.net): Claims 3M+ products. No public API — mobile app only.
- **ITS Indonesia API** (halal.addi.is.its.ac.id): Has open API but Indonesia-focused, no barcode lookup.
- **Conclusion**: No viable public API for Kazakhstan product halal status.

### 3. Scraped HalalDamu.KZ registry (www.halaldamu.kz)
- Found WordPress AJAX endpoint: `action=load_companies`
- **1130 certified companies** (875 unique names) scraped across 54 pages
- **Categories**: Общественное питание (352), Кондитерские изделия (141), Фастфуд (93), Полуфабрикаты (89), Мясной магазин (86), Колбасное производство (66), Молочные продукты (49), и др.
- Also found halalinfo.kz (same org, different domain) — only 8 companies there
- Data saved: `data/halaldamu-registry-certified.json`

### 4. Attempted brand cross-referencing
- Tried word-based matching between product brands and certified company names
- 65 potential matches found, but high false-positive rate
- Many Kazakh food brands like "Рахат", "Баян Сулу", "Ет Байрам" don't directly match company names in the registry
- **Conclusion**: Automated matching is too noisy for production use. Manual curation recommended.

## Files Created/Modified
- `scripts/fix-halal-from-name.cjs` — halal name fix script
- `scripts/scrape-halalinfo-registry.cjs` — halalinfo.kz scraper (minor data)
- `scripts/scrape-halaldamu-registry.cjs` — halaldamu.kz scraper (1130 companies)
- `scripts/crossref-halal-companies.cjs` — brand cross-reference (noisy)
- `scripts/crossref-halal-brands-v2.cjs` — refined cross-reference attempt
- `data/halaldamu-registry-certified.json` — 1130 certified companies
- `data/halaldamu-certified-names.txt` — 875 unique company names
- `data/halalinfo-registry.json` — 8 companies from halalinfo.kz
- `data/halal-brand-matches.json` — 65 potential brand matches
- `data/halal-brand-matches-v2.json` — 502 potential matches (includes name-based)

## Blockers
- No public halal API for Kazakhstan
- Brand-to-company matching is unreliable without manual curation
- Registry data is at company level, not product/barcode level

## Next Steps (Recommended)
1. **Ingredient analysis**: Check `ingredients_raw` for non-halal components (pork gelatin, alcohol, E-codes)
2. **Manual brand whitelist**: Curate list of known halal brands in Kazakhstan
3. **HalalGuide KZ app**: Has public registry — possible alternative data source
