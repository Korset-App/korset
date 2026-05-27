---
type: changelog
status: done
date: 2026-05-27
area: ai-ui
---

# AI Assistant Stage 3 Capability Model

## Summary

Completed Stage 3 of the `/s/:storeSlug/ai` redesign workstream: selected and codified six high-value general AI capability cards before visual card implementation.

## Decision

Use 6 capability cards, not 7 or 8, for the V1 general AI empty state:

1. Find product.
2. Pick alternative.
3. Explain composition.
4. Build shopping list.
5. Check if it fits me.
6. Shop by budget.

This keeps the first visual implementation focused and avoids noisy or marginal cards. Store facts/help and separate halal/diet cards remain possible later if usage shows a need.

## Changes

- Added `src/domain/ai/generalCapabilities.js` with `GENERAL_AI_CAPABILITIES`.
- Added `tests/unit/aiGeneralCapabilities.test.mjs` to lock the exact 6-card order and localization key contract.
- Added RU/KZ i18n keys for every capability title, description, and prompt in:
  - `src/locales/ru/ai.json`
  - `src/locales/kz/ai.json`

## Non-Changes

- Did not render the capability cards yet.
- Did not change `AIAssistantScreen.jsx` behavior in this stage.
- Did not change `/api/ai.js`, `src/services/ai.js`, or AI prompt/server behavior.
- Did not add local history, image input, or voice input.

## Verification

- `node --test tests/unit/aiGeneralCapabilities.test.mjs` — passed 2/2.
- `node scripts/check-i18n.mjs` — passed with 0 missing KZ keys, 0 orphan keys, 0 empty values.
- `npx eslint src/domain/ai/generalCapabilities.js tests/unit/aiGeneralCapabilities.test.mjs` — passed with no output.
- `node --test tests/unit/aiGeneralCapabilities.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs` — passed 3/3.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` — passed 5/5.
- `npm run build` — passed. Existing build warnings remain: Vite CJS deprecation, known dynamic/static import chunking warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.

## Next Stage

Stage 4 should implement only the glass header layer: `Körset AI` title, store assistant subtitle, sticky/fixed glass treatment, safe-area handling, and future history-button slot. Do not implement cards visually until Stage 6.
