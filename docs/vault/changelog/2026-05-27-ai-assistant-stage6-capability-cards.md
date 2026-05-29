---
type: changelog
status: done
date: 2026-05-27
area: ai-ui
---

# AI Assistant Stage 6 Capability Cards

## Summary

Completed Stage 6 of the `/s/:storeSlug/ai` redesign workstream: rendered the six approved AI capability cards in the empty state as a swipeable two-row carousel.

## Changes

- `AIAssistantScreen.jsx` now imports `GENERAL_AI_CAPABILITIES` from `src/domain/ai/generalCapabilities.js`.
- Empty state renders `.ai-capability-carousel` from the shared capability model, not a hardcoded JSX-only list.
- Each card shows:
  - Material Symbol icon from the capability model;
  - localized title;
  - localized description;
  - chevron affordance.
- Card tap sends the localized `promptKey` through the existing `sendMessage()` flow, preserving the existing store-scoped AI request contract.
- Removed the old `generalChips` quick prompt row from the composer area so the empty state is focused around the new capability cards.
- Added CSS for a two-row horizontal carousel where the first four cards are visible as the first two columns on mobile.
- Extended structure tests to protect the shared-model rendering contract and carousel foundation.

## Non-Changes

- Did not change `/api/ai.js`, `src/services/ai.js`, or AI prompt/server behavior.
- Did not implement local chat history.
- Did not redesign the composer beyond removing the old quick prompt row.
- Did not add voice or image input.
- Did not change product cards or follow-up chips in active chat responses.

## Verification

- `node --test tests/unit/aiAssistantScreenStructure.test.mjs tests/unit/aiGeneralCapabilities.test.mjs` — passed 7/7.
- `node scripts/check-i18n.mjs` — passed with 0 missing KZ keys, 0 orphan keys, 0 empty values.
- `npx eslint src/screens/AIAssistantScreen.jsx src/domain/ai/generalCapabilities.js tests/unit/aiAssistantScreenStructure.test.mjs tests/unit/aiGeneralCapabilities.test.mjs` — passed with no output.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` — passed 5/5.
- `npm run build` — passed. Existing build warnings remain: Vite CJS deprecation, known dynamic/static import chunking warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.

## Screenshots

- `C:/Users/User/AppData/Local/Temp/opencode/korset-ai-stage6-cards-390.png`
- `C:/Users/User/AppData/Local/Temp/opencode/korset-ai-stage6-cards-430.png`

## Local Preview Note

The local Vite server had stopped after Playwright usage and was restarted with `npm run dev -- --host 127.0.0.1`. `/s/mars/ai` responded with HTTP 200 before screenshots were captured.

## Next Stage

Stage 7 should redesign only the composer as a premium glass input dock. Media/voice controls should remain visual placeholders only if explicitly approved; full voice/image functionality stays in later design gates.
