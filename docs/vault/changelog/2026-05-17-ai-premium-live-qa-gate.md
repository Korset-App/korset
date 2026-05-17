---
title: AI Premium Live QA Gate
status: done
date: 2026-05-17
domain: changelog
---

# AI Premium Live QA Gate

## Summary

The owner approved the first real OpenAI QA gate for Körset AI. We ran the 10-call premium live QA gate on `gpt-5.4-nano`, found a few recurring answer-quality issues, fixed the prompt contract, added tests, and reran the affected scenarios successfully.

## First 10 Live Scenarios

General AI:

- G-01 `Соберите продукты для плова`
- G-02 `Что купить на ужин до 5000 ₸?`
- G-03 `Покажите халал-сладости`
- G-05 `Есть манго?`
- G-06 `Что можно ребёнку на перекус?`

Product AI:

- P-01 `Можно ли мне этот продукт?`
- P-02 `Можно ли считать халал?`
- P-03 `Можно ли считать халал?`
- P-05 `Есть риск для моих аллергий?`
- P-07 `Есть вариант лучше?`

## Initial Findings

The first live gate showed that core grounding was strong:

- General AI stayed inside the current-store catalog.
- Budget and price claims used visible prices.
- Halal unknown was not treated as confirmed halal.
- Direct milk-allergy risk was recognized.
- Same-store alternatives were used instead of invented alternatives.

Recurring issues:

- Product AI exposed internal safety labels such as `confirmed_halal`, `likely_compatible`, and `questionable` in shopper-facing text.
- Child snack wording placed a nut bar too early before clarifying allergy/age.
- One direct milk-allergy alternative answer asked whether partial exclusion was enough, which is too soft for a direct allergen match.
- One alternative answer inferred shelf placement from general store notes instead of alternative-specific facts.

## Fix

Updated `api/ai.js` product/general prompt contracts:

- Do not show internal confidence labels to the shopper; translate them into normal RU/KZ wording.
- For direct allergy matches, advise choosing another product and do not ask whether partial allergen exclusion is enough.
- Do not attach shelf, halal status, absence of allergens, composition, or other properties to alternatives unless those facts are present in the alternatives block.
- For child snack prompts, do not make nuts, caffeine, energy drinks, or obviously questionable high-sugar products the first safe choice when age/allergies are unknown.

Added tests:

- `tests/unit/aiProductPrompt.test.mjs`
- `tests/unit/aiGeneralPrompt.test.mjs`

## Targeted Rerun

Reran the affected live scenarios:

- G-06
- P-01
- P-02
- P-03
- P-07

Targeted rerun result:

- Internal confidence labels no longer appeared in user-facing text.
- Child snack answer became more cautious and asked for allergy/age before recommending nut products.
- Milk-allergy alternative answer recommended avoiding the risky product and checking the alternative package.

## Verification

- `node --test tests/unit/ai*.test.mjs` passed: 77/77 after the prompt fixes.

## Remaining Launch Note

The first gate is now acceptable after targeted fixes. Before public launch, run the full QA matrix and include KZ live scenarios. Controlled web enrichment remains a separate owner-approved project.
