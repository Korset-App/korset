---
type: plan
status: active
date: 2026-05-17
area: ai
---

# AI Peak Quality Roadmap

> For agentic workers: execute this roadmap stage-by-stage only. Do not jump to later stages until the owner says "продолжаем". Do not enable live web enrichment, DB/RLS changes, persisted chat logs, paid provider changes, or automatic premium model routing without explicit owner approval.

**Goal:** take Korset AI from "good upgraded assistant" to a pilot-grade premium store consultant: grounded in the current store, useful at the shelf, honest about missing facts, strong on halal/allergies, bilingual enough for RU/KZ launch, measurable, and not dependent on manual owner testing for every step.

**Architecture:** Keep `/api/ai.js` as the server-side AI boundary. Deterministic product facts, Fit-Check, current-store catalog, safety helpers, and response normalization remain the source of truth; the model explains and guides. Quality work must create repeatable tests, evaluators, QA packs, and smoke checks before more features.

**Tech Stack:** React 18 + Vite, JavaScript, vanilla CSS, Supabase, Vercel Serverless, OpenAI `gpt-5.4-nano` by default, local unit tests, mocked Playwright, owner-approved live QA only when needed.

---

## Non-Negotiable Product Principles

1. Store first: recommendations must stay inside the active store catalog unless the answer clearly says the item is not in this store.
2. Product facts first: use product card/store data before external data.
3. External data only when needed: if the card lacks the exact fact the user asks for, controlled enrichment may be used later, but it must be marked as lower-confidence.
4. Fit-Check wins: AI explains Fit-Check and can add context, but must not overrule direct allergen risk or trusted product facts.
5. Helpful, not timid: if facts are incomplete, the assistant should still guide the next step without pretending to know.
6. Premium compactness: answers should be concise, structured, and useful, not robotic or overloaded.
7. RU/KZ parity for core flows: Kazakh can be simpler, but must not be materially worse or misleading.
8. B2B value: owner-side AI work should improve assortment decisions, weak data detection, and retention value.

## Stage 8: AI Quality OS Foundation

**Purpose:** stop relying only on manual taste checks by adding a reusable answer evaluator and locking the next peak-quality roadmap.

**Files:**
- Create: `src/domain/ai/qualityEvaluator.js`
- Create: `tests/unit/aiQualityEvaluator.test.mjs`
- Create: `docs/vault/plans/2026-05-17-ai-peak-quality-roadmap.md`
- Update: `docs/CONTEXT.md`
- Create: `docs/vault/changelog/2026-05-17-ai-peak-stage8-quality-os.md`

**Acceptance:**
- Evaluator flags internal label leakage.
- Evaluator flags products outside the active store.
- Evaluator flags unsafe positive wording when a direct allergy warning exists.
- Evaluator flags uncontrolled external-data wording.
- Evaluator allows external-data wording only when it is explicitly enabled and uncertainty is marked.
- Roadmap defines the rest of the work in controlled stages.

**Status:** completed on 2026-05-17.

**Verification:**
- `node --test tests/unit/aiQualityEvaluator.test.mjs` passed: 6/6.
- `node --test tests/unit/ai*.test.mjs` passed: 83/83.
- `npm run check:agent:docs` passed.

## Stage 9: Full No-Spend QA Matrix Runner

**Purpose:** turn the existing QA matrix into a repeatable local gate before spending API calls.

**Work:**
- [x] Create a scripted QA fixture layer for General AI and Product AI prompts without real OpenAI calls.
- [x] Cover RU and KZ prompts for halal, allergies, child snacks, budget, meal sets, no-match, alternatives, and missing product facts.
- [x] Feed mocked responses through `evaluateAIResponseQuality()`.
- [x] Add a compact report format with pass/review/fail counts and issue tags.

**Acceptance:**
- [x] One command can run the no-spend AI quality gate: `npm run check:ai:qa`.
- [x] Failures are grouped by pattern: safety, store scope, hallucination/external data, usefulness, tone/length, KZ quality.
- [x] The gate does not call OpenAI.

**Status:** completed on 2026-05-17.

**Verification:**
- `node --test tests/unit/aiNoSpendQualityGate.test.mjs` passed: 4/4.
- `npm run check:ai:qa` passed: 12/12 no-spend scenarios.

## Stage 10: Expanded Live QA Gate

**Purpose:** verify real `gpt-5.4-nano` behavior after no-spend gates are stable.

**Work:**
- [x] Prepare a reproducible live QA runner with a safe dry-run default.
- [x] Expand from the first 10-call gate to a 13-scenario RU/KZ General/Product batch.
- [x] Include KZ cases and product missing-data cases.
- [x] Run owner-approved live QA only after Stage 9 passes and owner approves real OpenAI calls.
- [x] Save structured live findings into Vault after the live run.

