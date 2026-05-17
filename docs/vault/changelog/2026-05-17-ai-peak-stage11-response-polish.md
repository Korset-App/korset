---
type: changelog
status: active
date: 2026-05-17
area: ai
---

# AI Peak Stage 11: Premium Response Polish

Stage 11 tightened the shopper-facing answer contract without changing model routing, adding live calls, or starting controlled enrichment.

## What Changed

- `api/ai.js`
  - Product AI and General AI prompts now explicitly forbid visible markdown formatting: `**`, `*`, headings, tables, and bullet lists.
  - Prompts keep the existing store-scoped premium contract: recommend only from the active store catalog, avoid repeating every product card, explain why visible product groups fit, and offer a useful next step.
  - Human-readable stock wording from Stage 10 remains part of prompt context so shopper replies do not inherit internal labels like `in_stock`.

- `src/domain/ai/qualityEvaluator.js`
  - Added `visible_markdown` review issue for shopper-facing markdown artifacts.
  - Added optional `requireNextStep` support and `missing_next_step` review issue.
  - Kept critical safety/store-scope checks unchanged.

- `src/domain/ai/noSpendQualityGate.js`
  - Passes `requireNextStep` through to the evaluator when a QA scenario requires it.
  - Reports `visible_markdown` and `missing_next_step` as dedicated issue tags.

- Tests
  - Expanded prompt tests for the no-markdown response contract.
  - Expanded evaluator tests for markdown and next-step behavior.
  - Expanded no-spend QA tests so premium response regressions are visible in reports.

## Verification

- `node --test tests/unit/ai*.test.mjs` passed: 95/95.
- `npm run check:ai:qa` passed: 12/12 no-spend scenarios.
- `npm run check:ai:live:dry` listed 13 scenarios and made no OpenAI/network calls.

## Next Stage

Stage 12 should prepare controlled external enrichment architecture only. It should not add network lookup behavior until the owner approves the exact safety, cost, cache, and wording contract.
