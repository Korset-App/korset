---
type: changelog
status: done
date: 2026-05-31
area: ai-ui
---

# AI Assistant Stage 15 Mobile Composer QA

## Summary

Completed the Stage 15 stabilization pass for the `/s/:storeSlug/ai` composer after Stage 14 image/camera input. This stage focused on browser-level UI reliability, not new product behavior.

## Scope

The new smoke checks cover the riskiest mobile composer states:

- 390px dark theme;
- 430px light theme;
- long typed text in the auto-growing textarea;
- package image picker and preview;
- active voice recording panel;
- composer spacing above the bottom navigation;
- absence of horizontal overflow.

## Changes

- Updated `tests/e2e/aiShelfUiMocked.spec.js`:
  - added `expectComposerAboveBottomNav()`;
  - added `installVoiceMocks()` for local `MediaRecorder`/microphone mocking;
  - added a tiny package PNG fixture via `Buffer`;
  - added two mobile composer scenarios: `390px dark` and `430px light`.

## Result

No runtime CSS or JSX changes were needed during this stage. The current Stage 14 composer layout passed the new mobile checks.

## Verification

- `npx playwright test tests/e2e/aiShelfUiMocked.spec.js` — passed 6/6.
- Final broader Stage 15 verification should rerun targeted AI unit/e2e/i18n/lint/build before handoff.
