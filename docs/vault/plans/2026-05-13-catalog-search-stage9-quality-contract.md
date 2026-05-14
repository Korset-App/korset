# Catalog Search Stage 9 Quality Contract

## Summary

Stage 9 must turn the catalog search from a technical RPC foundation into a professional grocery search quality system. Stages 1-8 created the infrastructure: store-scoped RPC, frontend integration, primary RPC mode, fallback layers, search UX states, recent history, diagnostics, and stable server search state. They did not fully implement the original search quality contract.

The user correctly identified that current search still behaves too simply for real shoppers. Search must not only match exact ordered product names. It must understand product intent, token order independence, typo tolerance, brand/product combinations, quantity variants, RU/KZ/Latin forms, category/subcategory semantics, and safe fallback behavior across all grocery categories.

## Correction To Previous Direction

Do not jump directly to a narrow SQL fix for examples like milk. The milk examples are representative symptoms, not the full scope.

Before implementation, Stage 9 should preserve the full professional-search contract and build a broad quality matrix. The implementation can still be incremental, but it must be designed around general grocery search, not one category.

## Confirmed Product Decisions

### Search Relevance Before Fit-Check

In catalog search mode, search relevance must rank above Fit-Check suitability.

Reason: shoppers often search for a specific product, brand, price, or volume regardless of whether the product is safe for their profile. Fit-Check remains visible and valuable, but it must not cause a weak or accidental match to outrank a clearly relevant product.

Execution rule:

1. Rank by search relevance tier first.
2. Use Fit-Check only inside sufficiently relevant tiers.
3. Use `search_rank`, price, availability, and stable tie-breakers after relevance/Fit-Check.
4. Do not send user profile data into SQL ranking.

### Attribute Search Must Be Conservative

Queries such as `без сахара`, `без глютена`, `халал`, `без лактозы`, `пальмовое масло`, and `протеин` should rely on explicit product data: name, tags, diet tags, halal status, category tags, ingredients, and other stored product facts. Do not infer sensitive health claims from weak or speculative signals.

### Aliases Start Curated

Stage 9 should start with a curated high-value alias table for common grocery products, Kazakh/Russian terms, and global brands. Do not build a broad transliteration engine before the curated approach is tested against real pilot-store search behavior.

### Stage 9 Must Be Implemented In Substages

Stage 9 is one product-quality upgrade, but implementation must be split into controlled substages with tests and verification after each meaningful change. Avoid a single large SQL/frontend rewrite.

## Current Gap

Current RPC `public.fn_search_store_products` from migration `028_catalog_search_rpc.sql` mainly scores:

- exact EAN / alternate EAN;
- FTS over full `global_products.name_tsvector`;
- FTS over `brand_tsvector`;
- full-field substring match against `local_name`, `name`, `name_kz`;
- full-field trigram similarity against `local_name`, `name`, `name_kz`, `brand`.

This misses several shopper expectations:

- query tokens are not independently understood;
- word order is not treated as flexible enough;
- missing middle words or brand words can block expected results;
- `молоко 1л`, `1 л`, `1000 мл` are not normalized as the same intent;
- product intent is not boosted strongly enough, so `молоко` can rank below products that merely contain `молочный`;
- category/subcategory fields and the existing taxonomy/keyword intelligence are underused;
- transliteration and common RU/KZ/Latin brand forms are incomplete;
- typo tolerance works only against the whole field, not individual meaningful tokens;
- ingredient/claim searches like `без сахара`, `пальмовое масло`, `халал`, `без глютена` are not treated as separate search modes.

## Existing Assets To Reuse

### Taxonomy

Authoritative taxonomy: `src/domain/product/categoryMap.js`.

The project already has 18 normalized categories and many subcategories, including:

