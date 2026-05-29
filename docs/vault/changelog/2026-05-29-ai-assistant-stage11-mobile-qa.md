---
type: changelog
status: done
date: 2026-05-29
area: ai-ui
---

# AI Assistant Stage 11 Mobile QA

## Summary

Completed Stage 11 of the `/s/:storeSlug/ai` redesign workstream: mobile QA and visual regression pass for the text-only general AI assistant after the Stage 10 local history UI.

## QA Coverage

- Route: `/s/mars/ai`.
- Viewports: 390px and 430px width, 844px height.
- Themes: dark and light.
- States captured:
  - empty assistant screen;
  - active chat with long assistant response, product card group, follow-up chips, and composer;
  - local chat history bottom sheet.
- Screenshot output directory:
  - `C:\Users\User\AppData\Local\Temp\opencode\korset-ai-stage11\`.

## Findings And Fix

- Metrics passed before code changes:
  - no horizontal overflow at 390px or 430px;
  - composer stayed above bottom nav;
  - history sheet stayed within viewport;
  - no browser console/page errors in checked states.
- Visual review found one polish issue in active chat: assistant avatar aligned to the bottom of long responses, close to the composer.
- Fixed `.ai-message-row--assistant` to align items to `flex-start`, so assistant avatar now sits beside the start of the response bubble.
- Added a structure test guard for this alignment.

## Non-Changes

- No AI request/response behavior changed.
- No Supabase/server persistence was added.
- No voice input was added.
- No image/gallery/camera input was added.
- No product, catalog, scanner, or retail flows were changed.

## Verification

- `node --test tests/unit/aiAssistantScreenStructure.test.mjs` — passed 8/8 after watching the avatar-alignment guard fail first.
- `npx eslint src/screens/AIAssistantScreen.jsx tests/unit/aiAssistantScreenStructure.test.mjs` — passed with no output.
- Stage 11 visual QA script rerun — passed checked metrics for 390/430 dark/light, no console/page errors.

## Next Stage

Stage 12 is the Voice-To-Text design gate. Do not implement voice code until the owner approves endpoint shape, max audio duration, privacy copy, recording permission UX, and whether transcription is inserted into the composer or auto-sent.