**Acceptance:**
- [x] No critical safety/store-scope failures.
- [x] At least 85% pass/review-good rate across the full live pack.
- [x] Any recurring failure pattern gets a test before prompt/code changes.

**Status:** completed on 2026-05-17.

**Prepared commands:**
- Dry run/no spend: `npm run check:ai:live:dry`.
- Live run after owner approval: `node scripts/run-live-ai-quality-gate.mjs --live --save C:\tmp\korset-live-ai-stage10-results.json`.

**Verification:**
- `node --test tests/unit/aiLiveQualityGate.test.mjs` passed: 3/3.
- `npm run check:ai:live:dry` lists 13 scenarios and makes no OpenAI/network calls.
- Owner-approved live run completed: 13/13 pass, saved to `C:\tmp\korset-live-ai-stage10-results.json`.
- Manual review found one KZ polish issue: `in_stock` leaked into a Kazakh answer.
- Fixed prompt stock-status wording and evaluator internal-label coverage.
- Targeted KZ live rerun completed: 3/3 pass, saved to `C:\tmp\korset-live-ai-stage10-kz-rerun.json`.

## Stage 11: Premium Response Polish

**Purpose:** make answers feel like a calm personal shopper, not a generic chatbot.

**Work:**
- [x] Tune the prompt contract away from visible markdown/list dumping and toward compact conversational replies.
- [x] Lock product/general prompts to avoid exposing internal field names while still using human-readable store facts.
- [x] Extend the evaluator to flag visible markdown and missing next-step behavior when a scenario requires it.
- [x] Extend the no-spend QA gate so premium next-step/markdown regressions can be tracked as issue tags.

**Acceptance:**
- [x] Common answers have a clear verdict, reason, and next step.
- [x] No repeated card-by-card narration.
- [x] No timid "I don't know" when the system can give a useful lower-confidence path.

**Status:** completed on 2026-05-17.

**Verification:**
- `node --test tests/unit/ai*.test.mjs` passed: 95/95.
- `npm run check:ai:qa` passed: 12/12 no-spend scenarios.
- `npm run check:ai:live:dry` listed 13 scenarios and made no OpenAI/network calls.

## Stage 12: Controlled Enrichment Architecture Lock

**Purpose:** prepare external fact lookup without turning chat into uncontrolled browsing.

**Work:**
- [x] Convert the existing architecture note into implementation-level contracts.
- [x] Define request shape, allowed lookup keys, source confidence, cache behavior, review status, and user-facing copy.
- [x] Add mocked tests first.

**Acceptance:**
- [x] No network calls yet.
- [x] The owner can approve the exact cost/safety behavior before implementation.

**Status:** completed on 2026-05-17.

**Verification:**
- `node --test tests/unit/aiEnrichmentContract.test.mjs` passed: 6/6.
- `node --test tests/unit/ai*.test.mjs` passed: 101/101.
- `npm run check:ai:qa` passed: 12/12 no-spend scenarios.
- `npm run check:agent:docs` passed.

## Stage 13: Controlled Enrichment Implementation

**Purpose:** help when product cards lack composition, halal clues, nutrition, or exact facts.

**Work:**
- [x] Add controlled enrichment behind the Stage 12 trigger rules.
- [x] Cache findings as reviewable signals in existing `external_product_cache`, not automatic truth.
- [x] Never override Fit-Check, direct allergen matches, trusted product facts, current-store price, or stock.
- [x] Feed strong external references into Product AI as lower-confidence context only.

**Acceptance:**
- [x] Missing-fact answers become more useful.
- [x] External data is always visibly lower-confidence.
- [x] Cost and rate limits remain bounded.

**Status:** completed on 2026-05-17.

**Verification:**
- `node --test tests/unit/ai*.test.mjs` passed: 108/108.
- `npm run check:ai:qa` passed: 12/12 no-spend scenarios.
- `npm run check:ai:live:dry` listed 13 scenarios and made no OpenAI calls.
- Live NPC + Supabase smoke passed: weak NPC candidate was persisted as review-only and not shown to buyer; test row was removed after verification.

## Stage 14: Compare And Ranking Cleanup

**Purpose:** remove misleading "magic score" behavior and align comparison with Fit Priority.

**Work:**
- [x] Audit compare/rating logic.
- [x] Replace visible magic percentages with human labels.
- [x] Add tests for allergy, halal, stock, price, and data completeness precedence.

**Acceptance:**
- [x] Buyer sees understandable labels, not fake precision.
- [x] The "better product" explanation matches deterministic ranking.

**Status:** completed on 2026-05-18.

**Verification:**
- `node --test tests/unit/ai*.test.mjs tests/unit/productComparison.test.mjs` passed: 116/116.
- `npm run check:ai:qa` passed: 12/12 no-spend scenarios.
- `node scripts/check-i18n.mjs` passed: all KZ keys present.
- `npm run build` passed.
- `npm run lint` passed with existing warnings only: 0 errors, 57 warnings.

