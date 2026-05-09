---
title: Store-aware AI Phase 6 - Retail AI Insights
date: 2026-05-09
status: active
domain: changelog
tags:
  - ai
  - retail
  - dashboard
  - analytics
---

# Store-aware AI Phase 6 - Retail AI Insights

## What Changed

- Added `src/domain/retail/aiInsights.js` as a pure aggregate insight builder for retail owner signals.
- Added `tests/unit/retailAiInsights.test.mjs` covering:
  - priority order for demand signals;
  - max insight count;
  - honest empty state when there is no signal;
  - activation nudge when a catalog exists but scans are absent;
  - weak product data for frequently scanned incomplete cards.
- Added the “KÖRSET AI заметил” block to `RetailDashboardScreen.jsx`.
- Added RU/KZ i18n keys for the dashboard block and all insight variants.

## Insight Sources

The block uses only existing dashboard aggregate data:

- scan count;
- missed opportunities from `get_missed_opportunities`;
- catalog scan coverage;
- estimated lost revenue;
- top scanned products.

No user-level analytics, owner chat, prediction model, or new database query was added.

## Current Insight Types

- `unknown_ean_demand` - unknown EAN demand from repeated scans.
- `out_of_stock_demand` - products scanned while out of stock.
- `low_catalog_coverage` - scan coverage below 70%.
- `lost_revenue` - estimated missed revenue.
- `weak_product_data` - frequently scanned top products with missing name or image.
- `top_product_demand` - clear top scanned product.
- `activate_scans` - catalog exists but scans are absent.

## Verification

- `node --test tests/unit/retailAiInsights.test.mjs`
- `node --test tests/unit/retailAiInsights.test.mjs tests/unit/aiProductContext.test.mjs tests/unit/retailStoreSettings.test.mjs`
- `node scripts/check-i18n.mjs`
- `npm run build`
- `npm run lint` (0 errors, existing warnings remain)
- `git diff --check` on touched Phase 6 files
