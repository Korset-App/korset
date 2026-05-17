---
type: changelog
status: active
date: 2026-05-17
area: ai
---

# AI Peak Stage 10: Live QA Gate

## Summary

Ran the owner-approved expanded Stage 10 live OpenAI QA gate after Stage 9 no-spend checks passed.

## Live Runs

- Full batch: 13 real `gpt-5.4-nano` chat completion calls.
- Result: 13/13 evaluator pass, 0 review, 0 fail.
- Saved result: `C:\tmp\korset-live-ai-stage10-results.json`.

After manual review, one premium-polish issue was found even though evaluator passed:

- KZ General AI exposed internal stock label `in_stock` in the text.

Fix:

- `api/ai.js` now converts stock statuses in prompts to human wording through `formatStockStatusForPrompt()`.
- General/Product prompts explicitly tell the model not to expose internal fields such as `stockStatus`, `in_stock`, `out_of_stock`, `priceKzt`, `halalConfidence`, and `allergyConfidence`.
- `src/domain/ai/qualityEvaluator.js` now flags those internal catalog fields as `internal_label_leak`.
- Unit tests were expanded.

Targeted rerun:

- KZ-only rerun: `L-KZ-G-01`, `L-KZ-G-02`, `L-KZ-P-01`.
- Result: 3/3 pass, 0 review, 0 fail.
- Saved result: `C:\tmp\korset-live-ai-stage10-kz-rerun.json`.
- The rerun result file contains no `in_stock`, `out_of_stock`, `stockStatus`, `priceKzt`, `halalConfidence`, or `allergyConfidence` strings.

## Verification

- `node --test tests/unit/aiQualityEvaluator.test.mjs tests/unit/aiGeneralPrompt.test.mjs tests/unit/aiProductPrompt.test.mjs tests/unit/aiLiveQualityGate.test.mjs` passed: 18/18.
- Full AI unit suite should be run before final handoff.

## Next Step

Stage 11 should focus on premium response polish: answer tone, compactness, card/text alignment, next-step quality, and KZ/RU wording quality. Do not start controlled enrichment yet.
