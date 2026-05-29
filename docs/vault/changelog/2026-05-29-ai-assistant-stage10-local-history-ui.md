---
type: changelog
status: done
date: 2026-05-29
area: ai-ui
---

# AI Assistant Stage 10 Local History UI

## Summary

Completed Stage 10 of the `/s/:storeSlug/ai` visual redesign: connected the local-only AI chat history foundation to the general AI assistant UI.

## Changes

- Updated `src/screens/AIAssistantScreen.jsx`:
  - activated the header history button;
  - created a local history bottom sheet;
  - auto-saves non-empty current chats into `createIndexedDBAIChatHistoryStore()`;
  - lists only conversations for the active `storeSlug`;
  - opens a previous conversation and continues it;
  - starts a new chat without deleting saved history;
  - deletes one conversation;
  - clears all local AI chats for the current store.
- Updated `src/screens/AIAssistantScreen.css` with theme-aware glass bottom sheet styling, history list items, empty/loading states, and inline confirmation states.
- Added RU/KZ i18n keys under `ai.history.*`.
- Expanded `tests/unit/aiAssistantScreenStructure.test.mjs` to guard the Stage 10 UI/data wiring.

## Behavior Notes

- History remains local-only on the device through IndexedDB.
- Existing one-session restore via `src/domain/ai/context.js` stays in place for compatibility.
- Deleting one chat and clearing all chats require explicit inline confirmation in the sheet.
- The bottom sheet is scoped to the current store; unrelated stores are not listed.
- `AIAssistantScreen.jsx` tracks the store slug associated with the current visible messages, so stale messages are not written into another store's local history if the route `storeSlug` changes without a full component remount.

## Non-Changes

- No Supabase/server chat persistence was added.
- No API changes were made.
- No voice input was added.
- No image/gallery/camera input was added.
- No product scan history behavior was changed.

## Verification

- `node --test tests/unit/aiAssistantScreenStructure.test.mjs` — passed 8/8 after watching the Stage 10 tests fail first.
- `npx eslint src/screens/AIAssistantScreen.jsx tests/unit/aiAssistantScreenStructure.test.mjs` — passed with no output.
- `node scripts/check-i18n.mjs` — passed, all KZ keys present.
- `node --test tests/unit/aiLocalChatHistory.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs tests/unit/aiGeneralCapabilities.test.mjs` — passed 18/18.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` — passed 5/5.
- `npm run build` — passed. Existing warnings remain: Vite CJS deprecation, known dynamic/static import chunking warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.

## Next Stage

Stage 11 should run a focused mobile QA and visual regression pass at 390px and 430px, covering dark/light themes, empty state, active chat, long replies, product cards, and the history bottom sheet.
