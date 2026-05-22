---
type: changelog
status: done
date: 2026-05-18
area: ai
---

# AI Peak Stage 15: AI UI Shelf-Use Smoke And Polish

## Summary

Stage 15 added deterministic browser smoke coverage for the real shelf-use AI interface states.

The goal was not a broad redesign. The goal was to make sure the existing premium AI UI remains usable on a narrow mobile viewport and on desktop when answers, product names, product cards, quick chips, errors, compare labels, and bottom navigation are all present.

## Changed

- Added `tests/e2e/aiShelfUiMocked.spec.js`.
- Covered General AI mobile with a long assistant reply, product cards, follow-up chips, product-card links, bottom-nav spacing, and horizontal-overflow checks.
- Covered Product AI mobile with quick chips, mocked API error state, composer visibility, bottom-nav spacing, and horizontal-overflow checks.
- Covered Compare mobile with human labels and a no-fake-percentage assertion.
- Covered General AI desktop shell for horizontal-overflow regression.

No production UI code was changed in this stage because the focused smoke checks did not expose a layout collision or overflow regression.

## Verification

- `npm test -- tests/e2e/aiShelfUiMocked.spec.js` passed: 4/4.
- `npm test -- tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiProductMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` passed: 6/6.

## Note

The in-app Browser MCP smoke was attempted against `http://127.0.0.1:5173/s/store-one/ai`, but the local node_repl kernel exited with a sandbox `EPERM` while resolving `C:\Users\User\AppData`.

The Playwright smoke still exercised real Chromium pages against the local Vite app with deterministic mocked `/api/ai` responses, so the UI contract is covered without OpenAI spend or network dependency.

## Next

Stage 16 should focus on Retail Owner Intelligence: stronger aggregate assortment insights, weak-card detection, no-match demand, halal coverage opportunities, and practical next actions for the store owner.
