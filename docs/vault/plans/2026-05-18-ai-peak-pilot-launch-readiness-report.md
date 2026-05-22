---
type: report
status: active
date: 2026-05-18
area: ai
---

# AI Peak Pilot Launch Readiness Report

## Verdict

Körset AI is ready for owner manual pilot review, not for an unqualified public launch claim.

The core engineering gate is green: unit contracts, no-spend AI QA, mocked browser UI smoke, i18n, lint, build, docs, model routing, cost limits, privacy-safe diagnostics, comparison ranking, controlled enrichment contract, and retail owner intelligence all pass local verification.

The remaining gap is not basic correctness. The remaining gap is taste and live answer review after the latest Stage 14-17 changes. Live OpenAI QA was not rerun in Stage 18 because live calls beyond the already approved scope require explicit owner approval.

## Gate Results

- `node --test tests/unit/ai*.test.mjs tests/unit/productComparison.test.mjs tests/unit/retailAiInsights.test.mjs` passed: 127/127.
- `npm run check:ai:qa` passed: 12/12 no-spend scenarios.
- `npm run check:ai:live:dry` listed 13 scenarios and made no OpenAI calls.
- `npm test -- tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiProductMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` passed: 6/6.
- `node scripts/check-i18n.mjs` passed: 0 missing KZ keys, 0 orphan KZ keys, 0 empty values.
- `npm run lint` passed with existing warnings only: 0 errors, 57 warnings.
- `npm run build` passed.
- `npm run check:agent:docs` passed.

## What Is Ready

- General AI is store-scoped and catalog-grounded.
- Product AI has structured verdict metadata, confidence notes, package checks, and same-store alternatives.
- Compare flow no longer exposes misleading pseudo-percent scores; deterministic ranking controls the UI and compare prompt.
- Halal handling uses balanced confidence instead of helpless unknown-only behavior.
- Allergy handling remains conservative and does not soften direct risk.
- Controlled external enrichment is implemented behind strict trigger/classification rules and lower-confidence wording.
- No-spend QA checks catch safety, store-scope, internal-label, markdown, no-match, and next-step regressions.
- Mobile UI smoke covers long answers, product cards, quick chips, error state, compare labels, bottom-nav spacing, and desktop overflow.
- Retail owner AI insights now produce aggregate next actions without user-level analytics.
- AI observability persistence is documented but not implemented; current usage diagnostics stay console-only.

## Remaining Risks

- Live answer taste after Stage 14-17 has not been revalidated with fresh OpenAI calls.
- KZ answers are covered by no-spend fixtures and previous live checks, but still need owner manual reading for tone and naturalness.
- Real store catalog distribution can expose edge cases that fixtures do not cover: sparse cards, uncommon categories, weird names, duplicate EANs, and low-quality imported ingredients.
- Controlled enrichment relies on existing service-role server access and external provider availability; buyer-visible facts are gated, but operational monitoring is still manual.
- AI analytics persistence is only designed. Without persistence, cost/no-match trends are not durable product analytics.
- Existing lint warnings remain in unrelated parts of the app. They are warnings, not current launch blockers, but should be cleaned up separately.

## Pilot Recommendation

Use this build for a controlled owner/internal pilot review.

Do not make a public launch claim yet. Before broader pilot exposure, run one owner-approved live QA gate and manually inspect:

- 4 RU General AI prompts.
- 4 RU Product AI prompts.
- 3 KZ prompts.
- 2 compare explanation prompts.
- 2 sparse-card / missing-fact prompts.

If those answers are acceptable, the next step is a real pilot with close observation rather than more speculative AI feature work.

## Explicit Non-Changes In Stage 18

- No live OpenAI calls were made.
- No DB/RLS/auth/schema changes were made.
- No AI analytics persistence was implemented.
- No model routing changes were made.
- No public launch claim was made.
