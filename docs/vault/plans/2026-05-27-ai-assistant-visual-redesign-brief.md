---
type: plan
status: active
date: 2026-05-27
area: ai-ui
---

# AI Assistant Visual Redesign Brief

## Owner Direction

Redesign the general store AI screen at `/s/:storeSlug/ai` so it feels like a polished, premium mobile assistant, not an empty chat page. The reference images are inspiration only, not a template to copy. Keep the screen clean, serious, friendly, and useful for offline grocery shoppers in the current store context.

The desired feel is a modern glass, store-aware AI assistant: closer to a high-quality consumer product from a serious brand than a decorative sci-fi screen. Avoid too many sections, fake statistics, noisy chips, or generic purple-card overload.

## Owner Decisions From 2026-05-27 Follow-Up

- Visible header title: keep `Körset AI`.
- Capability layout: use 6-7 swipeable capability cards, with the first 4 visible/obvious in the first viewport.
- Visual tone: between atmospheric AI/glass and the existing Körset system; not too dark, stylish, friendly, and easy to understand.
- Code foundation: treat the current mostly-inline `AIAssistantScreen.jsx` as a weak foundation for this redesign. Move screen styling into a dedicated CSS file and keep the JSX cleaner, with explicit data structures for capabilities and prompts.
- Media direction: full professional implementation is desired, but image input, camera input, and voice input should each be discussed/approved as separate technical decisions before implementation.
- Voice direction if approved: start with high-quality speech-to-text that fills the composer, not full ChatGPT-like live voice.
- Chat history: discuss and decide separately before implementing; do not add a rushed placeholder.

## Current Implementation Notes

- General AI screen: `src/screens/AIAssistantScreen.jsx`.
- Product AI screen: `src/screens/AIScreen.jsx`.
- Both screens currently use mostly inline styles; there is no dedicated AI screen CSS file.
- General AI route: `/s/:storeSlug/ai`, rendered by `AIAssistantScreen` with the global `<BottomNav />` still visible.
- Current general screen structure: plain top header, one welcome assistant bubble, `generalChips` quick prompts, fixed bottom composer.
- Current general AI logic already supports store context, catalog candidate search, product groups/cards, follow-up suggestions, warnings, localStorage chat persistence, and clear chat.
- Current AI localStorage key shape: `korset_ai_chat_{mode}_{storeSlug}_{ean?}` from `src/domain/ai/context.js`.
- Current RU/KZ text lives in `src/locales/ru/ai.json` and `src/locales/kz/ai.json`.
- Existing glass references: `HomeScreen.css` avatar/menu glass and `LandingScreen.css` fixed blurred header.

## Visual Requirements

- Add a sticky/fixed glass header for the general AI screen. It should stay visible while the user scrolls and should use backdrop blur/saturation so changing content behind it is visible.
- Header content should be minimal: `Körset AI` / `ChatAI` direction, store assistant subtitle, and store name. Do not show product counts in the header.
- The bold AI title can use a stronger accent treatment, but do not overdo the background.
- Reserve space for a future history button in the header. Do not implement the full history drawer before product discussion.
- Empty state should not be just a chat bubble. It should explain what the user can do with the assistant through polished capability cards.
- Keep only one main prompt question such as "Что хотите сделать?" or a better concise alternative.
- Replace noisy sections like popular queries / quick access with a focused set of AI capabilities and the composer.
- The design must support dark and light themes using existing semantic CSS variables.
- Avoid raw `#fff`, `#000`, or raw white/black translucent surfaces for core UI surfaces/text.
- Keep the UI mobile-first, with no horizontal overflow and no bottom-nav overlap.

## Suggested Capability Cards

Show 4 cards initially, or use a horizontally scrollable row/grid that can reveal 6-7 options without crowding the first viewport. Each card needs a clear icon, short title, and one-line explanation. Candidate capabilities:

