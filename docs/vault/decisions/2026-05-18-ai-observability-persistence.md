---
type: decision
status: proposed
date: 2026-05-18
area: ai
---

# AI Observability Persistence Decision

## Decision

Persist AI usage diagnostics later, but only as privacy-safe metadata events.

Do not persist chat messages, user prompts, assistant replies, full profile data, product ingredient text, or customer-level identifiers. Console-only logging remains acceptable until the owner explicitly approves the database implementation.

## Recommendation

Recommended path: Supabase `ai_usage_events` table with strict metadata-only columns.

This is better than external-only analytics for Körset because the main product value is store-specific: no-match rate, latency, error rate, model cost, catalog candidate quality, and safety-confidence mix per store. Those metrics need to connect back to store dashboards and pilot operations.

External observability can still be used for engineering incidents, but it should not be the source of product analytics for store owners.

## Why Persist At All

Console-only logs are useful during development, but they disappear across deploys and are difficult to aggregate by store, mode, language, model, and failure type.

Persisted metadata would let the owner answer:

- Which stores produce the most AI no-match answers?
- Are Product AI responses slower or more expensive than General AI?
- How often does the assistant rely on sparse product data?
- Which stores have high provider error or rate-limit rates?
- Is KZ usage growing, and does it behave differently from RU?
- Are catalog cards returned often enough to prove store value?

## Candidate Schema

Table: `public.ai_usage_events`

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `store_id uuid null references public.stores(id) on delete set null`
- `store_slug text null`
- `mode text not null`
- `intent text not null`
- `lang text null`
- `model text not null`
- `model_route text null`
- `status text not null`
- `error_type text null`
- `latency_ms integer null`
- `duration_ms integer null`
- `prompt_tokens integer null`
- `completion_tokens integer null`
- `total_tokens integer null`
- `max_completion_tokens integer null`
- `catalog_candidates integer null`
- `no_catalog_match boolean not null default false`
- `product_groups_count integer null`
- `rag_used boolean not null default false`
- `safety_halal text null`
- `safety_allergy text null`
- `anon_session_hash text null`

Indexes:

- `(store_id, created_at desc)`
- `(mode, created_at desc)`
- `(status, error_type, created_at desc)`
- `(no_catalog_match, created_at desc)`

## Explicitly Forbidden Fields

Do not store:

- `messages`
- `message`
- `prompt`
- `reply`
- `assistant_text`
- raw `product`
- raw `profile`
- `allergens`
- `ingredients`
- `user_id`
- `client_token`
- IP address
- email or phone

If a session-level dedupe key is needed later, use a short-lived one-way hash with a rotating server-side salt and retention limit. It must not be reusable as a customer profile.

## Retention

Recommended pilot retention:

- Raw metadata events: 90 days.
- Daily aggregate rollups by store/mode/status: 12 months.
- Delete raw rows older than 90 days with a scheduled cleanup job.

For V1 pilot, do not expose event rows directly in owner UI. Show only aggregate metrics.

## RLS And Access Shape

When implemented:

- Insert should happen only server-side from `/api/ai.js` with service-role access.
- Owners may read only aggregate views for stores they own.
- Raw event rows should not be exposed to browser clients.
- Public users must have no direct read access.
- Admin/service-role can query raw rows for debugging.

Recommended views/functions later:

- `fn_get_ai_usage_summary(store_id, days)`
- `fn_get_ai_no_match_summary(store_id, days)`
- `fn_get_ai_error_summary(store_id, days)`

## Product Metrics To Start With

Minimum useful dashboard metrics:

- AI requests by mode.
- Success/error/rate-limit/provider-error rates.
- p50/p95 latency by mode.
- Average total tokens by mode.
- No-catalog-match rate for General AI.
- Product AI safety-confidence mix: halal and allergy levels only, not profile facts.
- Product groups returned per General AI answer.
- RAG usage rate.

## Tradeoffs

Supabase metadata table:

- Pros: store-scoped analytics, owner dashboard integration, simple joins, controlled retention.
- Cons: requires migration, RLS, cleanup job, and careful review before production.

External analytics only:

- Pros: faster for engineering visibility, no product schema work.
- Cons: weak store dashboard value, harder privacy controls, not ideal for owner-facing metrics.

Console-only:

- Pros: zero privacy/schema risk now.
- Cons: not durable, not aggregate-friendly, not enough for pilot learning.

## Implementation Gate

This decision does not implement persistence.

Before coding, owner must explicitly approve:

1. Creating `ai_usage_events` and RLS/aggregate views.
2. 90-day raw event retention.
3. Metadata-only field list.
4. Whether owner dashboard should show AI analytics in V1 or keep it internal during pilot.

Until then, `/api/ai.js` should keep console-only `buildAIUsageEvent()` logging.
