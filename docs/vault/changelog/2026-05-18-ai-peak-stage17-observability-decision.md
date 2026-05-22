---
type: changelog
status: done
date: 2026-05-18
area: ai
---

# AI Peak Stage 17: Observability Persistence Decision

## Summary

Stage 17 produced the AI observability persistence decision without implementing database or RLS changes.

Current `/api/ai.js` usage diagnostics remain console-only. The proposed future path is a metadata-only Supabase table for AI usage events, with strict privacy boundaries and short raw-event retention.

## Decision

Decision note: `docs/vault/decisions/2026-05-18-ai-observability-persistence.md`.

Recommendation:

- Persist AI diagnostics later as metadata-only events.
- Use Supabase as the product analytics source because AI value must become store-scoped.
- Keep external observability for engineering incidents, not owner product analytics.
- Do not store messages, prompts, replies, raw profiles, raw products, allergens, ingredients, user IDs, client tokens, IPs, email, or phone.

## Proposed Future Shape

Candidate table: `public.ai_usage_events`.

Safe fields include:

- store id/slug;
- mode, intent, language;
- model and model route;
- status and error type;
- latency/duration;
- token counts;
- catalog candidate count;
- no-catalog-match flag;
- product group count;
- RAG usage;
- safety confidence levels only.

Raw metadata retention recommendation: 90 days. Aggregate daily rollups can remain for 12 months.

## Explicit Non-Changes

- No migration was created.
- No RLS policy was changed.
- No API persistence was added.
- No owner dashboard analytics UI was added.
- No message content logging was introduced.

## Verification

- `npm run check:agent:docs` passed.

## Next

Stage 18 should run the pilot launch gate. Any implementation of AI analytics persistence must wait for owner approval.