- Find product: search current store catalog by product, brand, category, budget, or dietary need.
- Pick alternative: find similar, cheaper, better-composition, halal-focused, or profile-friendlier alternatives.
- Explain composition: translate ingredients/additives/allergens into simple language.
- Build shopping list: assemble products for a meal/task such as plov, dinner, breakfast, child snack, or family basket.
- Fit-Check help: explain whether products fit allergies, halal, diets, sugar/lactose/keto preferences based on profile and product facts.
- Budget choice: help choose under a price target inside the current store.
- Store facts/help: answer about the current store when store notes/contacts are available.

The first four should probably be: Find product, Pick alternative, Explain composition, Build shopping list. Additional cards can be swipeable if this improves density.

## Composer Direction

- Keep the text composer central and premium.
- Placeholder can be "Что хотите сделать?" or "Спросите про товары в {store}" after copy review.
- Future media controls should fit naturally into the composer: gallery upload, camera photo, and possibly voice input.
- Do not add image upload/camera/voice until the technical and cost implications are discussed and approved.

## History Direction

- The owner wants a history button later, with previous chats/conversations.
- V1 should avoid server-side chat history because of privacy, cost, auth, and product complexity.
- Preferred direction: local-only conversation history on the device using localStorage/IndexedDB, store-scoped, with clear delete controls and TTL.
- Do not mix this with the existing product scan history screen.
- Current `saveAIChatSession()` stores only one latest session per mode/store/product; full conversation list needs a separate local index design.

## Multimedia And Voice Decisions To Discuss Before Implementation

Image input:

- Technically possible through `input type=file` / camera capture on mobile and OpenAI vision-capable requests.
- Needs API contract changes, payload limits, image compression, privacy copy, tests, and server-side validation.
- Cost can rise because image tokens are higher than plain text. It is probably acceptable for occasional product-package checks, but should be gated and measured.
- Best V1 use case: package/photo composition check, not generic image chat.

Voice input:

- Browser speech recognition is inconsistent across mobile browsers and languages.
- OpenAI speech-to-text can be added server-side, but requires recording permission UX, audio upload endpoint, file limits, transcription cost, and privacy copy.
- ChatGPT-like live voice is a bigger feature than a simple voice-to-text button. Do not promise it as a quick UI-only task.
- Recommended first step, if approved: simple push-to-record voice-to-text that fills the composer, not full duplex live voice.

## Implementation Guardrails

- Do not change `/api/ai.js` behavior for the visual redesign unless a capability truly needs it.
- Do not weaken AI grounding: concrete recommendations must remain inside the current store catalog.
- Do not add server-side chat persistence without explicit owner approval.
- New visible text must use `useI18n` with RU and KZ keys.
- Prefer moving AI screen styles into a dedicated CSS file instead of expanding large inline style blocks further.
- Reuse existing glass patterns from `HomeScreen.css` and `LandingScreen.css`, adapted to the AI screen.
- Use SVG or existing Material Symbols consistently for capability icons.
- Verify with mobile viewport screenshots/smoke, `node scripts/check-i18n.mjs`, lint, and build.

## Open Questions For Owner

- Chat history: implement now as local-only conversation history, or defer until the visual foundation is complete?
- Image/camera input: implement in the same redesign phase, or stage after text-only UI is stable?
- Voice-to-text: implement after the text UI, or include in the same phase with a separate API endpoint?

## Agreed Chat History Direction

Use local-only conversation history on the device. Do not persist chat messages to Supabase for V1. Prefer IndexedDB over plain localStorage for the conversation index because the feature will become a real list of chats, not only one restored session.

Initial scope:

- Store-scoped history for `/s/:storeSlug/ai`.
- Keep recent conversations only, likely 20 per store.
- Open previous chat and continue it.
- Start a new chat.
- Delete one chat.
- Clear all local AI chats for the current store.
- Add TTL, likely 30 days unless owner chooses a different retention period.
- Do not store uploaded images or audio files in chat history in the first implementation.

## Professional Execution Plan

The redesign must be staged with owner review checkpoints. Do not bundle header, cards, composer, local history, voice, and image input into one implementation pass.

### Stage 0: Baseline And Local Preview

Goal: establish a stable local preview and capture the current screen state before changing UI.

