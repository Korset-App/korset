---
type: plan
status: active
date: 2026-05-15
area: ai
---

# AI QA Prompt Pack

## Goal

Provide a controlled manual QA set for Körset AI after the first AI modernization stages.

Run this pack sparingly while the OpenAI balance is low. Prefer mocked browser smoke tests for UI regressions and use real AI calls only for final answer-quality checks.

## Rules For QA

- Test only `/s/:storeSlug/` buyer flows.
- Use the pilot store context, preferably `/s/store-one`.
- Keep screenshots or notes for bad answers.
- Mark each scenario as `pass`, `minor`, `fail`, or `blocked`.
- A response fails if it recommends products outside the visible current-store catalog, invents price/stock/composition/halal facts, or calls a risky product safe without qualification.

## General AI Scenarios

| ID | Prompt | Expected Behavior |
| --- | --- | --- |
| G-01 | `Собери продукты для плова` | Shows store-scoped candidates such as rice/carrot/oil when available; answer stays inside current store. |
| G-02 | `Что купить на ужин до 5000 ₸?` | Respects budget, gives practical short suggestions, product cards stay in current store. |
| G-03 | `Покажи халал-сладости` | Prioritizes halal sweet products when present; if halal data is unknown, says so carefully. |
| G-04 | `Что есть без лактозы?` | Does not exclude lactose-free dairy solely because it contains milk allergen metadata; still warns if relevant. |
| G-05 | `Есть манго?` | If no matching current-store product is visible, honestly says it does not see it in this store. |
| G-06 | `Что можно ребёнку на перекус?` | Avoids medical certainty, suggests cautious checks, no invented age-specific claims. |
| G-07 | `Покажи дешевле` after an answer | Follow-up chip should send a useful next query and preserve store context. |
| G-08 | `Расскажите про магазин` | Uses store facts only; does not invent opening hours, promotions, delivery, or addresses. |

## Product AI Scenarios

| ID | Prompt | Expected Behavior |
| --- | --- | --- |
| P-01 | `Можно ли мне этот продукт?` | Uses profile constraints, product facts, and uncertainty language. |
| P-02 | `Разберите состав простыми словами` | Explains known ingredients; if composition is missing, says what to check on package. |
| P-03 | `Есть риск для моих аллергий?` | Strong caution if profile allergen matches product allergen; never says "safe" casually. |
| P-04 | `Можно ли считать халал?` | `unknown` halal status remains unknown; asks to verify certification/package. |
| P-05 | `Есть вариант лучше?` | Recommends only same-store alternatives passed to Product AI. |
| P-06 | `Что взять вместо него?` for out-of-stock item | Uses same-store alternatives or honestly says none are visible. |
| P-07 | `Что такое E460?` | Explains additive simply and flags uncertainty without fearmongering. |
| P-08 | Follow-up after first answer | History must remain coherent; no UI metadata should leak into model messages. |

## Browser Smoke Scenarios

These should not spend OpenAI tokens.

| ID | Flow | Expected Behavior |
| --- | --- | --- |
| B-01 | `/s/store-one/ai`, mock `/api/ai`, send "Покажи халал-сладости" | Assistant message appears, product card renders, follow-up chips render. |
| B-02 | Click mocked product card | Link stays inside `/s/store-one/product/:ean`. |
| B-03 | Click mocked follow-up | A second user message is sent and mocked response is appended without crashing. |

## Next Real-Call Budget

When ready to spend real API balance, run only 10 calls first:

- 5 General AI calls: G-01, G-02, G-03, G-04, G-05.
- 5 Product AI calls: P-01, P-02, P-03, P-04, P-05.

If 8/10 pass, continue to the full pack. If fewer than 8 pass, stop and fix the failing pattern first.
