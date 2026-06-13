# KORSET — AI HANDOFF

> Рабочий файл для передачи состояния между Codex, OpenCode, Windsurf, Antigravity и другими агентами.
> Не превращать в вечный changelog. После завершения крупной работы durable facts перенести в Vault.

## Current Handoff

Task: Product EAN integrity recovery
Owner/agent: OpenCode
Date: 2026-06-11

Goal:
Fix wrong product resolution after barcode scan caused by polluted `global_products.alternate_eans`, without deleting multi-EAN support.

Changed files:
- `src/domain/product/resolver.js`
- `src/domain/product/alternatives.js`
- `src/domain/product/eanAliases.js`
- `src/domain/product/eanAliasClassification.js`
- `src/domain/product/correctionReports.js`
- `src/domain/product/correctionReview.js`
- `src/domain/product/normalizers.js`
- `src/screens/ProductScreen.jsx`
- `src/screens/EanRecoveryScreen.jsx`
- `src/locales/ru/product.json`
- `src/locales/kz/product.json`
- `src/locales/ru/retail.json`
- `src/locales/kz/retail.json`
- `scripts/audit-ean-integrity.mjs`
- `scripts/import-ean-policy.cjs`
- `scripts/legacy-ean-script-guard.cjs`
- `scripts/migrate-legacy-ean-aliases.mjs`
- `scripts/arbuz-subcategory-parser.cjs`
- `scripts/arbuz-catalog-parser.cjs`
- `scripts/npc-eans-harvest.cjs`
- `scripts/npc-enrich.cjs`
- `scripts/resolve-v3.cjs`
- `scripts/resolve-alternate-eans.cjs`
- `supabase/migrations/047_product_ean_aliases.sql`
- `supabase/migrations/048_product_correction_events.sql`
- `supabase/migrations/049_trusted_ean_alias_resolver.sql`
- `tests/unit/eanAliasModel.test.mjs`
- `tests/unit/eanAliasClassification.test.mjs`
- `tests/unit/productScanContainment.test.mjs`
- `tests/unit/productCorrectionReports.test.mjs`
- `tests/unit/productCorrectionReview.test.mjs`
- `tests/unit/eanRecoveryApiCorrectionStatus.test.mjs`
- `tests/unit/eanRecoveryApiTrustedPromotion.test.mjs`
- `tests/unit/importEanPolicy.test.mjs`
- `tests/unit/legacyEanScriptGuard.test.mjs`
- `docs/vault/plans/2026-06-01-product-ean-integrity-recovery-plan.md`
- `docs/vault/plans/2026-06-08-ean-stage6b-review-actions-plan.md`
- `docs/vault/changelog/2026-06-01-ean-stage1-scan-containment.md`
- `docs/vault/changelog/2026-06-01-ean-stage2-trusted-alias-model.md`
- `docs/vault/changelog/2026-06-08-ean-stage3-legacy-alias-dry-run.md`
- `docs/vault/changelog/2026-06-08-ean-stage3b-live-evidence-insert.md`
- `docs/vault/changelog/2026-06-08-ean-stage5a-product-correction-reporting.md`
- `docs/vault/changelog/2026-06-08-ean-stage6a-correction-inbox.md`
- `docs/vault/changelog/2026-06-08-ean-stage6b-review-actions.md`
- `docs/vault/changelog/2026-06-08-ean-stage6c-promotion-guardrails.md`
- `docs/vault/changelog/2026-06-08-ean-stage6c-server-promotion-action.md`
- `docs/vault/changelog/2026-06-08-ean-stage6c-admin-candidate-review-ui.md`
- `docs/vault/changelog/2026-06-09-ean-stage6c-typed-promotion-confirmation.md`
- `docs/vault/changelog/2026-06-10-ean-stage7a-parser-import-hardening.md`
- `docs/vault/changelog/2026-06-10-ean-stage7b-legacy-script-live-guard.md`
- `docs/vault/changelog/2026-06-11-ean-stage4-trusted-alias-resolver.md`

