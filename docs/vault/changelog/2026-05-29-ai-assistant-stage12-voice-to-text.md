---
type: changelog
status: done
date: 2026-05-29
area: ai-ui
---

# AI Assistant Stage 12 Voice-To-Text

## Summary

Implemented V1 voice-to-text for the general AI assistant after the owner approved the design direction. This is a simple push-to-record transcription flow that inserts recognized text into the composer. It is not live voice chat and does not auto-send messages.

## Changes

- Added `src/domain/ai/voiceTranscription.js`:
  - `AI_VOICE_LIMITS` with 800ms min, 20s max, 4MB max;
  - `validateVoiceRecording()`;
  - `getSupportedVoiceMimeType()` with compact mobile-friendly MIME preferences.
- Added `api/ai-transcribe.js`:
  - Vercel serverless endpoint `POST /api/ai-transcribe`;
  - `bodyParser: false` for multipart audio upload;
  - accepts `audio`, `lang`, `storeSlug`, and `durationMs`;
  - validates duration and size before calling OpenAI;
  - rejects unsupported MIME types; supported audio types are `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/wav`, and `audio/x-wav`;
  - applies auth-aware rate limit identity: `user:{id}` for valid bearer tokens and anonymous IP fallback otherwise;
  - calls OpenAI audio transcriptions with `OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe'`;
  - returns `{ text, language, durationMs }`;
  - logs metadata-only usage events without recognized text or raw audio.
- Updated `src/services/ai.js`:
  - added `transcribeVoiceInput()`;
  - sends `FormData` directly without setting `Content-Type`, so the browser sets the multipart boundary.
- Updated `src/screens/AIAssistantScreen.jsx`:
  - added a mic button inside the composer dock;
  - uses `navigator.mediaDevices.getUserMedia({ audio: true })` and `MediaRecorder`;
  - auto-stops at 20 seconds;
  - inserts transcription into `input` via `setInput(transcription.text)`;
  - intentionally does not call `sendMessage(transcription.text)`.
- Updated `src/screens/AIAssistantScreen.css`:
  - added theme-aware mic button, recording state, voice status, and privacy notice styles.
- Added RU/KZ keys under `ai.voice.*`.
- Added tests:
  - `tests/unit/aiVoiceTranscription.test.mjs`;
  - `tests/unit/aiTranscribeApi.test.mjs`;
  - expanded `tests/unit/aiService.test.mjs`;
  - expanded `tests/unit/aiAssistantScreenStructure.test.mjs`.

## Privacy And Persistence

- Audio is not written to Supabase, localStorage, IndexedDB, Storage, or server files.
- Local chat history stores only normal text messages after the user sends them.
- The transcription endpoint logs only metadata: status, model, duration, audio bytes, language, and store slug.
- The endpoint does not log recognized text or raw audio.

## Non-Changes

- No image/gallery/camera input was added.
- No live duplex voice chat was added.
- No AI response audio playback was added.
- No server-side chat history persistence was added.
- `/api/ai.js` chat behavior was not changed.

## Verification

- New tests were written first and observed failing for missing modules/exports/UI wiring.
- `node --test tests/unit/aiVoiceTranscription.test.mjs tests/unit/aiTranscribeApi.test.mjs tests/unit/aiService.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs tests/unit/aiLocalChatHistory.test.mjs tests/unit/aiGeneralCapabilities.test.mjs` — passed 32/32.
- Follow-up hardening added auth-aware rate-limit identity and supported-audio MIME checks; final targeted unit set passed 34/34.
- `npx eslint src/screens/AIAssistantScreen.jsx src/services/ai.js src/domain/ai/voiceTranscription.js api/ai-transcribe.js tests/unit/aiVoiceTranscription.test.mjs tests/unit/aiTranscribeApi.test.mjs tests/unit/aiService.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs` — passed with no output.
- `node scripts/check-i18n.mjs` — passed, all KZ keys present.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js` — passed 6/6 after adding a browser regression that mocks `MediaRecorder`, verifies `/api/ai-transcribe` is called, inserts transcript into composer, and confirms `/api/ai` is not auto-called.
- Stage 11 visual QA script rerun after adding the mic button — passed checked metrics for 390/430 dark/light, no console/page errors.
- `npm run build` — passed. Existing warnings remain: Vite CJS deprecation, known dynamic/static import chunking warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.
- Live OpenAI transcription smoke was run against the handler using a short synthetic WAV generated locally. Result: HTTP 200 and non-empty text. The recognized text was imperfect because the input was Windows TTS, but it verified endpoint wiring, multipart payload handling, OpenAI transcription call, and metadata-only usage logging.

## Caveat

The live smoke used synthetic TTS audio rather than a real phone microphone recording. Before public pilot use, do one manual mobile recording check on iOS/Android to confirm browser `MediaRecorder` MIME behavior and microphone permission UX.

## Next Stage

Stage 13 remains the Image/Camera Input Design Gate. Do not implement image input until the owner approves gallery/camera UX, compression and max file size, use-case scope, storage policy, and expected model cost impact.
