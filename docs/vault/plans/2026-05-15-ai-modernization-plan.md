---
type: plan
status: active
date: 2026-05-15
area: ai
---

# AI Modernization Plan

## Goal

Bring Körset AI from a working assistant to a professional, store-aware buyer assistant that feels useful, trustworthy, and safe in a grocery store.

## Scope

V1 scope remains grocery stores only. The assistant must recommend only products visible in the current store catalog context and must not invent price, stock, halal, allergy, or product facts.

## Stages

### Stage 1 — Follow-Up Intelligence

Make post-answer follow-up chips actually useful.

Current problem: the UI supports `followUps`, but `/api/ai.js` returns an empty array. This makes the chat feel static after the first answer.

Target:

- Generate 2-3 concise follow-up chips from the query, profile, warnings, and store catalog candidates.
- Keep follow-ups deterministic and cheap; do not spend extra model calls.
- Support RU and KZ output.
- Avoid unsafe or impossible promises.
- Cover empty-catalog/no-match states honestly.

### Stage 2 — General AI Recommendation Quality

Improve general store assistant behavior.

Target:

- Better candidate selection for grocery intents: budget, category, halal, sugar-free, lactose-free, dinner, recipe-like queries.
- More useful product card grouping with readable group titles.
- Better no-result behavior: helpful alternatives without recommending outside the current store.
- Tests for candidate ranking and grouping.

### Stage 3 — Product AI Answer Quality

Improve product-card AI responses.

Target:

- Stronger prompt contract for: personal fit, composition explanations, halal uncertainty, allergy caution, out-of-stock alternatives.
- Product AI follow-ups after first response.
- Better distinction between known facts, inferred guidance, and unknown data.
- Tests for payload shape and prompt guardrails.

### Stage 4 — Browser QA And Prompt Pack

Run real user-flow QA with a small controlled number of AI calls.

Target:

- Test 30-50 scenarios across Product AI and General AI.
- Include halal, allergies, budget, missing data, out-of-stock, category, and "not in this store" cases.
- Record issues as a QA matrix before fixing more layers.

### Stage 5 — Cost, Routing, And Observability

Add quality/cost controls after the assistant behavior is stable.

Target:

- Default model remains `gpt-5.4-nano`.
- Route only complex/high-risk requests to `gpt-5.4-mini` later.
- Add lightweight usage/cost observability and error classification.
- Keep rate limits and payload caps explicit.

## Execution Rule

Work one stage at a time. Do not combine stages unless a later stage is blocked by a missing foundation from the current stage.
