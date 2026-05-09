---
title: Product AI Smart Suggestions
date: 2026-05-09
status: active
domain: changelog
tags:
  - ai
  - product-ai
  - ux
  - i18n
---

# Product AI Smart Suggestions

## What Changed

- Replaced static Product AI quick chips with product-aware suggestions in `src/domain/ai/productSuggestions.js`.
- Product AI now builds up to 5 suggestions from product facts, user profile, alternatives, stock status, category, ingredients, allergens, and halal preferences.
- The first suggestion is intentionally personal: "Можно мне этот продукт?".
- Risk-heavy suggestions are capped at 2 visible items so the UI does not become only warnings.
- Ingredient-specific suggestions are supported for obvious additives or difficult ingredients, for example `E460`, `мальтодекстрин`, `аспартам`, `желатин`, and `каррагинан`.
- `AIScreen.jsx` renders the first suggestion as the primary chip and wraps the remaining chips compactly above the input.
- Added RU/KZ i18n coverage for the new Product AI suggestion labels and questions.
- Added `tests/unit/aiProductSuggestions.test.mjs` for priority, cap, sparse-data, additive, alternative, and out-of-stock behavior.

## Product Rule

Product AI suggestions should feel clickable and useful for a normal shopper, not like a wall of safety warnings. Prefer one personal question, one composition/explanation question, one purchase/alternative question, one category-useful question, and only one or two risk/status questions when the profile or product facts justify them.

## Verification

- `node --test tests/unit/aiProductSuggestions.test.mjs`
- `node --test tests/unit/aiProductSuggestions.test.mjs tests/unit/aiProductContext.test.mjs tests/unit/alternatives.test.mjs tests/unit/aiService.test.mjs`
- `node scripts/check-i18n.mjs`
- `npx eslint src\screens\AIScreen.jsx src\domain\ai\productSuggestions.js`
- `git diff --check -- src\screens\AIScreen.jsx src\domain\ai\productSuggestions.js src\locales\ru\ai.json src\locales\kz\ai.json tests\unit\aiProductSuggestions.test.mjs`

`npm run build` is currently blocked by an unrelated working-tree deletion: `src/screens/NotificationSettingsScreen.jsx` is missing while `src/App.jsx` still imports it for `/s/:storeSlug/notifications`.
