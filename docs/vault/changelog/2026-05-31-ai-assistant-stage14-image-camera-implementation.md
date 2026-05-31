---
type: changelog
status: done
date: 2026-05-31
area: ai-ui
---

# AI Assistant Stage 14 Image/Camera Implementation

## Summary

Implemented the Stage 13-approved V1 image input for `/s/:storeSlug/ai`. The feature is package-only: shoppers can add one photo of a grocery product package from camera or gallery, review a local preview, optionally add text, and manually send it for AI analysis.

No image is persisted in Supabase Storage, IndexedDB, local AI history, localStorage chat sessions, server files, logs, or Vault.

## Changes

- Added `src/domain/ai/imageInput.js`:
  - explicit Stage 13 limits and accepted MIME types;
  - file validation;
  - data URL payload byte calculation;
  - payload validation;
  - browser-side image preparation with a compression path for large images;
  - RU/KZ package-only default prompt helper.
- Added `api/ai-image.js`:
  - separate serverless endpoint for package image analysis;
  - JSON payload validation for one image;
  - separate anonymous/authenticated rate limits;
  - metadata-only usage logging;
  - OpenAI multimodal chat-completions call with `image_url` content;
  - package-only safety prompt that refuses generic image chat and asks shoppers to verify the physical package for allergies, halal, health, expiry, and safety.
- Updated `src/services/ai.js`:
  - added `askPackageImageAI()` with a 45s timeout and explicit `/api/ai-image` routing.
- Updated `src/screens/AIAssistantScreen.jsx` and `src/screens/AIAssistantScreen.css`:
  - added a package photo button in the existing composer dock;
  - added camera and gallery file inputs;
  - added a compact image picker, preview, privacy note, remove button, and error surface;
  - kept image selection non-destructive and no-auto-send;
  - image-only send uses the localized safe default prompt;
  - sent chat messages store text only, not image bytes.
- Added RU/KZ i18n keys for the image controls and error states.
- Expanded tests:
  - `tests/unit/aiImageInput.test.mjs`;
  - `tests/unit/aiImageApi.test.mjs`;
  - `tests/unit/aiService.test.mjs`;
  - `tests/unit/aiAssistantScreenStructure.test.mjs`;
  - `tests/e2e/aiGeneralMocked.spec.js`.

## Non-Changes

- No Supabase image storage.
- No local image persistence.
- No server-side image persistence.
- No generic image chat.
- No people/document/receipt/shelf/storefront/medicine/electronics/construction/alcohol/tobacco analysis.
- No Product AI or Compare AI behavior changes.
- No live OpenAI image QA run in this session.

## Verification

- TDD red check: image unit/API/service tests failed first because `imageInput.js`, `api/ai-image.js`, and `askPackageImageAI()` did not exist.
- `node --test tests/unit/aiImageInput.test.mjs tests/unit/aiImageApi.test.mjs tests/unit/aiService.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs` — passed 29/29.
- `npx playwright test tests/e2e/aiGeneralMocked.spec.js` — passed 6/6.
- `node scripts/check-i18n.mjs` — passed, all KZ keys present. Existing identical-key warnings remain.
- `npx eslint src/domain/ai/imageInput.js src/services/ai.js src/screens/AIAssistantScreen.jsx api/ai-image.js tests/unit/aiImageInput.test.mjs tests/unit/aiImageApi.test.mjs tests/unit/aiService.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs tests/e2e/aiGeneralMocked.spec.js` — passed with no output.
- `node --check api/ai-image.js` — passed.
- `npm run build` — passed. Existing warnings remain: Vite CJS deprecation, known dynamic/static import chunk warnings for `supabase.js`/`offlineDB.js`, and missing Sentry auth token for release/source-map upload.
