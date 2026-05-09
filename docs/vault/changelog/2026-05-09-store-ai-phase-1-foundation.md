# 2026-05-09 — Store-Aware AI Phase 1 Foundation

> Связи: [[2026-05-08-store-ai-pilot-spec]] · [[2026-05-09-store-ai-implementation-roadmap]] · [[fit-check-engine]] · [[product-resolution]]

## Summary

Started Phase 1 from `docs/vault/plans/2026-05-09-store-ai-implementation-roadmap.md`.

Implemented the first store-aware AI foundation slice:
- compact store context helper for AI calls;
- local AI chat session persistence helpers;
- general AI and product AI now send store context to `/api/ai`;
- general AI screen and product AI screen persist recent messages locally;
- both AI screens expose a clear-chat action when messages exist;
- AI starter chips now demonstrate store-assistant capabilities;
- backend `/api/ai` sanitizes store context and uses it in general/product prompts;
- prompts now use formal "вы" tone and safer wording about missing facts.

## Files

- `src/domain/ai/context.js`
- `tests/unit/aiContext.test.mjs`
- `src/services/ai.js`
- `src/screens/AIAssistantScreen.jsx`
- `src/screens/AIScreen.jsx`
- `api/ai.js`
- `src/locales/ru/ai.json`
- `src/locales/kz/ai.json`

## Verification

- `node --test tests/unit/aiContext.test.mjs` — PASS
- `node scripts/check-i18n.mjs` — PASS
- `npm run lint` — PASS with existing project warnings, 0 errors
- `npm run build` — PASS

## Known Boundaries

- Product cards, catalog grounding, grouped recipe lists and structured API responses are not part of this slice; they remain Phase 2/3.
- Product AI direct-route robustness is still Phase 4. Current product AI still relies on existing product lookup behavior and `location.state` fallback.
- Store AI notes DB field is still Phase 5. Helper/API already tolerate an `aiStoreNotes` value if added later.
- Chat history is local browser storage only, not Supabase/server history.

