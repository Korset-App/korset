---
type: changelog
status: done
date: 2026-05-30
area: ai-ui
---

# AI Assistant Stage 12 Voice Polish

## Summary

Polished the approved V1 voice-to-text UI for `/s/:storeSlug/ai` after verifying the Vercel production deploy for commit `412d92e`.

## Deploy Check

- Production health endpoint `https://korset.vercel.app/api/health` returned `status: "ok"` and `version: "412d92e"`.
- The response also confirmed Supabase, OpenAI, RAG, push, and Sentry configuration.
- No manual Vercel production deploy was run.

## Changes

- Updated `src/screens/AIAssistantScreen.jsx`:
  - added distinct voice panel labels for microphone permission request, upload preparation, transcription, and active recording;
  - added `role="status"` and `aria-live="polite"` to voice status surfaces so assistive technology can announce changes;
  - made stop-recording transition immediate on the UI: after tapping stop, the mic leaves the recording state and moves into a disabled processing state while transcription runs.
- Updated `src/screens/AIAssistantScreen.css`:
  - added a soft voice panel entrance animation;
  - added a processing panel variant with a subtle progress shimmer;
  - added a processing pulse for the mic button;
  - added reduced-motion handling for voice pulse/wave/progress and typing animations.
- Added RU/KZ key `ai.voice.uploading`.
- Increased the V1 voice recording max duration from 20s to 30s across client validation and `/api/ai-transcribe`, with a 45s client request timeout for transcription headroom.
- Added clearer unavailable-endpoint handling for local runs where Vite serves the frontend but Vercel API functions are not running.
- Added insecure-context handling for local/network URLs where the browser blocks microphone access outside `localhost` or HTTPS.
- Added browser-draft fallback: when server transcription is unavailable but browser interim recognition captured text, the draft is inserted into the composer for user review instead of being lost. The message is still not auto-sent.
- Expanded `tests/unit/aiAssistantScreenStructure.test.mjs` to guard the voice UI polish.
- Expanded `tests/e2e/aiGeneralMocked.spec.js` so the mocked voice flow checks the visible processing state before the transcript appears.

## Non-Changes

- No Supabase/server chat persistence was added.
- No image/gallery/camera input was added.
- No live duplex voice chat or audio playback was added.
- No `/api/ai.js` chat behavior was changed.
- Voice transcription still inserts recognized text into the composer and does not auto-send.

## Verification

- TDD red check: `node --test tests/unit/aiAssistantScreenStructure.test.mjs` failed first on the missing voice UI label/accessibility contract.
- `node --test tests/unit/aiAssistantScreenStructure.test.mjs` — passed 10/10 after implementation.
- `node scripts/check-i18n.mjs` — passed, all KZ keys present.
- `npx eslint src/screens/AIAssistantScreen.jsx tests/unit/aiAssistantScreenStructure.test.mjs` — passed with no output.
- `node --test tests/unit/aiVoiceTranscription.test.mjs tests/unit/aiTranscribeApi.test.mjs tests/unit/aiService.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs tests/unit/aiLocalChatHistory.test.mjs tests/unit/aiGeneralCapabilities.test.mjs` — passed 38/38.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` — passed 6/6.
- `npm run build` — passed. Existing warnings remain: Vite CJS deprecation, known dynamic/static import chunking warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.

## Local Testing Note

- Use `http://127.0.0.1:3000/s/mars/ai` or `http://localhost:3000/s/mars/ai` for local voice testing because `vercel dev` serves `/api/ai-transcribe`.
- Plain Vite on `5173` is fine for visual UI preview, but it does not serve Vercel API functions and will make transcription unavailable.
- Browser microphone APIs can be blocked on non-HTTPS LAN URLs. Use `localhost`, `127.0.0.1`, production HTTPS, or an HTTPS tunnel for phone testing.
