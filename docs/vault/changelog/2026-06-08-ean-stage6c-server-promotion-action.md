---
title: EAN Stage 6C-B Server Promotion Action
domain: changelog
status: complete-local
date: 2026-06-08
language: ru
---

# EAN Stage 6C-B Server Promotion Action

## Context

Stage 6C-A added local trusted-promotion guardrails. Stage 6C-B adds a server-side API contract for trusted alias promotion, but still does not expose a UI button and does not perform any live promotion.

## Scope

Added `promote-ean-alias-trusted` action to `api/ean-recovery.js` through exported helper `handleTrustedAliasPromotion()`.

The action is admin-only and performs live conflict reads before any update:

- fetch alias candidate from `product_ean_aliases` by id;
- fetch current active trusted alias for the same EAN;
- fetch active primary `global_products.ean` target for the same EAN;
- apply `buildTrustedAliasPromotionUpdate()` guardrails;
- update the alias row only if the guard passes.

## Safety

- No UI promotion button was added.
- No live promotion write was executed.
- No `trusted` rows were created.
- Non-admin users cannot call the promotion action.
- Legacy/broad sources remain blocked by Stage 6C-A guardrails.
- API checks live primary-EAN and existing trusted conflicts inside the same request before update.
- The update is guarded with `.eq('id', id).eq('status', alias.status)` to reduce stale-status races.

## Verification

- TDD red: `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` failed before `handleTrustedAliasPromotion` existed.
- `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 4/4 passed.
- Targeted EAN/correction test set — 32/32 passed.
- `node --check api/ean-recovery.js` — passed.
- `npx eslint api/ean-recovery.js src/domain/product/eanAliases.js` — passed with no output.
- Live alias count check: total `144856`, `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`.

## Next

Stage 6C-C should add a read-only trusted-candidate view or an admin-only UI affordance that still requires explicit reviewer confirmation before calling the promotion action. Do not expose promotion to retail owners yet.
