---
type: changelog
status: active
date: 2026-05-17
area: ai
---

# AI Peak Stage 10: Live QA Prep

## Summary

Prepared Stage 10 for expanded live OpenAI QA without spending calls yet. The previous live QA gate used a temporary script in `C:\tmp`; this stage moves the workflow into the repository with a safe dry-run default.

## What Changed

- Added `src/domain/ai/liveQualityGate.js`.
- Added `tests/unit/aiLiveQualityGate.test.mjs`.
- Added `scripts/run-live-ai-quality-gate.mjs`.
- Added npm script: `npm run check:ai:live:dry`.

## Live Scenario Batch

The prepared batch has 13 scenarios:

- RU General AI: meal set, budget, halal, child snack, no-match, milk-allergy sweets.
- RU Product AI: halal on unknown/simple composition, direct milk allergy, alternatives, missing product facts.
- KZ General AI: meal set, child snack.
- KZ Product AI: missing product facts.

## Safety

- Default mode is dry-run and does not load `.env.local`.
- OpenAI calls require explicit `--live`.
- API key is never printed.
- Live result saving is explicit via `--save`.
- The live runner evaluates replies through `evaluateAIResponseQuality()`.

## Prepared Commands

```bash
npm run check:ai:live:dry
node scripts/run-live-ai-quality-gate.mjs --live --save C:\tmp\korset-live-ai-stage10-results.json
```

The live command should only run after owner approval because it spends real OpenAI calls.

## Verification

- `node --test tests/unit/aiLiveQualityGate.test.mjs` passed: 3/3.
- `npm run check:ai:live:dry` listed 13 scenarios and made no OpenAI/network calls.

## Next Step

Ask the owner to approve the 13-call live QA run. If approved, run the live command, review failures by issue tag, then add tests/fixes for any recurring pattern before moving to Stage 11.
