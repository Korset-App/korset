---
title: AI Premium Stage 7 Observability And Cost Control
status: done
date: 2026-05-17
domain: changelog
---

# AI Premium Stage 7 Observability And Cost Control

## Summary

Stage 7 of the AI premium upgrade is complete. The AI API now emits more useful privacy-safe usage diagnostics for quality and cost debugging without logging shopper message text, profile details, product composition, or chat history.

## Changes

- Extended `buildAIUsageEvent()` in `api/ai.js` with:
  - `intent`
  - `safetyConfidence`
  - `noCatalogMatch`
  - `productGroupsCount`
  - `latencyMs`
  - existing `errorType`
- Added `inferAIIntent()` for metadata-only request classification:
  - `product_fit_check`
  - `product_compare`
  - `product_enrichment`
  - `catalog_recommendation`
  - `catalog_no_match`
- Added `buildAISafetyConfidence()` for product-mode safety confidence labels only, reusing the existing safety contract.
- Success and provider-error usage logs now include the new diagnostics.
- No persistence layer was added. Console logs remain the destination until the owner approves analytics storage.
- Automatic `gpt-5.4-mini` routing was not enabled; default routing remains `gpt-5.4-nano`.
- Existing cost and abuse limits remain unchanged:
  - anonymous: 8/min/IP
  - authenticated: 30/min/user
  - max messages: 12
  - max single message: 1200 chars
  - max total payload: 6000 chars

## Product Decision

Observability must help diagnose quality issues without turning AI chats into a sensitive analytics dataset. Store slug, mode, intent, token counts, latency, catalog/no-match shape, product group count, and safety confidence are acceptable. User message text, raw profile details, full product composition, and chat history are not acceptable in usage logs.

## Verification

- `node --test tests/unit/aiLaunchLimits.test.mjs` passed: 11/11.
- `node --test tests/unit/ai*.test.mjs` passed: 74/74.