Tasks:

- Start Vite dev server on the standard local port.
- Open `/s/mars/ai` in mobile viewport.
- Capture current screenshots for before/after comparison.
- Check browser console for existing errors unrelated to the redesign.

Verification:

- Local route renders.
- Screenshot exists for current baseline.
- No new code changes yet.

Owner checkpoint: confirm the current baseline and target screen.

### Stage 1: Architecture Audit And Component Boundary Plan

Goal: map the current `AIAssistantScreen.jsx` into clear responsibilities before moving code.

Tasks:

- Identify logic that must remain unchanged: `sendMessage`, catalog candidate search, product group rendering, follow-ups, warnings, current local session persistence.
- Identify visual sections: shell, header, empty state, capability carousel, message list, product groups, follow-up chips, loading bubble, composer.
- Decide what stays inside `AIAssistantScreen.jsx` and what becomes small presentational components.

Recommended boundaries:

- `AIAssistantScreen.jsx`: screen state, AI request flow, composition.
- `AIAssistantScreen.css`: all screen-level styling.
- Optional internal components in same file first: `AIHeader`, `AIEmptyState`, `AICapabilityCarousel`, `AIComposer`, `AIMessageList`.
- Move to separate files only if the file remains too large after cleanup; avoid premature abstraction.

Verification:

- No behavior changes.
- Implementation plan updated if audit discovers hidden coupling.

Owner checkpoint: approve component boundaries before refactor.

### Stage 2: Style Extraction Foundation

Goal: remove the weak inline-style foundation without redesigning visuals yet.

Tasks:

- Create `src/screens/AIAssistantScreen.css`.
- Import it from `AIAssistantScreen.jsx`.
- Move stable layout/message/composer styles into CSS classes.
- Keep current visual appearance as close as possible.
- Keep JSX readable and preserve current behavior.

Verification:

- `/s/mars/ai` renders the same basic UI.
- Existing AI mocked/e2e smoke still passes if run.
- `node scripts/check-i18n.mjs` passes if text is touched.
- Targeted lint passes for changed files.

Owner checkpoint: quick visual check that nothing broke before redesign starts.

### Stage 3: AI Capability Model And Copy

Goal: choose the real user-facing AI functions before designing cards.

Tasks:

- Review current AI abilities from code and prompts: store catalog search, alternatives, composition explanation, shopping list, Fit-Check/profile help, budget/category search, store facts.
- Choose either 6 or 8 capability cards. Avoid 7 because the owner flagged it as visually awkward.
- Recommended 6-card set for V1:
  - Find product.
  - Pick alternative.
  - Explain composition.
  - Build shopping list.
  - Check if it fits me.
  - Shop by budget.
- Optional 8-card set only if store facts and halal/diet deserve separate cards:
  - Find product.
  - Pick alternative.
  - Explain composition.
  - Build shopping list.
  - Check if it fits me.
  - Shop by budget.
  - Find halal or diet-friendly.
  - Ask about this store.
- Add RU/KZ i18n keys for titles, descriptions, and prompt text.

Verification:

- No hardcoded user-facing text remains in JSX.
- KZ coverage exists for every new key.
- Capability card prompts map to existing AI behavior without API changes.

Owner checkpoint: approve 6 vs 8 cards and exact copy before visual card design.

Stage 3 result:

- Done on 2026-05-27. Details: `docs/vault/changelog/2026-05-27-ai-assistant-stage3-capability-model.md`.
- Owner selected 6 capability cards.
- Added `src/domain/ai/generalCapabilities.js` with the exact order:
  - `find_product`
  - `pick_alternative`
  - `explain_composition`
  - `build_shopping_list`
  - `fit_check`
  - `budget_pick`
- Added RU/KZ title, description, and prompt keys for all 6 cards.
- Added `tests/unit/aiGeneralCapabilities.test.mjs`.
- Verification passed: capability tests 2/2, targeted AI UI unit tests 3/3, i18n check, targeted ESLint, AI Playwright smoke 5/5, and `npm run build`.

### Stage 4: Glass Header Only

