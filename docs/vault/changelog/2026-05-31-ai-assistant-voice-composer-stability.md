---
type: changelog
status: done
date: 2026-05-31
area: ai-ui
---

# AI Assistant Voice Composer Stability

## Summary

Fixed two post-Stage 12.5 AI assistant issues on `/s/:storeSlug/ai` before Stage 13 work:

- 30s auto-stopped voice recordings no longer get discarded by client-side `audio_too_long` validation caused by timer drift above `30_000ms`.
- Voice transcription now appends into the current composer text instead of replacing what the shopper already typed.
- Browser speech-recognition drafts are inserted as fallback even when client validation fails, reducing the chance of losing captured speech.
- The composer input is now an auto-growing `textarea`, so long dictated or typed text can be reviewed across multiple rows.

## Root Cause

The recording timeout was set to exactly `AI_VOICE_LIMITS.maxDurationMs`, but the measured `Date.now() - startedAt` in `recorder.onstop` can naturally become `30_001ms+`. The client then rejected the audio before calling `/api/ai-transcribe`, so the spoken content could disappear if the browser draft fallback was unavailable or empty.

The composer used a single-line `<input>`, so long recognized text was clipped horizontally and could not grow vertically.

## Changes

- Added `normalizeVoiceRecordingDuration()` and `mergeVoiceTranscriptIntoInput()` in `src/domain/ai/voiceTranscription.js`.
- Updated `src/screens/AIAssistantScreen.jsx` to mark auto-stop events, clamp auto-stopped duration to the approved 30s limit before validation, append voice text into existing composer content, and reuse draft fallback on validation errors.
- Replaced the composer `<input>` with an auto-resizing `<textarea rows={1}>` while preserving Enter-to-send and Shift+Enter newline behavior.
- Updated `src/screens/AIAssistantScreen.css` so the composer grows up to a controlled max height and then scrolls internally.
- Expanded unit and Playwright coverage for duration normalization, typed-text preservation, and multi-row composer growth.

## Verification

- `node --test tests/unit/aiVoiceTranscription.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs` — passed 16/16.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js` — passed 4/4.
- `npx eslint src/screens/AIAssistantScreen.jsx src/domain/ai/voiceTranscription.js tests/unit/aiVoiceTranscription.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs tests/e2e/aiGeneralMocked.spec.js` — passed with no output.
- `npm run build` — passed. Existing warnings remain: Vite CJS deprecation, known dynamic/static import chunk warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.