- `dairy_eggs`: milk, fermented, cheese, butter, cream, cottage, eggs, condensed_milk, spread;
- `water_beverages`: juice, water, soda, energy, lemonade;
- `sweets`: chocolate, candy, cookies, pastries, halva, honey_jam;
- `snacks`: chips, crackers, nuts, dried_fruits, seeds, fish_snacks;
- `grocery`: cereals, pasta, rice, flour, sugar, breakfast, cooking_oil, salt, vinegar;
- `sauces_spices`, `bread`, `frozen`, `fruits_veg`, `baby_food`, `ready_meals`, `healthy`, `personal_care`, `household`, etc.

### Keyword Classifier

`NAME_KEYWORDS` already maps many product-intent patterns to normalized category/subcategory, for example:

- `молок` -> `dairy_eggs / milk`;
- `кефир`, `ряженк`, `айран`, `йогурт` -> fermented;
- `молочный шоколад` -> sweets/chocolate;
- `гречк`, `рис`, `макарон`, `мука`, `сахар` -> grocery subcategories;
- `вода`, `сок`, `чай`, `кофе`, `чипс`, `пельмен`, `морожен`, etc.;
- English/Latin patterns like `milk`, `cheese`, `doritos`, `nutella`, `wispa`, `jacobs`.

Search should reuse or mirror this domain knowledge instead of relying only on raw FTS/full-string similarity.

## Required Professional Search Behavior

### 1. Store Context Is Non-Negotiable

Search must only return active products from the current store:

- `sp.store_id = p_store_id`;
- `sp.is_active = true`;
- `gp.is_active = true`.

No global marketplace behavior in V1.

### 2. Product Intent Must Rank First

If the query clearly names a base product type, products in that exact product type/category/subcategory should come first.

Examples:

- `молоко` -> actual milk products first, not milk chocolate, milk filling, milk desserts, milk cocktails unless no direct milk exists;
- `шоколад` -> chocolate first, not products with chocolate flavor as secondary ingredient unless direct chocolate is exhausted;
- `кефир` -> kefir/fermented dairy first;
- `рис` -> rice first, not rice cakes or ready meals with rice unless relevant;
- `вода` -> water first, not water-based drinks;
- `масло сливочное` -> dairy butter first, not cooking oil;
- `масло подсолнечное` -> cooking oil first, not butter.

This requires category/subcategory boosts and sometimes penalties for near-but-wrong product types.

### 3. Token Order Independence

Search must match all meaningful tokens regardless of order and optional intervening words.

Examples:

- `топленое молоко`, `молоко топленое`, `молоко Эмиль топленое`, `Эмиль молоко топленое` should converge;
- `сыр моцарелла`, `моцарелла сыр`, `сыр President моцарелла` should converge;
- `чай зеленый`, `зеленый чай`, `чай Lipton зеленый` should converge.

### 4. Partial Token Coverage With Sensible Ranking

For multi-token queries:

- exact phrase match is strongest;
- all important tokens present in any order is very strong;
- product-intent token + modifier token is strong;
- brand + product-intent is strong;
- only one generic token is weaker;
- ingredient-only accidental match is weaker than name/category match.

### 5. Typo Tolerance Per Token

Typos should work on meaningful tokens, not just the whole product name.

Examples:

- `молокы` -> `молоко`;
- `сникерс` -> `Snickers`;
- `топленное` -> `топленое` / `топлёное`;
- one-letter mistakes in common products should still find results.

Use `pg_trgm` carefully for token-level fuzzy matching and avoid overmatching very short tokens.

### 6. Morphology And Ё/Е Normalization

Search should normalize common Russian variations:

- `молоко`, `молока`, `молочный` are related but not equal in intent;
- `топленое`, `топлёное`, `топленное` should match;
- `сгущенка`, `сгущёнка`, `сгущенное молоко` should match;
- `кефир`, `кефира` should match;
- `копченый`, `копчёный`, `копченая` should match.

Important: related adjective forms should not always outrank exact product intent. For `молоко`, `молочный шоколад` is a weaker related match, not a top result.

