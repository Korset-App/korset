---
domain: knowledge
subdomain: catalog
status: active
updated: 2026-09-26
---

# Catalog data invariants

Required before catalog, enrichment, scraping, ingestion, product-image or halal-data work. Moved verbatim from AGENTS.md; obligations are unchanged. Counts and coverage are historical estimates, not live verification.

## Catalog & Data Invariants

- **Radical Transparency:** Never hide mistakes, shortcuts, or partial states. Disclose unvarnished data audits immediately upfront without waiting to be caught.
- **Barcode source:** Use stores with exposed GS1 EAN-13 (e.g. Semeiniy.kz). Multiple EANs separated by semicolons are valid packaging variants (keep all). Never guess or hallucinate barcodes.
- **Multi-source enrichment:** Enrich the catalog using multi-store consensus across all 8 core Kazakhstan retail sources (Semeiniy, Arbuz, Vkusmart, Astykzhan, Clevermarket, Galmart, Interfood, Dina/Korzina & Korzina v Dom) plus Open Food Facts & KDV. Never artificially cap scraping budgets (e.g., no 2,000 limits).
- **Mandatory Packaging Attributes Checklist (30 Attributes):** Every product card must strive for 100% packaging parity: 1) EAN-13, 2) alternate_eans, 3) name, 4) name_kz, 5) brand, 6) category, 7) subcategory, 8) quantity/weight, 9) ingredients_raw (RU), 10) ingredients_kz (Құрамы), 11) allergens_json, 12) nutriments_json (KBJU: calories, protein, fat, carbs), 13) salt/sugar/saturated_fat, 14) fat_percent, 15) taste/flavor, 16) packaging_type, 17) cooking_instructions, 18) shelf_life, 19) storage_conditions, 20) manufacturer, 21) country_of_origin, 22) halal_status (store badges + QMDB/AHIK), 23) halal_certifier, 24) diet_tags_json, 25) additives_tags_json (E-numbers), 26) nutriscore, 27) nova_group, 28) description, 29) image_url & images (studio WebP on R2, front + back packshot), 30) price_kzt.
- **Product Images Strategy (Multi-Angle & Verification):** Semeiniy.kz is the primary packshot backbone (~95%+ coverage). Extract all distinct studio packshots directly from the product hero gallery (`html/product/images`): primary front packshot (`image_url`) plus all additional angles (`images` array: front, back/composition, sides). Filter out `empty_photo.svg` and never match plural recommendation carousels (`html/products/images`). Verification protocol: Spot-check the first 200 items across diverse categories via AI Vision. If 100% pass, proceed with direct catalog ingestion without per-item AI overhead. AI Vision is reserved for external fallbacks. STRICTLY ZERO photos from Korzina v Dom (watermarks).
- **Alternate EANs Invariant:** Primary EAN must NEVER be duplicated into `alternate_eans`. Only genuine secondary/tertiary factory packaging barcodes (separated by `;` in SKU) belong in `alternate_eans` (~2,000–3,000 items across the entire catalog).
- **Non-destructive enrichment (Закон неразрушающего дополнения):** New sources fill missing packaging attributes. If an attribute is empty, fill it. If multiple stores provide data, use consensus voting. Never overwrite existing high-quality verified data (EAN, R2 studio packshots) with null or inferior data.
- **Halal multi-signal:** Halal status must be ingested across ALL 8 core Kazakhstan retail sources (Semeiniy, Arbuz, Vkusmart, Astykzhan, Clevermarket, Galmart, Interfood, Dina/Korzina) AND cross-verified against official QMDB (Halal Damu) and AHIK registries. Never rely on a subset of stores or registry strings alone.
- **Scale:** Never artificially cap catalog size (support 40,000–60,000+ items).
- **Fault-tolerance:** All scraping and ingestion pipelines must be append-only (JSONL), checkpointed, and 100% resumable upon internet or power interruptions.

