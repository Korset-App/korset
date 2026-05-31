---
type: changelog
status: done
date: 2026-06-01
area: ai-ui
---

# AI Assistant Visual Polish Pass

## Summary

Polished the general AI assistant screen at `/s/:storeSlug/ai` after owner feedback. The pass focused on visual quality and mobile layout only; AI behavior, server prompts, image processing, voice transcription, and local chat history logic were not changed.

## Changes

- Header glass treatment was refined toward the landing header pattern: translucent dark surface, blur/saturation, calmer subtitle color, no decorative glow, no text gradient, and no separate `AI` badge.
- `Korset AI` title now renders as one solid text title.
- History button now uses `src/components/icons/HistoryIcon.jsx`, extracted from the scan screen's SVG-style history icon.
- Empty-state intro panel no longer uses a fake glass card; it is minimal and transparent with shorter helper copy.
- General AI capabilities were reduced from six swipeable cards to four visible primary actions: find product, budget pick, explain composition, and build shopping list.
- Capability cards now render as a stable 2x2 grid with no horizontal carousel, no glass treatment, no decorative glow, and solid friendly surfaces.
- Composer dock now supports compact and expanded layouts. Long text, image preview, voice status, or active picker switch it into an expanded layout where the textarea gets full width and media/voice controls move below.
- Composer and message list now use measured CSS variables for actual bottom nav height and composer height, preventing assistant replies from being hidden behind the composer when the draft grows.
- Message bubble typography was made denser while staying larger than a very compact ChatGPT-like mobile style.
- Added a stable `AGENTS.md` UI rule forbidding gradient-filled text for core UI typography, titles, labels, and navigation.

## Files

- `src/screens/AIAssistantScreen.jsx`
- `src/screens/AIAssistantScreen.css`
- `src/domain/ai/generalCapabilities.js`
- `src/components/icons/HistoryIcon.jsx`
- `src/locales/ru/ai.json`
- `src/locales/kz/ai.json`
- `tests/unit/aiGeneralCapabilities.test.mjs`
- `tests/unit/aiAssistantScreenStructure.test.mjs`

## Verification

- `node --test tests/unit/aiGeneralCapabilities.test.mjs tests/unit/aiAssistantScreenStructure.test.mjs` passed 14/14.
- `node scripts/check-i18n.mjs` passed with no missing KZ keys.
- `npx eslint "src/screens/AIAssistantScreen.jsx" "src/domain/ai/generalCapabilities.js"` passed with no output.
- `npm run build` passed.
- `npx playwright test tests/e2e/aiShelfUiMocked.spec.js` passed 6/6.

Note: `node --check src/screens/AIAssistantScreen.jsx` is not usable in this repo because Node does not recognize the `.jsx` extension directly; lint/build covered syntax instead.
