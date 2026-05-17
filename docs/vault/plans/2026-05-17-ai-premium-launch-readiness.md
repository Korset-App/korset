---
type: plan
status: active
date: 2026-05-17
area: ai
---

# AI Premium Launch Readiness Plan

> For agentic workers: this is the post-Stage-7 handoff for taking Körset AI from local/test-backed premium quality to launch-grade live quality. Do not enable real OpenAI QA spending, high-quality model routing, DB persistence, or controlled web enrichment without owner approval.

**Goal:** make the current AI implementation honestly launch-grade by validating live answer quality, closing the highest-impact gaps, and keeping cost/privacy boundaries intact.

**Architecture:** The AI remains server-side through `/api/ai.js`, grounded by current-store catalog context, deterministic Fit-Check/product facts, and Vault RAG for stable domain knowledge. The model explains, compares, and guides; it does not become the source of product truth.

**Tech Stack:** React 18 + Vite, JavaScript, vanilla CSS, Supabase, Vercel Serverless, OpenAI `gpt-5.4-nano` default, local/Vault memory.

---

## Current Readiness

Implemented and verified locally:

- Safety contract: halal confidence ladder, allergy confidence, balanced missing-data wording.
- General AI: improved store-scoped ranking for meal sets, budget, halal, child snack, sugar-free, lactose-free, vegetarian protein, breakfast sets, and no-match behavior.
- Product AI: structured response metadata with verdict, confidence notes, package checks, same-store alternatives, and warnings.
- UI polish: focused AI surfaces use semantic tokens where touched and Product AI route-state fallback no longer stalls.
- Retail owner value: aggregate-only assortment and analytics insights.
- Observability: privacy-safe usage diagnostics with intent, safety confidence, no-match, product group count, latency, token counts, and error type.
- Cost guardrails: `gpt-5.4-nano` remains default; no automatic `gpt-5.4-mini` routing; limits remain 8/min anonymous, 30/min authenticated, 12 messages, 1200 chars/message, 6000 chars total.

Still not launch-verified:

- Live OpenAI answer quality has not been verified after the full Stage 1-7 upgrade.
- Controlled product enrichment is designed but not implemented.
- Usage events are console-only until the owner approves analytics persistence.
- KZ live answer quality needs manual/live QA, not just unit/i18n checks.

## Launch Gate 1: No-Spend Verification

Run before spending API calls:

```bash
node --test tests/unit/ai*.test.mjs
npm test -- tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiProductMocked.spec.js --reporter=list
npm run check:agent
```

Pass criteria:

- AI unit tests pass.
- Mocked General AI and Product AI browser smoke pass.
- `check:agent` passes.
- No new missing KZ locale keys.
- No privacy regression in usage event tests.

Latest run on 2026-05-17:

- `node --test tests/unit/ai*.test.mjs` passed: 74/74.
- `npm test -- tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiProductMocked.spec.js --reporter=list` passed: 2/2, no real OpenAI calls.
- `npm run check:agent` passed: 277/277 unit tests.

Note: using Windows backslash paths for the Playwright file arguments produced "No tests found"; rerun with forward-slash paths as shown above.

## Launch Gate 2: First Real-Call QA

Run only after owner approves spending real OpenAI calls.

Use the first 10 scenarios from `docs/vault/plans/2026-05-17-ai-premium-qa-matrix.md`:

- General: G-01, G-02, G-03, G-05, G-06.
- Product: P-01, P-02, P-03, P-05, P-07.

Record every case with:

```text
Date:
Store route:
Mode:
Scenario ID:
Prompt:
Product EAN if product mode:
Profile assumptions:
Result: pass | minor | fail | blocked
Failure tags:
What happened:
Expected instead:
Screenshot/recording:
Follow-up action:
```

Decision:

- `8/10 pass` or better: continue to full 32-scenario QA.
- `6-7/10 pass`: fix the strongest recurring pattern first.
- `<6/10 pass`: stop feature expansion and treat live AI quality as not launch-grade yet.

Latest run on 2026-05-17:

- Owner approved the first live QA gate in chat.
- Ran 10 real `gpt-5.4-nano` chat completion scenarios: G-01, G-02, G-03, G-05, G-06, P-01, P-02, P-03, P-05, P-07.
- Initial result: core grounding passed, but recurring polish/safety issues appeared:
  - internal confidence labels leaked into shopper-facing text (`confirmed_halal`, `likely_compatible`, `questionable`);
  - child snack wording placed a nut bar too early before allergy/age clarification;
  - one milk-allergy alternative answer asked whether partial exclusion was enough, which is too soft for direct allergen risk.
- Fixed the prompt contract in `api/ai.js` and locked it with unit tests.
- Reran the 5 affected live scenarios: G-06, P-01, P-02, P-03, P-07.
- Targeted rerun passed: no internal labels in user text, child-snack wording is more cautious, and the direct milk-allergy alternative answer now recommends avoiding the risky product and checking the alternative package.

## High-Impact Fix Order After Real QA

Fix failures in this order:

1. Safety failures: `unsafe_allergy`, `halal_overclaim`, `fitcheck_conflict`.
2. Trust failures: `invented_fact`, `outside_store`, `card_mismatch`.
3. Usefulness failures: `ranking_noise`, `too_generic`, `no_next_step`.
4. Experience failures: `too_verbose`, `ui_state`, `kz_quality`.
5. Cost/latency failures: `cost_latency`.

Each fix should start with a failing unit or mocked E2E test when possible, then run the smallest relevant verification command from the premium plan.

## Controlled Enrichment Decision Point

Implement controlled product enrichment only after live QA shows that missing product facts are a top recurring blocker.

Minimum implementation plan:

- Create mocked tests for an enrichment endpoint/job before network calls.
- Use EAN, exact product name, brand, and package size as lookup keys.
- Mark source confidence as `exact_ean_match`, `probable_product_match`, `weak_match`, `conflict`, or `not_found`.
- Never override deterministic red Fit-Check, direct allergen match, or trusted current-store facts.
- Save external findings as reviewable product-data signals, not automatic truth.
- Show user-facing uncertainty copy when external facts influence an answer.

Stop and ask before:

- adding live web lookup;
- storing enrichment results;
- changing DB schema/RLS;
- adding a paid provider;
- exposing external data as authoritative.

## What Counts As Launch-Grade

AI can be considered launch-grade for pilot only when:

- local checks pass;
- first real-call QA is at least 8/10;
- full QA pack has no critical safety/store-scope failures;
- Product AI never invents same-store alternatives;
- General AI recommendations remain inside the active store;
- KZ answers are understandable and not materially worse than RU for core flows;
- usage logs remain message-content-free;
- cost limits and model routing remain bounded.

## Current Recommendation

Do not add more features yet. The next best action is the no-spend verification gate, then owner-approved 10-call live QA. If live QA passes, continue full QA. If it exposes a recurring issue, fix that pattern before controlled enrichment or further UI work.
