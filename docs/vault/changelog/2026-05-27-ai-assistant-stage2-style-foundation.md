---
type: changelog
status: done
date: 2026-05-27
area: ai-ui
---

# AI Assistant Stage 2 Style Foundation

## Summary

Completed Stage 2 of the `/s/:storeSlug/ai` visual redesign workstream: extracted the general AI screen's inline presentation styles into a dedicated stylesheet without intentionally changing behavior or visual direction.

## Changes

- Created `src/screens/AIAssistantScreen.css` for the general AI screen foundation.
- Updated `src/screens/AIAssistantScreen.jsx` to import the stylesheet and use semantic class names for:
  - screen shell;
  - header;
  - message rows and bubbles;
  - AI product groups/cards;
  - follow-up chips;
  - loading dots;
  - quick prompt chips;
  - composer input/send button.
- Removed the inline `<style>` keyframe block and moved the typing animation to CSS.
- Added `tests/unit/aiAssistantScreenStructure.test.mjs` to keep this screen on a dedicated CSS foundation and prevent reintroducing inline JSX styles.

## Non-Changes

- Did not change `/api/ai.js`.
- Did not change `src/services/ai.js`.
- Did not change `src/domain/ai/catalogSearch.js` or `src/domain/ai/context.js`.
- Did not add local chat history, image input, or voice input.
- Did not change user-facing copy or i18n keys.
- Did not redesign the header/cards/composer yet; those remain later stages.

## Verification

- `node --test tests/unit/aiAssistantScreenStructure.test.mjs` — passed 1/1.
- `npx eslint src/screens/AIAssistantScreen.jsx tests/unit/aiAssistantScreenStructure.test.mjs` — passed with no output.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` — passed 5/5.
- `npm run build` — passed. Existing build warnings remain: Vite CJS deprecation, known dynamic/static import chunking warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.

## Screenshots

- `C:/Users/User/AppData/Local/Temp/opencode/korset-ai-stage2-390.png`
- `C:/Users/User/AppData/Local/Temp/opencode/korset-ai-stage2-430.png`

## Next Stage

Stage 3 should analyze the actual AI capabilities and choose 6 or 8 user-facing capability cards before any visual card design is implemented.
