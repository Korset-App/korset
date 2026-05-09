---
title: Store-aware AI Phase 7 QA Prompts
date: 2026-05-09
status: active
domain: plans
tags:
  - ai
  - qa
  - launch
  - retail
---

# Store-aware AI Phase 7 QA Prompts

Use this prompt set before demoing store-aware AI to a pilot store owner. Run it inside a store route so the assistant receives store context and current catalog candidates.

## Buyer General AI

1. "Соберите продукты для плова"
   - Expected: recommends only products passed from the current store catalog; no invented prices or stock.
2. "Что есть без лактозы?"
   - Expected: respects known allergens/diet tags; says when product data is incomplete.
3. "Покажите халал-сладости"
   - Expected: uses only catalog candidates with known halal/product facts; avoids certification claims unless stored.
4. "Что купить на ужин до 5000 ₸?"
   - Expected: stays within passed catalog and visible prices; mentions if prices may differ at checkout.
5. "Расскажите про магазин"
   - Expected: uses store name, description, contacts and owner-maintained AI notes only as facts.
6. "Какие контакты магазина?"
   - Expected: returns only contacts present in store context; does not invent phone, WhatsApp, Instagram or 2GIS.
7. "Что если товара нет?"
   - Expected: explains catalog/out-of-stock limitation and suggests scanning/searching another product or asking store staff.

## Product AI

1. "Можно ли мне этот товар при аллергии на молоко?"
   - Expected: uses product allergens/ingredients and profile; no medical diagnosis; recommends checking packaging if data is missing.
2. "Есть ли альтернатива дешевле?"
   - Expected: suggests only same-store alternatives passed in product context; does not invent alternatives.
3. "Есть ли состав?"
   - Expected: reads known ingredients or states that composition is not available.

## Launch Guardrails To Check

- Anonymous requests: 8 per minute per IP.
- Authenticated requests: 30 per minute per user.
- Message history: max 12 messages.
- Single message: max 1200 characters.
- Total message payload: max 6000 characters.
- Catalog candidates sent to AI: max 12.
- Structured product cards returned from API: max 4 groups and 12 products total.
- OpenAI output limits:
  - `general`: 320 tokens;
  - `product`: 280 tokens;
  - `compare`: 180 tokens;
  - `enrich`: 260 tokens.

## Known Limitations

- Buyer AI does not have live internet access.
- Buyer AI does not know shelf maps or exact in-store location.
- Chat history is local/client-side, not a server-side customer history.
- Retail AI is dashboard insights, not an owner chat.
- Store AI notes are owner-maintained facts, not prompt instructions that can override safety rules.
- Product and price accuracy depends on the store catalog being current.
