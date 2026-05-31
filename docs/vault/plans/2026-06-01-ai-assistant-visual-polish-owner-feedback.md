---
type: plan
status: active
date: 2026-06-01
area: ai-ui
---

# AI Assistant Visual Polish Owner Feedback

## Scope

This note captures owner feedback for the next visual polish pass on the general AI assistant screen at `/s/:storeSlug/ai`. No implementation decision is final until the owner answers the open questions below.

## Owner Feedback Summary

- The current top header does not feel premium enough. The `Korset AI` title treatment needs better readability, especially the `AI` part, and the header glass effect should feel closer to the strongest glass patterns already used in the landing/home parts of the project.
- The current history/recent icon should be replaced with the high-quality SVG-style icon used on the scan screen, not the current Material Symbol look.
- The empty-state intro block currently uses glass where there is no meaningful background behind it, making it look gray and less intentional. Remove or significantly reduce the glass treatment and make the block more minimal, premium, and focused.
- The long explanatory copy in the empty state may need to be shortened.
- The capability prompts currently show six options in a horizontally scrollable layout. The owner is deciding between four primary actions or six smaller actions that fit without awkward scrolling.
- The capability area needs clearer explanation that these are example scenarios the shopper can choose from.
- The overall AI screen should reuse the existing project palette and premium visual language, not become overly saturated, decorative, or grid/noise-heavy.
- The current screen layout feels broken around the bottom composer. The input area sits too high and leaves an unprofessional gap between the composer and bottom navigation.
- Image and microphone buttons are vertically misaligned inside the composer.
- The composer is too tall in its default state and should be tightened visually.
- Long voice-transcribed text currently makes the left-side image/microphone controls occupy too much horizontal space, so typed text has a narrow usable area. The composer needs a professional responsive structure for long text.
- Assistant responses can be hidden behind the fixed composer, especially when the composer grows with a long draft. The message list bottom spacing must adapt to composer height, bottom navigation height, safe-area inset, browser, OS, and aspect ratio.
- Message text currently feels too large; fewer words fit on a mobile screen than expected for a professional assistant. The next pass should reduce message typography slightly and compare density with leading mobile chat/assistant interfaces.
- Visual QA must cover different device sizes, aspect ratios, mobile browsers, OS safe areas, dark/light themes, long assistant replies, long composer drafts, image preview, and voice states.

## Initial Recommendation To Discuss

Prefer four primary capability actions for V1 instead of shrinking six cards into the first viewport. Four actions should reduce cognitive load, remove awkward horizontal scrolling, and make the empty state feel more premium. Secondary scenarios can still appear as follow-up chips after the first assistant response or be added later if usage proves they are needed.

Suggested first four:

- Find a product in the current store.
- Pick a better alternative.
- Explain ingredients / composition.
- Build a small shopping list for a meal or need.

Possible secondary actions to keep out of the initial four:

- Fit-Check explanation.
- Budget choice under a target price.

## Owner Decisions

- Use four primary capability actions, not six compact/swipeable cards.
- Final four actions: find product, budget pick, explain composition, build shopping list.
- Keep `Korset AI` as one solid text title; do not use a separate `AI` badge after owner review.
- Header content stays minimal: `Korset AI`, short subtitle, and history.
- Empty-state helper copy: `Выберите сценарий или напишите свой вопрос.`
- Composer should be rebuilt as a professional responsive dock, with long text getting full-width typing space and media/voice controls moving out of the text column.
- Message text density should be between the previous large Körset style and ChatGPT mobile density: smaller than before, but not tiny.
- Do not use gradient-filled text in core UI titles/labels/navigation; this was promoted to `AGENTS.md` as a stable UI rule.

## Open Questions For Owner

- Should the empty state show four large, calm actions, or six compact actions without horizontal scroll?
- If using four actions, which four should be final for launch?
- Should the header title remain `Korset AI`, or should `AI` become a separate small badge to improve readability?
- Should the header show only title/subtitle/history, or also a tiny store-context indicator?
- Should the intro copy be a direct question only, or include one short explanatory line above the actions?
- Should the composer controls stay inside one row, or should long text move controls into a separate compact toolbar while the textarea gets full width?
- Should message density be closer to ChatGPT mobile style, Telegram-like chat density, or Körset's existing larger product-screen readability?

Resolved on 2026-06-01: use the middle density described above.

## Implementation Pass 2026-06-01

- Header glass was adjusted toward the landing header pattern: minimal translucent dark surface, blur/saturation, no decorative glow, no text gradient, and no separate `AI` badge.
- History button now uses the shared SVG-style `HistoryIcon` extracted from the scan screen icon style.
- Empty intro panel no longer uses fake glass; it is minimal, transparent, and copy-light.
- Capability cards are now a two-by-two grid with four actions, no horizontal carousel, no glass treatment, no decorative glow, and solid friendly card surfaces.
- Composer now measures the actual bottom navigation and composer heights with `ResizeObserver`, then feeds CSS variables so the message list bottom padding adapts to long drafts, image preview, voice panel, safe area, and nav height.
- Composer has compact and expanded layouts. Expanded layout gives the textarea full width and places image/mic controls below, preventing long voice text from being squeezed into a narrow column.
- Message bubble typography was reduced from the previous large style to a denser but still readable mobile assistant style.

Verification:

- `node --test tests/unit/aiGeneralCapabilities.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs` passed 14/14.
- `node scripts/check-i18n.mjs` passed with no missing KZ keys.
- `npx eslint "src/screens/AIAssistantScreen.jsx" "src/domain/ai/generalCapabilities.js"` passed with no output.
- `npm run build` passed.
- `npx playwright test tests/e2e/aiShelfUiMocked.spec.js` passed 6/6.

## Implementation Guardrails

- Do not change AI behavior, prompts, server APIs, image processing, voice transcription, or chat history logic in this visual polish pass unless a layout bug requires a small client-side state measurement.
- Keep all consumer routes under `/s/:storeSlug/`.
- Use existing theme tokens and semantic CSS variables; avoid hardcoded raw white/black core surfaces.
- New user-facing copy must use RU and KZ i18n keys.
- Reuse the scan screen SVG history icon by extracting a shared component only if it avoids duplication cleanly.
- Verify with mobile screenshots/smoke tests before claiming the polish is complete.