### 7. Quantity Normalization

Search should understand common volume/weight forms:

- `1л`, `1 л`, `1.0 л`, `1000мл`, `1000 мл`;
- `0.5л`, `500мл`;
- `200г`, `200 г`, `0.2 кг` where feasible.

If query includes quantity, matching quantity should boost ranking, not be required so strictly that results disappear.

### 8. Brand/Product Combination

Brand tokens should boost within the correct product intent, not replace it.

Examples:

- `молоко Эмиль топленное` should return Эмиль топленое milk if available;
- if exact brand is missing, other топленое молоко should still appear;
- `сникерс` should find Snickers through brand/name/transliteration even if data is Latin;
- `кола coca cola`, `кока кола`, `coca-cola` should converge.

### 9. RU/KZ/Latin Support

Search should cover:

- Russian names;
- Kazakh names where data exists (`сүт`, etc.);
- Latin brand names;
- common Cyrillic transliterations for global brands.

Stage 9 can start with a curated alias table for high-value brands/products instead of a full transliteration engine.

### 10. Claim / Attribute / Ingredient Search Modes

Some queries are not product-type queries but attribute/claim queries:

- `без сахара`;
- `без глютена`;
- `халал`;
- `пальмовое масло`;
- `без лактозы`;
- `протеин`.

These should search tags, diet tags, ingredients, halal status, categoriesTags, and possibly normalized health subcategories. They should not pollute normal product-intent ranking.

### 11. Local And Offline Fallback Must Improve Too

`CatalogScreen.jsx` still has a simple client fallback:

```js
haystack.includes(query)
```

That fallback is useful but too weak. After server RPC quality improves, local/offline fallback should get a lightweight shared JS normalizer/scorer so offline behavior is not dramatically worse.

Do not make offline search dependent on server-only SQL.

## Suggested Architecture

### Stage 9.0: Current-Code Inspection

Before implementation, inspect and map:

- `src/domain/product/categoryMap.js`;
- `supabase/migrations/028_catalog_search_rpc.sql`;
- `src/domain/product/search.js`;
- `src/domain/product/searchMapping.js`;
- `src/domain/product/searchDiagnostics.js`;
- `src/screens/CatalogScreen.jsx`;
- existing search tests.

Outcome:

- identify exact product fields available to SQL and frontend;
- confirm current `match_type` and `search_rank` contracts;
- confirm merge/dedupe/sort behavior;
- confirm offline fallback behavior;
- list implementation risks before editing.

### Stage 9.1: Contract And Fixtures

Create a search quality fixture/test file before changing ranking. It should encode expected relative ordering, not only “has results”.

Possible locations:

- `tests/unit/catalogSearchQuality.test.mjs` for pure JS scoring helpers;
- SQL verification script if local Supabase data is available;
- Vault QA matrix for manual checks against live pilot store.

Minimum coverage should include dairy, sweets/snacks, grocery, drinks, frozen/ready meals, meat/fish/deli, health/attribute queries, barcode/EAN, typo, quantity, token-order, and nonsense queries.

### Stage 9.2: Shared Query Normalizer

Add a pure helper for frontend/offline and tests, for example:

- normalize case/whitespace;
- normalize `ё` -> `е`;
- tokenize;
- drop or downweight stop words;
- parse quantity tokens;
- classify query intent using a curated table aligned with `categoryMap.js`;
- classify query mode: `product`, `brand`, `ean`, `attribute`, `ingredient`, `mixed`.

Keep it JavaScript for frontend/offline. SQL can mirror the same concepts in a migration.

### Stage 9.3: Offline/Local Fallback Scoring

Replace or strengthen the current simple local fallback with the shared normalizer/scorer so offline search supports:

- meaningful token matching independent of order;
- curated aliases;
- quantity boost;
- brand/product boost;
- product intent category/subcategory boost where local product fields allow it;
- conservative attribute/ingredient matching.