Goal: implement the top glass header as a standalone visual layer.

Tasks:

- Header title stays `Körset AI`.
- Subtitle uses store context: assistant of `{store}`.
- Add glass background with blur/saturation, theme-aware border, and safe-area handling.
- Keep the header sticky/fixed during scroll.
- Add a history button slot, but only active if local history is implemented in a later stage.
- Remove product count from header.

Verification:

- Header stays visible while content scrolls.
- Blur works over changing background/content.
- Header does not collide with browser safe area or bottom nav.
- Dark and light themes stay readable.

Owner checkpoint: approve header before changing empty state/cards.

Stage 4 result:

- Done on 2026-05-27. Details: `docs/vault/changelog/2026-05-27-ai-assistant-stage4-glass-header.md`.
- Header title remains `Körset AI`.
- Added sticky glass header foundation with safe-area padding, blur/saturation, theme-aware border, shadow, and subtle accent line.
- Added an action slot for future local history without showing a dead history button.
- Verification passed: glass header structure test 2/2, targeted ESLint, targeted AI UI unit tests 4/4, AI Playwright smoke 5/5, and `npm run build`.

### Stage 5: Screen Atmosphere And Empty-State Shell

Goal: create the friendly premium AI canvas without adding cards yet.

Tasks:

- Add subtle background depth: restrained gradients/orbs/noise only through semantic tokens and color-mix.
- Keep tone not too dark and not overly sci-fi.
- Replace the plain welcome bubble with a refined intro block that explains store-aware AI value.
- Keep layout mobile-first and scroll-safe.

Verification:

- No horizontal overflow at 390px and 430px widths.
- Bottom nav and composer spacing are correct.
- Light theme remains professional, not washed out.

Owner checkpoint: approve the base visual atmosphere.

Stage 5 result:

- Done on 2026-05-27. Details: `docs/vault/changelog/2026-05-27-ai-assistant-stage5-empty-shell.md`.
- Added subtle screen background depth using CSS pseudo-elements, semantic tokens, and `color-mix()`.
- Replaced the old plain empty welcome bubble with a dedicated `.ai-empty-state` / `.ai-empty-panel` intro shell.
- Added RU/KZ `ai.empty.*` keys for store-aware intro copy.
- Did not implement capability cards yet.
- Verification passed: empty shell structure test 3/3, i18n check, targeted ESLint, targeted AI UI unit tests 5/5, AI Playwright smoke 5/5, and `npm run build`.

### Stage 6: Capability Carousel Cards

Goal: implement the 6 or 8 swipeable capability cards as the main first-screen content.

Tasks:

- Build a horizontal carousel or compact responsive card grid where the first 4 cards are visible/obvious.
- Use clear icons, title, one-line description, and a prompt action.
- Card tap fills/sends the intended prompt based on current design decision.
- Avoid decorative overload and fake features.
- Keep touch targets large enough for mobile.

Verification:

- Swipe works on mobile.
- Cards do not wrap awkwardly.
- First 4 cards are obvious without needing explanation.
- Card actions send real supported prompts.

Owner checkpoint: approve card set, icon style, density, and interaction.

Stage 6 result:

- Done on 2026-05-27. Details: `docs/vault/changelog/2026-05-27-ai-assistant-stage6-capability-cards.md`.
- Rendered the six approved cards from `GENERAL_AI_CAPABILITIES`.
- Implemented a two-row horizontal carousel where the first four cards are visible as the first two columns on mobile.
- Card tap sends the localized capability prompt through the existing `sendMessage()` flow.
- Removed the old general quick-prompt row from the composer area to reduce noise.
- Verification passed: targeted AI UI unit tests 7/7, i18n check, targeted ESLint, AI Playwright smoke 5/5, and `npm run build`.

### Stage 7: Composer Redesign Without Media Logic

Goal: make the input area premium and ready for media/voice, without implementing media yet.

Tasks:

- Redesign composer as a glass input dock above bottom nav.
- Include text input, send button, and reserved icon positions for future camera/gallery/mic only if owner approves visible placeholders.
- Keep keyboard-safe spacing and safe-area padding.
- Preserve Enter-to-send behavior.

