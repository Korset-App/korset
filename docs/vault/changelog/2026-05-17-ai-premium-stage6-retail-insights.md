---
title: AI Premium Stage 6 Retail Insights
status: done
date: 2026-05-17
domain: changelog
---

# AI Premium Stage 6 Retail Insights

## Summary

Stage 6 of the AI premium upgrade is complete. Retail dashboard AI insights now provide more practical, store-specific B2B signals without introducing an owner chat or storing user-level analytics.

## Changes

- Extended `src/domain/retail/aiInsights.js` in place because it already existed as a pure aggregate insight builder.
- Added repeated unknown-category demand detection via `category_gap_demand`.
- Added halal assortment opportunity detection via `halal_assortment_gap`.
- Added aggregate weak catalog data detection via `weak_catalog_data`, covering image, composition, halal status, and nutrition gaps for frequently scanned products.
- Kept existing signals for unknown EAN demand, out-of-stock demand, low coverage, lost revenue, activation, weak single-card data, and top demand.
- Added RU/KZ locale copy for the new retail dashboard insight keys.
- Expanded `tests/unit/retailAiInsights.test.mjs` from 5 to 8 tests.

## Product Decision

Retail AI remains deterministic and aggregate-only. It should behave like an analyst for the store owner: explain where demand is leaking, where assortment may be weak, and which catalog data should be fixed first. It must not expose individual shopper behavior or present generic dashboard decoration as AI.

## Verification

- `node --test tests/unit/retailAiInsights.test.mjs` passed: 8/8.
- `node scripts/check-i18n.mjs` passed: 0 missing KZ keys.
- `npm run check:agent:ui` passed, including lint and production build. Lint still reports existing warnings only.
