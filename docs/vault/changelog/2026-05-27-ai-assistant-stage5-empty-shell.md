---
type: changelog
status: done
date: 2026-05-27
area: ai-ui
---

# AI Assistant Stage 5 Empty Shell

## Summary

Completed Stage 5 of the `/s/:storeSlug/ai` redesign workstream: added a restrained premium atmosphere and a dedicated intro panel for the empty state, without implementing capability cards yet.

## Changes

- Added subtle background depth to `src/screens/AIAssistantScreen.css` through `.ai-screen::before` and `.ai-screen::after` using semantic tokens and `color-mix()`.
- Replaced the old plain welcome bubble in the empty state with a dedicated `.ai-empty-state` / `.ai-empty-panel` shell.
- Added localized intro copy:
  - `ai.empty.eyebrow`
  - `ai.empty.title`
  - `ai.empty.description`
- Kept the empty-state copy store-aware through `{store}`.
- Extended `tests/unit/aiAssistantScreenStructure.test.mjs` to protect the empty-state atmosphere contract.

## Non-Changes

- Did not render the six capability cards yet.
- Did not change composer design.
- Did not implement local history, voice input, or image input.
- Did not change AI request flow, product cards, follow-up chips, or persistence behavior.

## Verification

- `node --test tests/unit/aiAssistantScreenStructure.test.mjs` — passed 3/3.
- `node scripts/check-i18n.mjs` — passed with 0 missing KZ keys, 0 orphan keys, 0 empty values.
- `npx eslint src/screens/AIAssistantScreen.jsx tests/unit/aiAssistantScreenStructure.test.mjs` — passed with no output.
- `node --test tests/unit/aiAssistantScreenStructure.test.mjs tests/unit/aiGeneralCapabilities.test.mjs` — passed 5/5.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` — passed 5/5.
- `npm run build` — passed. Existing build warnings remain: Vite CJS deprecation, known dynamic/static import chunking warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.

## Screenshots

- `C:/Users/User/AppData/Local/Temp/opencode/korset-ai-stage5-empty-shell-390.png`
- `C:/Users/User/AppData/Local/Temp/opencode/korset-ai-stage5-empty-shell-430.png`

## Next Stage

Stage 6 should render the six capability cards from `GENERAL_AI_CAPABILITIES` as a swipeable/first-four-visible card section. Keep card actions grounded in existing AI behavior.