Offline search does not need to equal SQL quality, but it must not remain a weak `includes(query)` layer after Stage 9.

### Stage 9.4: RPC Ranking V2

Add a new migration that replaces `public.fn_search_store_products` with a better scorer. Do not edit old migration `028`.

Ranking components should include:

- exact EAN / alternate EAN;
- exact normalized name/local name;
- exact phrase;
- all query tokens in name/local_name/name_kz in any order;
- product intent category/subcategory boost;
- brand token boost;
- quantity boost;
- token-level trigram typo tolerance;
- FTS rank;
- attribute/ingredient mode scoring;
- penalties for wrong-intent matches when query intent is strong.

### Stage 9.5: Frontend Merge/Sort Policy

Current frontend sorts merged results by Fit-Check verdict first, then `searchRank`. This can be correct for Körset value, but it can also hide search relevance if a weak result has a better Fit verdict.

Confirmed policy for search mode:

1. hard relevance floor/tier first;
2. then Fit-Check inside sufficiently relevant tiers;
3. then `searchRank` and stable tie-breakers.

Default non-search catalog sorting can keep its existing product behavior unless a direct change is required.

### Stage 9.6: Diagnostics Expansion

Stage 7 diagnostics should be expanded with richer `match_type` values such as:

- `ean_exact`;
- `name_exact`;
- `phrase_name`;
- `all_tokens_name`;
- `intent_subcategory`;
- `brand_product`;
- `quantity_match`;
- `token_fuzzy`;
- `attribute_tag`;
- `ingredient_match`;
- `local_fallback`;
- `offline_fallback`.

Update `searchDiagnostics.js` mapping accordingly.

### Stage 9.7: Real-Data QA And Documentation

After unit-level verification, run a real pilot-store QA pass using the search quality matrix below. Update:

- `docs/CONTEXT.md` with a short durable status;
- Vault changelog with implementation details;
- architecture/knowledge notes only if Stage 9 introduces a durable search architecture pattern.

Run `npm run memory:save` after Vault changes when credentials/network are available.

## Execution Checklist

Do not mark Stage 9 complete until all applicable items below are addressed or explicitly deferred with a reason.

- [x] Inspect current search code, SQL RPC, diagnostics, and tests.
- [x] Add/extend unit fixtures for broad grocery search quality, not only milk.
- [x] Implement shared JS query normalization.
- [x] Implement query intent/mode classification.
- [x] Implement quantity parsing and quantity boost.
- [x] Implement curated RU/KZ/Latin aliases.
- [x] Improve offline/local fallback scoring.
- [x] Add new Supabase migration for RPC ranking v2 without editing migration `028`.
- [x] Preserve store scoping: current store only, active store products only, active global products only.
- [x] Preserve security: no profile data in SQL, no service-role exposure, no RLS weakening.
- [x] Implement relevance-first search sorting in `CatalogScreen.jsx`.
- [x] Keep Fit-Check visible and secondary inside relevant result tiers.
- [x] Expand diagnostics `match_type` and diagnostic grouping.
- [x] Add migration 031: quantity normalization (1л↔1000мл), category keyword lookup table, token-level matching.
- [x] Sync SQL category intent boost with `categoryMap.js` `NAME_KEYWORDS` via `search_category_keywords` table.
- [x] Add Playwright E2E smoke test for catalog search UI plumbing.
- [ ] Verify dairy, sweets/snacks, grocery, drinks, frozen/ready meals, meat/fish/deli, attribute, EAN, typo, quantity, and negative queries. (requires real pilot store data + migration 031 applied — deferred to post-deploy QA)
- [x] Run relevant unit tests.
- [x] Run i18n checks if user-facing text changes.
- [x] Run build/lint or targeted checks appropriate to touched files.
- [x] Update `docs/CONTEXT.md` and Vault changelog.
- [x] Apply migration 030 via Supabase Dashboard SQL Editor.
- [ ] Apply migration 031 via Supabase Dashboard SQL Editor.