## Stage 15: AI UI Shelf-Use Smoke And Polish

**Purpose:** make the AI experience reliable on mobile in real store use.

**Work:**
- [x] Browser smoke for General AI and Product AI on mobile and desktop.
- [x] Verify loading, error, empty, long-answer, product-card, and bottom-nav spacing states.
- [x] Fix only focused UI issues, no broad redesign.

**Acceptance:**
- [x] No layout collisions.
- [x] Product cards and quick chips remain usable on mobile.
- [x] Light/dark themes stay clean.

**Status:** completed on 2026-05-18.

**Verification:**
- Added `tests/e2e/aiShelfUiMocked.spec.js`.
- `npm test -- tests/e2e/aiShelfUiMocked.spec.js` passed: 4/4.
- `npm test -- tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiProductMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` passed: 6/6.
- In-app Browser MCP smoke was attempted, but the local node_repl kernel exited on a sandbox `EPERM` while resolving `C:\Users\User\AppData`; Playwright browser smoke covers the same local Vite routes with deterministic mocked AI responses.

## Stage 16: Retail Owner Intelligence Upgrade

**Purpose:** make AI more valuable for stores, not only shoppers.

**Work:**
- [x] Improve assortment gap insights, weak-card detection, no-match demand, and halal coverage opportunities.
- [x] Keep analytics aggregate-only.
- [x] Add practical next actions for the owner.

**Acceptance:**
- [x] Dashboard insights feel store-specific.
- [x] Empty/sparse data states are honest.
- [x] No user-level behavior is exposed.

**Status:** completed on 2026-05-18.

**Verification:**
- `node --test tests/unit/retailAiInsights.test.mjs` passed: 11/11.
- `node --test tests/unit/retailAiInsights.test.mjs tests/unit/retailStoreSettings.test.mjs tests/unit/retailImportCore.test.mjs` passed: 15/15.
- `node scripts/check-i18n.mjs` passed: all KZ keys present.
- `npm run lint` passed with existing warnings only: 0 errors, 57 warnings.
- `npm run build` passed.

## Stage 17: Observability Persistence Decision

**Purpose:** decide whether console-only usage diagnostics should become real product analytics.

**Work:**
- [x] Propose storage schema or external analytics path.
- [x] Define privacy constraints and retention.
- [x] Do not implement DB/RLS changes without approval.

**Acceptance:**
- [x] Owner has a clear yes/no decision with tradeoffs.
- [x] No message content logging is introduced.

**Status:** completed on 2026-05-18.

**Decision:**
- Recommendation: persist AI diagnostics later as metadata-only Supabase events, not as chat logs.
- Keep console-only logging until owner explicitly approves DB/RLS implementation.
- Decision note: `docs/vault/decisions/2026-05-18-ai-observability-persistence.md`.

**Verification:**
- `npm run check:agent:docs` passed.

## Stage 18: Pilot Launch Gate

**Purpose:** decide honestly whether AI is ready for pilot users.

**Work:**
- [x] Run unit, mocked QA, UI smoke, i18n, build, and live QA dry-run.
- [x] Defer fresh live OpenAI QA until explicit owner approval.
- [x] Produce a short launch-readiness report.
- [x] List remaining known risks.

**Acceptance:**
- [x] No critical safety/store-scope failures in local/no-spend gates.
- [x] KZ core fixtures pass; fresh live KZ taste review still needs owner-approved live QA.
- [x] Cost limits and model routing remain controlled.
- [x] Owner manual review can focus on taste, not basic correctness.

**Status:** completed on 2026-05-18.

**Report:**
- `docs/vault/plans/2026-05-18-ai-peak-pilot-launch-readiness-report.md`.

**Verification:**
- `node --test tests/unit/ai*.test.mjs tests/unit/productComparison.test.mjs tests/unit/retailAiInsights.test.mjs` passed: 127/127.
- `npm run check:ai:qa` passed: 12/12 no-spend scenarios.
- `npm run check:ai:live:dry` listed 13 scenarios and made no OpenAI calls.
- `npm test -- tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiProductMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` passed: 6/6.
- `node scripts/check-i18n.mjs` passed: 0 missing KZ keys.
- `npm run lint` passed with existing warnings only: 0 errors, 57 warnings.
- `npm run build` passed.
- `npm run check:agent:docs` passed.

## Owner Checkpoints

Ask the owner before:

- Live OpenAI QA beyond already approved scope.
- Controlled internet enrichment implementation.
- Persisting chat or usage analytics in DB.
- Changing Supabase schema/RLS/auth.
- Automatic high-quality model routing.
- Major AI UI redesign.
- Public launch claim.