Verification:

- Composer does not overlap bottom nav.
- Typing and send still work.
- Disabled/loading states are clear.

Owner checkpoint: approve composer before adding history or media.

Stage 7 result:

- Done on 2026-05-27. Details: `docs/vault/changelog/2026-05-27-ai-assistant-stage7-composer-dock.md`.
- Added `.ai-composer__dock` around the existing input/send row.
- Composer now uses a premium glass input dock with blur, theme-aware border, shadow, and transparent inner input.
- Did not add media, voice, image, or history controls.
- Verification passed: targeted AI UI unit tests 8/8, targeted ESLint, AI Playwright smoke 5/5, and `npm run build`.

### Stage 8: Message List And AI Response Polish

Goal: align actual chat messages with the new premium shell.

Tasks:

- Restyle assistant/user bubbles in CSS.
- Restyle product cards inside messages without changing structured response behavior.
- Restyle follow-up chips and loading indicator.
- Keep long replies/product cards scroll-safe.

Verification:

- Mocked AI response with product groups still renders.
- Product card links still navigate to product pages.
- Long reply does not overflow.

Owner checkpoint: approve chat state after a real conversation view.

Stage 8 result:

- Done on 2026-05-27. Details: `docs/vault/changelog/2026-05-27-ai-assistant-stage8-message-polish.md`.
- Polished active chat bubbles, product groups/cards, follow-up chips, and typing indicator.
- Added long-reply resilience through `overflow-wrap: anywhere`.
- Did not change AI behavior, composer behavior, local history, voice, or image input.
- Verification passed: targeted AI UI unit tests 9/9, targeted ESLint, AI Playwright smoke 5/5, and `npm run build`.

### Stage 9: Local Chat History Foundation

Goal: implement local-only chat history data layer before UI drawer polish.

Tasks:

- Add an IndexedDB-backed local history module for general AI conversations.
- Define conversation metadata: id, storeSlug, title, createdAt, updatedAt, message count, preview.
- Enforce max conversations per store.
- Enforce TTL cleanup.
- Keep existing single-session restore compatible or migrate carefully.
- Add unit tests for create/update/list/delete/clear/TTL.

Verification:

- Unit tests cover local history behavior.
- No Supabase/server persistence is added.
- Existing AI send flow still works.

Owner checkpoint: approve data behavior before drawer UI.

Stage 9 result:

- Done on 2026-05-27. Details: `docs/vault/changelog/2026-05-27-ai-assistant-stage9-local-history-foundation.md`.
- Added `src/domain/ai/localChatHistory.js` with IndexedDB-backed browser store and memory test store.
- Added `tests/unit/aiLocalChatHistory.test.mjs`.
- Data behavior supports create/update/list/get/delete/clear, store scoping, max 20 conversations per store, and 30-day TTL cleanup.
- Message sanitizer keeps chat text and selected assistant structured fields while dropping arbitrary file/audio/image-like fields.
- Did not connect the data layer to UI yet.
- Verification passed: local history tests 7/7, targeted AI unit tests 16/16, targeted ESLint, AI Playwright smoke 5/5, and `npm run build`.

### Stage 10: Local Chat History UI

Goal: add the actual history button and bottom sheet.

Tasks:

- Activate header history button.
- Add bottom sheet list of local chats.
- Add new chat, open chat, delete chat, clear all actions.
- Add empty state for no saved chats.
- Keep deletion explicit enough to avoid accidental loss.

Verification:

- Start new chat, send message, leave screen, see it in history.
- Open previous chat and continue.
- Delete one chat.
- Clear current store history.
- No history appears across unrelated stores.

Owner checkpoint: approve history UX.

Stage 10 result:

