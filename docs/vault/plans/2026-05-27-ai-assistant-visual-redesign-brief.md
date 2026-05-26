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

- Naming: should the visible title be `Körset AI`, `ChatAI`, or `Körset ChatAI`?
- Header button now: show a disabled/placeholder history icon immediately, or leave space and add it only when local history is designed?
- Capability density: 4 fixed cards or 6-7 swipeable cards with first 4 visible?
- Composer media: approve only visual placeholders now, or wait until image/voice costs and privacy copy are designed?
- Should the AI screen become visually darker/more atmospheric than home/catalog, or stay closer to the current app surfaces with only glass/premium polish?