Done:
- Stage 0 audit complete. Report: `C:\tmp\korset-ean-integrity-audit.json`.
- Stage 1 scan containment complete locally. Buyer scan no longer accepts alternate-only resolver matches as exact product identity.
- Stage 2 migration `047_product_ean_aliases.sql` was applied by owner. Live `product_ean_aliases` exists.
- Stage 3 dry-run complete. Report: `C:\tmp\korset-ean-alias-migration-dry-run.json`.
- Stage 3B live evidence insert complete. Live `product_ean_aliases`: total `144856`, `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`.
- Stage 5A correction UI/code complete: ProductScreen has “Сообщить об ошибке” modal and metadata-only payload contract.
- Migration `048_product_correction_events.sql` was applied by owner. Live smoke submit through the domain helper and anon key passed, then the smoke row was deleted with service role.
- Stage 6A read-only correction inbox complete locally: `/retail/:storeSlug/ean-recovery` now shows open shopper correction reports for the current store with summary counts and latest rows. No review actions or trusted alias promotion were added.
- Stage 6B correction status actions complete locally: open reports can be marked `reviewing`, `fixed`, `rejected`, or `duplicate`. Product mutation actions remain admin-only; correction status updates are allowed only for admin or the owner of the report's `store_id`.
- Stage 6C-A trusted promotion guardrails complete locally: `canPromoteEanAliasToTrusted()` and `buildTrustedAliasPromotionUpdate()` define strict local rules for future alias promotion. No UI/API promotion action and no DB writes were added.
- Stage 6C-B server-side trusted promotion action complete locally: `promote-ean-alias-trusted` exists in `api/ean-recovery.js`, admin-only, with live reads for alias, current trusted conflict, and primary-EAN conflict before update. No UI button was added and no live promotion was executed.
- Stage 6C-C admin candidate review UI complete locally: `/retail/:storeSlug/ean-recovery` shows an admin-only read-only trusted EAN candidates block with source/confidence/block reasons. No promotion button or UI API call was added.
- Stage 6C-D explicit admin-only typed confirmation UI complete locally: only admins see a promotion action, only for candidates with local `canRequestPromotion=true`, and the modal requires manual same-product/same-package review plus entering the last 4 EAN digits before calling `promote-ean-alias-trusted`. No live promotion was executed.
- Stage 7-A parser/import hardening complete locally: Arbuz broad NPC/name search results no longer become buyer-visible primary `ean` or `alternate_eans`; exact Arbuz barcode fields still can become primary EAN. NPC codes are preserved only as review evidence in `specs_json.ean_recovery_candidates`. No live import/write was executed.
- Stage 7-B legacy script guard complete locally: risky old scripts (`npc-eans-harvest.cjs`, `npc-enrich.cjs`, `resolve-v3.cjs`, `resolve-alternate-eans.cjs`) are dry-run-only and abort live mode before DB/API work. No live data write was executed.
- Stage 4 no-op-safe trusted-alias resolver path complete and applied live by owner: migration `049_trusted_ean_alias_resolver.sql` replaces `fn_resolve_product_by_ean` so it resolves exact primary/store EAN first, then active `product_ean_aliases.status='trusted'` with confidence >=80 only. The SQL contract no longer reads legacy `global_products.alternate_eans`. Client containment accepts non-primary RPC results only when explicit trusted-alias metadata matches the scanned EAN. Live smoke passed while `trusted=0`.

Not done:
- No trusted aliases exist yet. Do not enable broad alternate resolution.
- No safe real candidate has been promoted live yet.
- Existing live alias evidence has only `source='legacy_alternate_eans'`; there are no trustable-source candidates yet, so controlled promotion is blocked until exact evidence is created or supplied.
- Photo upload for correction reports is intentionally not implemented.
- Other legacy barcode enrichment scripts outside the Stage 7-B set may still need separate review before live use.

Do not touch:
- Do not delete `global_products.alternate_eans`.
- Do not bulk-promote legacy aliases to `trusted`.
- Do not weaken RLS.
- Do not use `alternate_eans` directly for buyer scan resolution again.