- Done on 2026-05-29. Details: `docs/vault/changelog/2026-05-29-ai-assistant-stage10-local-history-ui.md`.
- Activated the header history button on `/s/:storeSlug/ai`.
- Connected `AIAssistantScreen.jsx` to the existing local-only IndexedDB history store from Stage 9.
- Added a premium bottom sheet with store-scoped conversation list, empty/loading states, new chat, open/continue, delete one chat, and clear current-store history actions.
- Deletion and clear-all use explicit inline confirmation controls.
- Current chats auto-save to local history when messages exist; opening a saved chat continues it and keeps the current one-session restore behavior compatible.
- Added a route-store guard so visible/current messages are not written into another store's local history if `storeSlug` changes without a full remount.
- Did not add Supabase/server persistence, voice input, image/camera input, or unrelated AI API changes.
- Verification passed: targeted AI unit tests 18/18, i18n check, targeted ESLint, AI Playwright smoke 5/5, and `npm run build`.

### Stage 11: Mobile QA And Visual Regression Pass

Goal: ensure the redesign works like a serious mobile product.

Tasks:

- Test mobile widths 390 and 430.
- Test dark and light themes.
- Test empty state, active chat, long reply, product cards, history drawer.
- Capture screenshots for owner review.
- Fix spacing/contrast/overflow issues.

Verification:

- `node scripts/check-i18n.mjs` passes.
- Targeted ESLint passes for changed files.
- `npm run build` passes.
- Playwright smoke for `/s/mars/ai` passes or documented caveat is recorded.

Owner checkpoint: approve the full text-only AI screen.

Stage 11 result:

