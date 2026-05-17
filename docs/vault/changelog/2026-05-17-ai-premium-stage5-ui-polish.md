---
type: changelog
status: active
date: 2026-05-17
area: ai
---

# AI Premium Stage 5: AI UI Polish

## Summary

Stage 5 is complete as a focused UI polish pass for the AI screens. The pass avoided a broad redesign and kept the existing chat model intact.

## Changes

- Added semantic `--warning-dim` and `--warning-border` tokens for dark and light themes.
- Replaced touched raw AI-screen colors with semantic tokens:
  - online status now uses `--success-bright`;
  - user bubble text/send icon uses `--text-inverse`;
  - warning and error panels use semantic warning/error tokens.
- Replaced the Product AI missing-image emoji and warning emoji with Material Symbols so the UI feels more system-consistent.
- Fixed Product AI route-state handling: when a product is already passed through navigation state, the screen no longer waits indefinitely for store loading before rendering the chat.
- Kept Product AI and General AI cards compact; no nested marketing-style card redesign was introduced.

## Verification

- `node --test tests/unit/ai*.test.mjs` passes 72/72.
- `node scripts/check-i18n.mjs` passes with 0 missing KZ keys.
- `npm test -- tests/e2e/aiGeneralMocked.spec.js tests/e2e/aiProductMocked.spec.js --reporter=list` passes 2/2 without real OpenAI calls.
- `npm run check:agent:ui` passes. Existing lint warnings remain unrelated; no lint errors.

## Notes

- Real OpenAI QA calls remain deferred until owner approval.
- `scratch/test_arbuz_category.cjs` was already modified outside this work and was not touched.