## Search Quality Matrix

### Dairy

- `молоко` -> direct milk first; milk chocolate/fillings/desserts lower.
- `молокы` -> milk results via typo tolerance.
- `молока` -> milk results via morphology.
- `молоко 1л` -> 1L milk boosted; other milk still visible.
- `1000мл молоко` -> same as 1L milk.
- `топленое молоко` / `молоко топленное` -> all baked milk variants, any word order.
- `молоко Эмиль топленное` -> brand+type if exists; fallback to other baked milk.
- `сүт` -> KZ milk results where data exists.
- `кефир`, `айран`, `ряженка`, `сметана`, `творог`, `сыр`, `сыр моцарелла`, `сливочное масло`.

### Sweets And Snacks

- `сникерс` -> Snickers.
- `snickers` -> Snickers.
- `шоколад` -> chocolate first, not all chocolate-flavored products first.
- `молочный шоколад` -> chocolate category, not milk.
- `печенье шоколадное` / `шоколадное печенье` -> cookies with chocolate.
- `чипсы`, `доритос`, `doritos`, `орехи`, `арахис`, `сухарики`.

### Grocery

- `гречка`, `гречневая крупа`, `крупа гречневая`.
- `рис`, `рис жасмин`, `басмати`.
- `макароны`, `паста`, `спагетти`.
- `мука`, `мука 1кг`.
- `сахар`, `соль`.
- `подсолнечное масло` vs `сливочное масло` must not cross-rank incorrectly.

### Drinks

- `вода`, `вода 1.5л`, `негазированная вода`, `газированная вода`.
- `сок`, `яблочный сок`, `сок 1л`.
- `кока кола`, `coca cola`, `cola`.
- `чай зеленый`, `зеленый чай`, `кофе растворимый`.

### Frozen / Ready Meals

- `пельмени`, `вареники`, `наггетсы`, `котлеты`.
- `мороженое`, `пломбир`, `эскимо`.
- `замороженные овощи`.

### Meat / Fish / Deli

- `колбаса`, `сосиски`, `халал сосиски`.
- `курица`, `фарш`, `говядина`.
- `рыба`, `тунец`, `сайра`, `креветки`, `крабовые палочки`.

### Health / Attribute Queries

- `без сахара` -> sugar-free products.
- `без глютена` -> gluten-free products.
- `халал` -> halal products, likely with category/intent if combined.
- `протеин` -> protein products.
- `пальмовое масло` -> ingredient match, not necessarily product type.
- `без лактозы` -> lactose-free dairy where data supports it.

### Negative / Edge Queries

- nonsense query -> stable no-results state with suggestions.
- one-letter query -> no server RPC.
- barcode/EAN -> exact product first.
- mixed punctuation/case -> normalized.

## Implementation Guardrails

- Do not redesign Catalog UI while fixing search quality.
- Do not weaken store scoping or RLS/security posture.
- Do not send user profile data into SQL ranking.
- Do not rewrite old migrations; add a new migration that replaces the RPC.
- Keep offline fallback functional.
- Add tests before or alongside ranking changes.
- Verify against real pilot store data when possible, not only synthetic tests.

## Recommended Next Chat Prompt

Continue Körset Catalog Search Stage 9 from `docs/vault/plans/2026-05-13-catalog-search-stage9-quality-contract.md`. Do not start with a narrow milk-only fix. First inspect `categoryMap.js`, `028_catalog_search_rpc.sql`, current `CatalogScreen.jsx` merge/sort behavior, and existing search tests. Implement professional search quality incrementally: query normalization, intent/category/subcategory boosts, token-order independent matching, typo tolerance, quantity normalization, brand/product matching, RU/KZ/Latin aliases, diagnostics, and tests. Preserve current UI and fallback layers.
