---
title: Alternatives Professional Upgrade
date: 2026-05-22
domain: changelog
status: completed
area: product
related: [[2026-05-22-alternatives-professional-upgrade-plan]] · [[product-comparison-engine]]
---

# Alternatives Professional Upgrade

Completed the professional alternatives flow for product cards.

## What Changed

- Added Supabase RPC migration `033_product_alternatives_rpc.sql` with `fn_get_product_alternatives` for same-store alternative retrieval and base ranking.
- Added domain support for alternative scenarios, RPC row mapping, profile-aware reranking, incomplete-composition handling, out-of-stock lowering, and local fallback.
- Rebuilt `AlternativesScreen.jsx` around scenario chips: `Похожие`, `Подходят мне`, `Дешевле`, `Лучший состав`.
- Added professional alternative cards with image, brand/quantity, price, stock status, reason text, incomplete-composition note, open action, compare action, and contextual AI help.
- Added ProductScreen risky Fit-Check callout that opens alternatives in the `fits_me` scenario.
- Renamed the common product AI action from visible `AI` wording to `Спросить ИИ` / `ЖИ-дан сұрау`.
- Added contextual alternative-selection behavior in Product AI: the chat is separated by `alternative_selection` mode and receives the current product, selected scenario, and visible alternatives.
- Added metadata-only analytics for scenario selection, product opening, compare click, and AI help click through `src/utils/alternativeAnalytics.js`.
- Added `supabase/migrations/035_alternative_events.sql` for persistent alternatives analytics with RLS and store-owner read access.
- Added owner-facing Retail Dashboard aggregation for alternatives: total alternative interactions, compare clicks, AI help clicks, top scenario, and top source EAN for the selected period.
- Moved Retail Dashboard alternative aggregation to server-side RPC `fn_get_alternative_events_summary` in `supabase/migrations/036_alternative_events_summary_rpc.sql`.
- Added retail AI insight `alternative_decision_demand` so active alternative usage becomes an actionable owner signal.

## Data And Privacy

- The owner applied migration `033_product_alternatives_rpc.sql` manually in Supabase after correcting SQL function syntax.
- Persistent analytics stores only event metadata: store id, source EAN, candidate EAN, scenario, event type, alternatives count, client token, and timestamp.
- Alternative analytics intentionally avoids raw profile data, allergens, user messages, email, phone, IP, user id, and full product composition.
- RLS allows anon/authenticated inserts only for validated event types, EANs, scenarios, and non-null client tokens. Reads are owner-only through the existing store ownership model.
- Retail Dashboard reads aggregate-safe summary data through `fn_get_alternative_events_summary`; the RPC is `SECURITY INVOKER`, so `alternative_events` RLS stays in force.

## Verification

- `node --test tests/unit/alternativeAnalytics.test.mjs tests/unit/alternativeScenarios.test.mjs tests/unit/alternatives.test.mjs tests/unit/alternativesRpcMapping.test.mjs` passed 15/15.
- `node --test tests/unit/retailAlternativeAnalytics.test.mjs tests/unit/alternativeAnalytics.test.mjs tests/unit/retailAiInsights.test.mjs` passed 16/16.
- Final targeted alternatives/retail unit set passed 30/30.
- `node scripts/check-i18n.mjs` passed.
- `npm run lint` exited 0 with existing warnings outside this feature.
- `npm run build` passed.
- Browser smokes passed for:
  - RPC-backed alternatives screen at `/s/store-one/product/4601751002907/alternatives`;
  - ProductScreen risky callout opening `Подходят мне`;
  - compare CTA opening `/compare/:ean2`;
  - `Помочь выбрать` opening contextual Product AI with alternative-selection payload;
  - metadata-only frontend analytics events.
- Added automated Playwright smoke `tests/e2e/alternatives.spec.js`; it mocks the alternatives RPC and `alternative_events` insert, verifies scenario chips/cards, captures metadata-only frontend events, and confirms compare navigation.

## Follow-Up

- Apply `supabase/migrations/035_alternative_events.sql` in Supabase before relying on persisted alternative analytics in live data.
- Apply `supabase/migrations/036_alternative_events_summary_rpc.sql` in Supabase before relying on Retail Dashboard alternative summary RPC in live data.
- Future V2 can add price-per-unit ranking once package/unit normalization is reliable enough for shopper-facing decisions.
