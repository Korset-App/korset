---
type: changelog
status: active
date: 2026-05-17
area: ai
---

# AI Premium Stage 2 QA Matrix

## Summary

Prepared Stage 2 of the AI Premium Upgrade plan: a real-catalog QA matrix for validating Körset AI before further behavior/UI expansion.

This stage intentionally avoids spending real OpenAI calls until the owner approves API balance usage. It still verifies the mocked browser path so UI regressions and AI response shape can be checked without token cost.

## Changes

- Added `docs/vault/plans/2026-05-17-ai-premium-qa-matrix.md`.
- Updated `docs/vault/plans/2026-05-17-ai-premium-upgrade-plan.md` Stage 2 checklist.

The QA matrix includes:

- 20 General AI scenarios;
- 12 Product AI scenarios;
- global failure rules;
- premium answer expectations;
- mocked browser smoke instructions;
- first 10 real-call gate;
- failure pattern tags;
- QA notes template;
- Stage 2 completion criteria.

## Verification

- `npm test -- tests/e2e/aiGeneralMocked.spec.js --reporter=list` passes: 1/1.

## Deferred

The first 10 real OpenAI QA calls are intentionally deferred until the owner explicitly approves spending API balance.

## Next

Stage 3 should use the QA matrix to improve General AI ranking, grouping, and next-step behavior. If real calls remain deferred, Stage 3 should focus on test-backed local ranking and prompt contract improvements without claiming live answer quality is fully verified.