Verification already run:
- `node --test tests/unit/productCorrectionReports.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/productScanContainment.test.mjs` — 17/17 passed.
- `node scripts/check-i18n.mjs` — PASS.
- `npx eslint src/domain/product/correctionReports.js src/screens/ProductScreen.jsx` — passed.
- `npm run check:agent:docs` — PASS.
- `npm run build` — passed with existing Vite/Sentry warnings.
- `npm run memory:save` and `vault-embed` completed.
- Live smoke after owner-applied migration 048: `submitProductCorrectionReport()` with anon key returned `{ ok: true }`; smoke row cleanup deleted 1 row.
- Stage 6A: `node --test tests/unit/productCorrectionReview.test.mjs tests/unit/productCorrectionReports.test.mjs` — 6/6 passed; `node scripts/check-i18n.mjs` — PASS; targeted ESLint — 0 errors with existing `set-state-in-effect` warnings; live data sanity found 0 open reports for `mars`, `nurly`, and `kalina`.
- Stage 6B: targeted EAN/correction unit tests — 24/24 passed; `node --check api/ean-recovery.js` passed; targeted ESLint — 0 errors with existing `EanRecoveryScreen.jsx` warnings; i18n/docs/build passed; live DB smoke inserted, updated `new -> rejected`, and deleted one temporary correction event row.
- Stage 6C-A: `node --test tests/unit/eanAliasModel.test.mjs` — 8/8 passed; targeted EAN/correction set — 28/28 passed; `npx eslint src/domain/product/eanAliases.js` passed; live alias count stayed `trusted=0`.
- Stage 6C-B: `node --test tests/unit/eanRecoveryApiTrustedPromotion.test.mjs` — 4/4 passed; targeted EAN/correction set — 32/32 passed; `node --check api/ean-recovery.js` passed; targeted ESLint passed; live alias count stayed `trusted=0`.
- Stage 6C-C: alias model + trusted promotion tests — 14/14 passed; broader EAN/correction set — 29/29 passed; i18n PASS; targeted ESLint 0 errors with existing `EanRecoveryScreen.jsx` warnings; build passed; live candidate query returned sample rows; live `trusted=0`.
- Stage 6C-D: TDD red for `buildTrustedAliasTypedConfirmation()` failed before implementation; alias model + trusted promotion tests — 16/16 passed; broader EAN/correction unit set — 36/36 passed; `node scripts/check-i18n.mjs` — PASS; targeted ESLint 0 errors with existing `EanRecoveryScreen.jsx` `set-state-in-effect` warnings; `npm run build` passed with existing Vite/Sentry warnings; live alias count stayed total `144856`, `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`.
- Stage 7-A: TDD red for `scripts/import-ean-policy.cjs` failed before implementation; `node --test tests/unit/importEanPolicy.test.mjs` — 3/3 passed; `node --test tests/unit/importEanPolicy.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/productScanContainment.test.mjs` — 24/24 passed; `node --check scripts/import-ean-policy.cjs`, `node --check scripts/arbuz-subcategory-parser.cjs`, and `node --check scripts/arbuz-catalog-parser.cjs` passed.
- Stage 7-B: TDD red for `scripts/legacy-ean-script-guard.cjs` failed before implementation; `node --test tests/unit/legacyEanScriptGuard.test.mjs tests/unit/importEanPolicy.test.mjs tests/unit/eanAliasModel.test.mjs tests/unit/eanAliasClassification.test.mjs tests/unit/productScanContainment.test.mjs` — 27/27 passed; `node --check` passed for guard and all four guarded scripts; `node scripts/npc-enrich.cjs --limit=1` aborted before live work with expected guard error.
- Live read-only stats after Stage 7-B: active global products `13101`; products with non-empty legacy `alternate_eans` `9429`; legacy alias relations `146805`; unique alias codes `54950`; duplicate alias codes `26024`; alias relations that are also an active primary EAN `35516`; `product_ean_aliases` total `144856`, trusted `0`, review `26771`, quarantined `118085`, rejected `0`; correction reports all statuses `0`.
- Stage 4 local: TDD red for missing trusted-alias resolver helpers failed before implementation; `node --test tests/unit/productScanContainment.test.mjs tests/unit/eanAliasModel.test.mjs` — 18/18 passed; targeted ESLint passed with 0 errors and one existing `EventTarget` warning.
- Stage 4 live smoke after owner-applied migration 049: alias counts stayed `trusted=0`, `review=26771`, `quarantined=118085`, `rejected=0`; anon RPC resolved exact primary EAN `4660298502127`; anon RPC returned `null` for quarantined alias `4870209550257`; trustable-source candidate check returned none, only `legacy_alternate_eans=144856`.

Risks / questions:
- ProductScreen correction UI is inlined to minimize new files; future polish can extract it.
- `anon` insert without readback works as intended; `insert().select()` fails for anon because no public read policy exists, which is the desired privacy posture for the report queue.
- Next trusted aliases should come only from manual/admin review, audit scan evidence, exact external barcode lookup, or store import.
- Stage 6B actions update only correction report status; do not extend them into product/EAN mutations without a separate plan.
- Stage 6C-A is local guardrail logic only; do not add a promotion button until server-side conflict checks are implemented and tested.
- Stage 6C-B API exists but should not be exposed in UI until explicit admin review UX and confirmation copy are designed.
- Stage 6C-D UI can call promotion only after typed confirmation, but live promotion should still be limited to separately verified safe candidates; do not promote legacy/broad-source aliases or use bulk actions.

Next step:
Next, create or supply one exact-evidence candidate from a trustable source (`manual_admin`, `audit_scan`, `store_import`, `external_exact_barcode`, `arbuz_barcode`, or `openfoodfacts`) before attempting a controlled single trusted promotion. Do not promote legacy aliases in bulk and do not re-enable broad alternate resolution.

Use this structure when handing work to another agent:

```text
Task:
Owner/agent:
Date:

Goal:

Changed files:

Write-zone:

Done:

Not done:

Do not touch:

Verification:

Risks / questions:

Next step:
```
