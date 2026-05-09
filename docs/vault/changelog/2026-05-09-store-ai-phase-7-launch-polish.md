---
title: Store-aware AI Phase 7 - Cost, Limits, QA, And Launch Polish
date: 2026-05-09
status: active
domain: changelog
tags:
  - ai
  - launch
  - hardening
  - qa
---

# Store-aware AI Phase 7 - Cost, Limits, QA, And Launch Polish

## What Changed

- Made AI launch limits explicit and testable in `api/ai.js`.
- Added `tests/unit/aiLaunchLimits.test.mjs` for:
  - anonymous/authenticated rate limit values;
  - max messages;
  - max single-message length;
  - max total message payload;
  - client/server catalog candidate caps;
  - structured product group caps;
  - mobile-sized OpenAI completion limits per mode.
- Tightened catalog candidates from 20/30 down to 12 in client and server AI context.
- Tightened structured product cards to 4 groups and 3 products per group.
- Tightened OpenAI completion limits:
  - `general`: 320 tokens;
  - `product`: 280 tokens;
  - `compare`: 180 tokens;
  - `enrich`: 260 tokens.
- Added `docs/vault/plans/2026-05-09-store-ai-phase-7-qa-prompts.md`.

## Safety Notes

- No service-role key was moved to client code.
- The server still uses `SUPABASE_SERVICE_ROLE_KEY` only in `/api/ai.js` for Vault RAG context.
- Store AI notes remain factual context and do not override product safety rules.

## Known Limitations

- Browser smoke for authenticated retail/dashboard flows still depends on a valid local auth/store session.
- Phase 5 migration `027_store_ai_notes.sql` is local and still needs deliberate Supabase application before production use of store notes.
