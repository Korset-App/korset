# Barcode nutrition source benchmark

Date: 2026-05-25

## What was checked

Added `scripts/_tmp_barcode_nutrition_benchmark.mjs`, a read-only benchmark over real `global_products` EANs.
It checks external barcode sources for Fit-Check-critical nutrition fields: sugar, salt/sodium, and fiber.
The script writes the latest report to `C:\tmp\korset-barcode-nutrition-benchmark.json`.

Sources tested:

- Open Food Facts product API by barcode
- USDA FoodData Central Branded search by barcode

## Results

Default/local-ish sample, 50 food EANs:

- Open Food Facts found exact barcode products for 7/50
- OFF sugar coverage: 2/50
- OFF salt/sodium coverage: 2/50
- OFF fiber coverage: 1/50
- OFF all three fields: 1/50
- USDA returned 0/50 because the configured API key/run currently gets HTTP 403 and network timeouts

Global-brand sample, 50 EANs selected by known international brand markers:

- Open Food Facts found exact barcode products for 22/50
- OFF strong match: 19/50
- OFF sugar coverage: 15/50
- OFF salt/sodium coverage: 14/50
- OFF fiber coverage: 10/50
- OFF all three fields: 10/50
- USDA again returned 0/50 due to HTTP 403/timeouts

## Interpretation

Open Food Facts is not enough for full catalog enrichment, especially local KZ/CIS products.
It is useful for global brands and should be included in the barcode-first cascade for nutrition fields.

USDA cannot be evaluated fairly until the API key/access issue is fixed. The benchmark currently proves only that USDA is unavailable from this environment/config, not that USDA has no matching data.

## Product decision

For sugar/salt/fiber enrichment without OCR:

1. Use OFF as an automatic exact-barcode source, especially for global brands.
2. Keep OFF facts source-labeled and confidence-scored because OFF is user-contributed and incomplete.
3. Fix/test USDA access separately; only then decide whether it is useful for imported/global products.
4. Add commercial API evaluation next if budget allows, starting with FatSecret because its public materials claim broad global barcode coverage.
