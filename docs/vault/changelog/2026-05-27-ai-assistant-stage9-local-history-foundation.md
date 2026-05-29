---
type: changelog
status: done
date: 2026-05-27
area: ai-ui
---

# AI Assistant Stage 9 Local History Foundation

## Summary

Completed Stage 9 of the `/s/:storeSlug/ai` redesign workstream: implemented the local-only AI chat history data foundation without UI and without any server persistence.

## Changes

- Added `src/domain/ai/localChatHistory.js`.
- Added `tests/unit/aiLocalChatHistory.test.mjs`.
- The new module provides:
  - `createIndexedDBAIChatHistoryStore()` for browser local-only persistence via IndexedDB and `idb`;
  - `createMemoryAIChatHistoryStore()` for tests;
  - `AI_CHAT_HISTORY_MAX_PER_STORE = 20`;
  - `AI_CHAT_HISTORY_TTL_MS = 30 days`.
- Conversation behavior:
  - store-scoped by `storeSlug`;
  - create/update conversation;
  - list metadata only for a store;
  - get full conversation by id;
  - delete one conversation;
  - clear one store's conversations;
  - enforce max 20 conversations per store;
  - drop expired conversations by TTL during reads/writes.
- Message sanitization keeps only `user`/`assistant` messages and selected assistant structured fields (`productGroups`, `followUps`, `warnings`). It does not preserve arbitrary fields such as uploaded files.

## Non-Changes

- Did not connect local history to `AIAssistantScreen.jsx` yet.
- Did not add the history button behavior or bottom sheet UI.
- Did not add Supabase/server persistence.
- Did not store images or audio.
- Did not change current one-session restore behavior in `src/domain/ai/context.js`.

## Verification

- `node --test tests/unit/aiLocalChatHistory.test.mjs` — passed 7/7.
- `npx eslint src/domain/ai/localChatHistory.js tests/unit/aiLocalChatHistory.test.mjs` — passed with no output.
- `node --test tests/unit/aiLocalChatHistory.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs tests/unit/aiGeneralCapabilities.test.mjs` — passed 16/16.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` — passed 5/5.
- `npm run build` — passed. Existing build warnings remain: Vite CJS deprecation, known dynamic/static import chunking warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.

## Next Stage

Stage 10 should connect the local history data layer to UI: activate the header history button, add the bottom sheet, support new/open/delete/clear flows, and keep everything local-only.
