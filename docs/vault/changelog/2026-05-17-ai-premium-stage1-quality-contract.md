---
type: changelog
status: active
date: 2026-05-17
area: ai
---

# AI Premium Stage 1 Quality Contract

## Summary

Implemented Stage 1 of the AI Premium Upgrade plan: a test-backed safety contract for balanced halal and allergy behavior.

The goal is to make Körset AI helpful without becoming reckless or helpless:

- halal is now represented as a confidence ladder, not a binary unknown-only refusal;
- allergies remain conservative when profile/product data shows a direct risk;
- missing ingredients trigger package-check guidance;
- Product AI prompt now receives an explicit `SAFETY CONTRACT` block and must explain Fit-Check/safety signals without overruling them.

## Changes

- Added `src/domain/ai/safetyContract.js`.
- Added `tests/unit/aiSafetyContract.test.mjs`.
- Updated `api/ai.js` product prompt to include:
  - `halalConfidence`;
  - `allergyConfidence`;
  - balanced likely-compatible halal wording;
  - explicit instruction not to behave as if AI is fully helpless when visible composition is useful;
  - explicit Fit-Check boundary language.
- Extended `tests/unit/aiProductPrompt.test.mjs` to lock the balanced halal prompt behavior.
- Updated `docs/vault/plans/2026-05-17-ai-premium-upgrade-plan.md` Stage 1 checklist.

## Verification

- `node --test tests/unit/aiSafetyContract.test.mjs` passes: 8/8.
- `node --test tests/unit/aiProductPrompt.test.mjs` passes: 3/3.
- `node --test tests/unit/ai*.test.mjs` passes: 57/57.
- `npm run check:agent` passes, including full unit suite: 254/254.

## Next

Stage 2 should create/run the real-catalog premium QA matrix before further AI UI polish or broad prompt expansion.