- Done on 2026-05-29. Details: `docs/vault/changelog/2026-05-29-ai-assistant-stage11-mobile-qa.md`.
- Ran a focused mobile visual QA pass for `/s/mars/ai` at 390px and 430px in dark and light themes.
- Captured empty, active chat, and history sheet screenshots to `C:\Users\User\AppData\Local\Temp\opencode\korset-ai-stage11\`.
- Verified no horizontal overflow, composer above bottom nav, history sheet within viewport, and no browser console/page errors in the checked states.
- Fixed one visual regression: assistant avatars in long active chat rows now align to the top of the response bubble instead of the bottom edge near the composer.
- Did not change AI behavior, Supabase/server persistence, voice, image/camera, or unrelated flows.

### Stage 12: Voice-To-Text Design Gate

Goal: design voice input separately before implementation.

Tasks:

- Decide endpoint shape for audio transcription.
- Decide model and max audio duration.
- Decide privacy copy and recording permission UX.
- Decide whether transcribed text is auto-sent or only inserted into composer.

Recommended V1 direction:

- Push-to-record.
- High-quality OpenAI transcription.
- Insert recognized text into composer for user review.
- Do not auto-send by default.

Owner checkpoint: approve before any voice code.

Stage 12 result:

- Done on 2026-05-29 after owner approval to proceed from the design discussion.
- Implemented V1 voice-to-text, not live voice chat:
  - push-to-record mic button inside the existing composer dock;
  - `MediaRecorder` client recording with supported MIME selection;
  - 30s max duration, 800ms min duration, 4MB max audio size;
  - new `/api/ai-transcribe` endpoint using OpenAI transcription;
  - recognized text is inserted into the composer for user review;
  - no auto-send;
  - no audio persistence in local history, IndexedDB, Supabase Storage, or server files;
  - metadata-only transcription usage logging, without raw audio or recognized text.
- Added one-time RU/KZ privacy notice in the composer: audio is only used for transcription and not saved in chat history.
- Follow-up hardening added auth-aware rate-limit identity, supported-audio MIME validation, a browser regression for no-auto-send voice flow, and a live OpenAI transcription smoke with a short synthetic WAV.
- Did not add image/camera input, live voice mode, audio playback, or server chat persistence.
- Details: `docs/vault/changelog/2026-05-29-ai-assistant-stage12-voice-to-text.md`.

### Stage 13: Image/Camera Input Design Gate

Goal: design image input separately before implementation.

Tasks:

- Decide gallery/camera UX.
- Decide image compression and max file size.
- Decide whether images are used only for package/composition checks.
- Decide whether images are ever stored locally; recommended first answer is no.
- Estimate cost impact through model/token usage before enabling widely.

Owner checkpoint: approve before any image code.

## Stage 1 Audit Result

Date: 2026-05-27.

Scope inspected:

- `src/screens/AIAssistantScreen.jsx`
- `src/services/ai.js`
- `src/domain/ai/catalogSearch.js`
- `src/domain/ai/context.js`
- `tests/e2e/aiGeneralMocked.spec.js`
- `tests/e2e/aiShelfUiMocked.spec.js`
- `tests/unit/aiContext.test.mjs`

Findings:

- The AI request contract is already reasonably separated. `AIAssistantScreen.jsx` calls `findCatalogCandidates()`, `buildCatalogAIContext()`, and `askGeneralAI()`; those modules should not be changed during visual foundation work.
- Store scoping is correct and must stay unchanged: `buildStoreAIContext(currentStore, { slug: routeStoreSlug || storeSlug })` preserves the route slug while store details load.
- Current local chat persistence stores one latest session via `buildAIChatStorageKey({ mode: 'general', storeSlug })`, `loadAIChatSession()`, and `saveAIChatSession()`. Full local history should be additive later, not a Stage 2 dependency.
- The weak foundation is presentation coupling inside `AIAssistantScreen.jsx`: header, empty state, message list, product groups, follow-up chips, loading state, composer, animation style, and layout styles are mixed into one screen file.
- Product groups inside AI messages are currently an internal component (`MessageProductGroups`) with its own expand/collapse state. Keep it internal for Stage 2; only move styling to CSS.
- Existing e2e tests rely on the placeholder `Спросить про товары...`, product card links, follow-up chip text, and the input staying above bottom nav. Stage 2 must preserve these expectations unless tests are intentionally updated in later visual stages.
- `aiShelfUiMocked.spec.js` already checks the important mobile risks: long AI reply, product cards, bottom-nav spacing, and horizontal overflow. It is the primary regression smoke for visual refactor.

Approved Stage 2 boundaries:

- Create `src/screens/AIAssistantScreen.css`.
- Import `./AIAssistantScreen.css` from `AIAssistantScreen.jsx`.
- Do not change `/api/ai.js`, `src/services/ai.js`, `src/domain/ai/catalogSearch.js`, or `src/domain/ai/context.js` in Stage 2.
- Do not add local history, image input, or voice input in Stage 2.
- Keep `AIAssistantScreen.jsx` as the owner of state and AI flow.
- Keep helper functions in the same file for now: `renderMessageText`, `getStockLabel`, `MessageProductGroups`.
- Use internal presentational components only if they reduce JSX complexity without changing behavior:
  - `AIHeader`
  - `AIWelcomeMessage`
  - `AIMessageList`
  - `AIComposer`
- Prefer not to create many separate component files yet. First goal is a clean screen foundation with CSS extraction and stable behavior.

Stage 2 non-negotiables:

- Preserve current behavior and route.
- Preserve current i18n keys and visible text unless a later stage explicitly changes copy.
- Preserve AI request payload shape.
- Preserve local one-session restore.
- Preserve product card expand/collapse behavior.
- Preserve follow-up chips sending their text as the next user message.
- Preserve bottom nav spacing.

Stage 2 verification plan:

- `npx eslint src/screens/AIAssistantScreen.jsx`
- `node scripts/check-i18n.mjs` if any locale text changes; expected no text changes in Stage 2.
- Targeted Playwright smoke: `npx playwright test tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiShelfUiMocked.spec.js --project=chromium`
- Baseline screenshot comparison at 390px and 430px through local Vite preview.

Stage 2 result:

- Done on 2026-05-27. Details: `docs/vault/changelog/2026-05-27-ai-assistant-stage2-style-foundation.md`.
- Created `src/screens/AIAssistantScreen.css`.
- Added `tests/unit/aiAssistantScreenStructure.test.mjs`.
- Kept AI request flow, local one-session persistence, product card expand/collapse, follow-up chips, and current visible copy unchanged.
- Verification passed: structure unit test 1/1, targeted ESLint, AI Playwright smoke 5/5, and `npm run build`.
