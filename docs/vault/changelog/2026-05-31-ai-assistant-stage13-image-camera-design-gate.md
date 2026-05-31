---
type: changelog
status: done
date: 2026-05-31
area: ai-ui
---

# AI Assistant Stage 13 Image/Camera Design Gate

## Summary

Completed Stage 13 for the `/s/:storeSlug/ai` assistant as a design gate. No image upload code, camera UI, server vision endpoint, storage, or AI multimodal behavior was added in this stage.

## Owner Decisions

- Photo entry UX: support both camera capture and gallery selection.
- V1 use case: package-only analysis for grocery products.
- Temporary image handling: allow local preview only before send/remove/unmount.
- Persistent storage: do not store images in Supabase Storage, IndexedDB, chat history, local AI history, server files, logs, or Vault.
- Cost and safety posture: use hard limits before enabling any image analysis.

## Approved V1 Product Scope

The image feature is for shoppers standing near a grocery shelf who need help reading a product package. The assistant may help with visible packaging facts:

- ingredients and additives;
- allergen warnings and traces;
- halal-related marks or wording if visible;
- nutrition table and serving facts if legible;
- expiry, storage, or caution labels if legible;
- packaging text explanation in simple RU/KZ language.

The assistant must not treat the photo as a certificate, medical guarantee, or replacement for checking the physical package. It must be especially cautious for allergies, halal, child/pregnancy/health use, and expired/damaged packaging.

## Explicit Non-Scope

Do not implement generic image chat in V1. The feature must not be used for:

- people, faces, or identity;
- receipts, payment cards, documents, or private data;
- shelves, storefronts, maps, or live store navigation;
- medicine, electronics, construction goods, alcohol/tobacco, or generic marketplace flows;
- broad visual search detached from the current grocery-store context.

## Future UX Contract

- Add one photo button to the existing AI composer near the voice button.
- On tap, present clear choices: camera and gallery.
- After selection, show a compact preview above the composer.
- Let the user remove the photo before sending.
- Do not auto-send after selection.
- Let the user combine text plus one image.
- If the user sends only an image, attach a safe default intent equivalent to checking the package/composition.
- Do not save the preview into local conversation history.

## Future Technical Contract

Recommended Stage 14 limits:

- accepted MIME types: `image/jpeg`, `image/png`, `image/webp`;
- one image per message;
- reject unsupported file types before upload;
- client-side preview/source file limit before compression: 8 MB;
- client-side compression: longest edge max 1600 px, JPEG/WebP quality around `0.78-0.82`;
- server-side hard payload limit after compression/base64 conversion: reject above 2 MB, target under 1.5 MB;
- server-side request timeout and rate limiting are required;
- no raw image bytes, OCR text, or user package text in logs;
- no image/audio persistence in local history, Supabase, or server storage.

API direction:

- Prefer an explicit multimodal endpoint or a clearly separated multimodal branch instead of silently expanding the text-only `/api/ai` contract.
- Payload should include metadata only: `storeSlug`, `lang`, `intent`, optional user text, `imageMime`, and image payload size/type.
- Response should reuse the normalized AI response shape where possible so product cards/follow-ups can stay compatible later.

## Safety Copy Direction

Future visible RU/KZ copy should explain:

- the photo is used to analyze the package and is not saved;
- one clear photo of the package/composition works best;
- the user should verify the physical package for allergy, halal, expiry, and health-critical decisions.

## Stage 14 Readiness Checklist

Before implementation starts, Stage 14 should add tests first for:

- image validation and compression contract;
- MIME and size rejection;
- no auto-send after image selection;
- preview remove behavior;
- text plus image send behavior;
- image-only safe default intent;
- no image persistence in local chat history;
- mocked API success/error states;
- mobile composer spacing with image preview and bottom nav.

## Verification

- Stage 13 is documentation/design only.
- `npm run check:agent:docs` should pass after this note and the plan update.
- `npm run memory:save` should be run after this Vault update when credentials/network are available.
