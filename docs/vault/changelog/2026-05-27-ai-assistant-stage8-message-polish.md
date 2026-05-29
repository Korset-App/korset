---
type: changelog
status: done
date: 2026-05-27
area: ai-ui
---

# AI Assistant Stage 8 Message Polish

## Summary

Completed Stage 8 of the `/s/:storeSlug/ai` redesign workstream: polished the active chat/message state without changing AI behavior or adding history/media features.

## Changes

- Strengthened user bubble styling with a primary gradient, deeper shadow, and inner highlight.
- Upgraded assistant bubbles to a glass surface with blur/saturation, theme-aware border, and resilient `overflow-wrap: anywhere` for long replies.
- Polished AI product groups/cards with glass surfaces, subtle borders, blur, press state, and non-wrapping prices.
- Polished follow-up chips with theme-aware glass styling, transitions, and press state.
- Upgraded typing indicator bubble to match the assistant glass surface.
- Extended `tests/unit/aiAssistantScreenStructure.test.mjs` to protect the active chat visual contract.

## Non-Changes

- Did not change `/api/ai.js`, `src/services/ai.js`, or AI prompt/server behavior.
- Did not add local chat history.
- Did not add voice input, image input, or media controls.
- Did not change capability card prompts or composer behavior.

## Verification

- `node --test tests/unit/aiAssistantScreenStructure.test.mjs tests/unit/aiGeneralCapabilities.test.mjs` — passed 9/9.
- `npx eslint src/screens/AIAssistantScreen.jsx tests/unit/aiAssistantScreenStructure.test.mjs` — passed with no output.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` — passed 5/5.
- `npm run build` — passed. Existing build warnings remain: Vite CJS deprecation, known dynamic/static import chunking warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.

## Screenshots

- `C:/Users/User/AppData/Local/Temp/opencode/korset-ai-stage8-chat-390.png`
- `C:/Users/User/AppData/Local/Temp/opencode/korset-ai-stage8-chat-430.png`

## Next Stage

Stage 9 should implement the local-only chat history data foundation using IndexedDB. Do not add server-side persistence.
