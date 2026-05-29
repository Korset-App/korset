---
type: changelog
status: done
date: 2026-05-27
area: ai-ui
---

# AI Assistant Stage 7 Composer Dock

## Summary

Completed Stage 7 of the `/s/:storeSlug/ai` redesign workstream: redesigned only the general AI composer as a premium glass input dock, without adding media, voice, or history behavior.

## Changes

- Wrapped the existing input/send row in `.ai-composer__dock`.
- Updated `.ai-composer` to use a blurred, theme-aware dock background above bottom nav.
- Made the input transparent inside the dock while preserving the existing placeholder and Enter-to-send behavior.
- Added subtle dock border, shadow, inner highlight, send-button transition, and active press state.
- Extended `tests/unit/aiAssistantScreenStructure.test.mjs` to protect the glass dock contract and ensure media controls are not added prematurely.

## Non-Changes

- Did not implement camera/gallery/image input.
- Did not implement voice input.
- Did not implement local chat history.
- Did not change AI request flow, product cards, follow-up chips, capability card prompts, or persistence behavior.
- Did not add visible placeholder media buttons.

## Verification

- `node --test tests/unit/aiAssistantScreenStructure.test.mjs tests/unit/aiGeneralCapabilities.test.mjs` — passed 8/8.
- `npx eslint src/screens/AIAssistantScreen.jsx tests/unit/aiAssistantScreenStructure.test.mjs` — passed with no output.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` — passed 5/5.
- `npm run build` — passed. Existing build warnings remain: Vite CJS deprecation, known dynamic/static import chunking warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.

## Screenshots

- `C:/Users/User/AppData/Local/Temp/opencode/korset-ai-stage7-composer-390.png`
- `C:/Users/User/AppData/Local/Temp/opencode/korset-ai-stage7-composer-430.png`

## Next Stage

Stage 8 should polish active chat/message state: assistant/user bubbles, loading indicator, product groups/cards, follow-up chips, and long-reply handling. Do not implement local history, voice, or image input in Stage 8.
