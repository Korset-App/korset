---
title: Security Hardening + TR TS 022/2011 Allergen Audit
date: 2026-04-28
tags: [security, allergens, hardening, migrations, tests, ci, legal-critical]
related: [[fit-check-engine]] · [[allergen-cross-contamination]]
---

# 2026-04-28: Security Hardening (Этапы 1-3) + TR TS Allergen Audit

Полный security pass + юридически-критичный аудит словарей аллергенов и нормализации. Три структурированных коммита (`4258a5c → 518839c → 883e94e`), готовы к Vercel autodeploy.

## Этап 1 — Security Hardening (commit 518839c)

### Migration 017_security_hardening.sql

- `users.is_admin` + `protect_admin_column` trigger — только `service_role` может менять флаг
- `is_admin_user(auth_id)` RPC — серверная проверка для api/ean-recovery
- `client_token` колонка в `scan_events` + индекс — anti-spam ID
- RLS `scan_events_insert_anon` — rate limiting + `client_token` (anti-spam metrics poisoning)
- RLS `stores_update_owner` — владелец меняет только non-billing fields, plan/expires только service_role
- `audit_stores` trigger + `stores_audit` table — track всех изменений plan/billing

### Migration 018_db_foundation.sql

- `search_path = public, pg_temp` на всех `SECURITY DEFINER` функциях (CVE-2018-1058)
- Atomic `increment_cache_scan_count` + `increment_missing_scan_count` RPC — устранение race condition (раньше 100 параллельных сканов теряли 50+ инкрементов)
- `upsert_external_cache` RPC с EAN валидацией — заменяет public anon writes
- `bulk_update_store_products` RPC — заменяет N+1 anon writes из retail import
- `get_lost_revenue` использует store median price (раньше всегда 0)
- TSVECTOR с русской морфологией (раньше `simple` не находила "молока" по запросу "молоко")
- `vault_embeddings`: anon read закрыт (только service_role)

### Code Fixes

- `api/ean-search.js` — **REMOVED**, был unauthenticated public proxy, выжигавший платный API ключ
- `api/ean-recovery.js` — admin role check через `is_admin_user` RPC
- `api/delete-user.js`, `api/ai.js` — sanitized error messages (no stack traces to client)
- `api/ai.js` — input validation, message length limits, message count caps
- `vite.config.js` — убран `localApiPlugin` (был unauthenticated `/api/ai` в dev режиме)
- `src/utils/userIdentity.js` — `getOrCreateClientToken` с `crypto.randomUUID` + storage fallback
- `src/domain/product/resolver.js` — `client_token` в scan logs, atomic RPC для cache/missing
- `src/utils/offlineDB.js` — `client_token` в pending scan flush
- `src/utils/retailImport.js` — `xlsx` → `exceljs` (CVE-2023-30533, CVE-2024-22363)
- `package.json` — `xlsx` removed, `exceljs` added, `dev:api` script для `vercel dev`

## Этап 2 — TR TS 022/2011 Allergen Audit (commit 883e94e)

### 8 пробелов в словарях (legal-critical)

#### Bug #1: diabetes — только 3 sugar keywords

`fitCheck.js` использовал `'сахар' || 'сироп' || 'фруктоз'`, игнорировал `SUGAR_SYNONYMS` (30 entries). Диабетик не предупреждался о **мальтодекстрине, декстрозе, патоке, мёде, агаве, кленовом сиропе** — частых ингредиентах джемов, конфет, глазированных хлопьев.

#### Bug #2: gluten без хлопьев и отрубей

Добавлены: `пшенич` (прилагательное «мука пшеничная»), `хлопь` (хлопья пшеничные/овсяные), `отруб` (пшеничные отруби — 100% gluten), `геркулес`, `мюсли`, `гранол`, `лаваш`, `пита` + EN: `bran`, `flakes`, `muesli`, `granola`. Целиак сканировал «Хлопья пшеничные» — получал safe.

#### Bug #3: fish без КЗ-видов

Добавлено 18 видов: форель, окунь, судак, хек, карп, путассу, мойва, килька, шпрот, щука, налим, осетр, белуга, горбуша, кета, нерка, голец, плотва, лещ, сом, сазан, толстолоб + EN: trout/bass/mackerel/pike/sprat. Аллергик сканировал «Килька в томате» — safe.

#### Bug #4: false-positive `икр`

Substring `'икр'` ловил **«микрокристаллическая целлюлоза»** (E460-E462, частая добавка). Заменён на узкие формы: `икра/икры/икре/икрой/икринк`.

#### Bug #5: false-positive `ром`/`винов`

`'ром'` ловил «хром», «ароматизатор». `'винов'` ловил «виноватый». Заменены на формы с пунктуацией: `'ром '`/`'ром,'`/`'ром.'`, `'вино '`/`'вино,'`/`'вино.'`.

#### Bug #6: halal-словарь дырявый

Добавлены: этанол, виски, джин, текила, вермут, шампанск, портвейн, херес, абсент, бренди, кагор, арак, саке + EN.

#### Bug #7: vegan только milk

Раньше vegan-проверка смотрела только на молочку. Теперь: молоко, **яйца, рыба, морепродукты (crustaceans/mollusks), мёд, мясо** (говяд/свинин/курин/индейк/утк/гус), желатин, сало, бекон, ветчина.

#### Bug #8: dairy_free игнорировал prodAllergens

Раньше: `if (dairy_free && dietTags.contains_dairy)`. Если у товара `allergens=['milk']` без `dietTags` — пользователь без предупреждения. Теперь оба источника учитываются.

### Legacy Allergen ID Purge

`normalizers.js` имел устаревший дубликат `OFF_ALLERGEN_MAP`, который маппил OFF-теги в legacy ID:

| OFF tag | Возвращал (баг) | Должен (canonical) |
|---|---|---|
| `en:nuts` | `nuts` | `tree_nuts` |
| `en:crustaceans` | `shellfish` | `crustaceans` |
| `en:molluscs` | (потерян) | `mollusks` |
| `en:sesame-seeds` | (потерян) | `sesame` |
| `en:celery` | (потерян) | `celery` |
| `en:mustard` | (потерян) | `mustard` |
| `en:lupin` | (потерян) | `lupin` |
| `en:sulphur-dioxide-and-sulphites` | (потерян) | `sulfites` |

**>50% обязательных по ТР ТС 022/2011 аллергенов терялось при импорте из OpenFoodFacts.**

Сценарий: пользователь с `tree_nuts` в профиле сканировал шоколад из OFF с `allergens_tags=['en:nuts']` → продукт получал `allergens=['nuts']` → fitCheck сравнивал `['tree_nuts']` vs `['nuts']` → **safe** → анафилаксия.

#### 5 источников legacy ID в коде (зачищены)

- `src/screens/OnboardingScreen.jsx` — новые пользователи выбирали `nuts`/`shellfish`
- `api/ai.js` — AI prompt просил OpenAI вернуть `["nuts","shellfish"]`
- `scripts/import-off-jsonl.cjs` — OFF JSONL import с `nuts`/`shellfish`/`molluscs`/`sulphites`
- `scripts/seed-products.js` — seed import
- `scripts/import-eandb.js` — EANDB import (двойной баг: `tree-nuts` с дефисом → `nuts`)
- `src/screens/_mock/ProductMockScreen.jsx` — mock data

#### 2 дополнительных legacy ID variants (только в скриптах)

- `'molluscs'` (OFF-форма с -s) → `'mollusks'`
- `'sulphites'` (BrE) → `'sulfites'`

### DB Migrations 019 + 019a + 020

- **019a_pre_migration_snapshot.sql** — pre-flight backup в `_backup` schema (работает на Supabase free tier без Backups feature)
- **019_normalize_legacy_allergen_ids.sql** — idempotent транзакционная миграция: `nuts`→`tree_nuts`, `shellfish`→`crustaceans`, `honey`→`customAllergens`. Финальный `RAISE EXCEPTION` если legacy IDs остались → авто-откат
- **020_normalize_extra_legacy_allergen_ids.sql** — то же для `molluscs`→`mollusks`, `sulphites`→`sulfites`, `tree-nuts`→`tree_nuts`

**Verified on production**: 0 legacy IDs across 8211 global_products, 8 cache rows, 9 user profiles.

### Unification

`src/screens/ExternalProductScreen.jsx` имел третью копию проверки аллергенов с собственными словарями (`dairyWords`, `meatWords`, `sugarWords`, упрощённый 5-слово gluten check). Удалено 87 строк, заменено на adapter вызывающий canonical `checkProductFit`. **Drift-источник убран — вся логика проверки аллергенов теперь в одном месте (`fitCheck.js`).**

## Этап 3 — Tests + CI + Health (commit 883e94e)

### tests/unit/fitCheck.test.mjs (NEW, 50 тестов)

Coverage: structured allergens, parsed ingredients, custom allergens, traces detection, diabetes/celiac/PKU, halal (5 cases включая ароматизатор/хром false-positive prevention), diet goals (vegan/dairy_free/sugar_free), verdict priority, religion array, edge cases. **+ regression tests для всех 8 audit findings (#1-#8).**

### tests/unit/normalizers.test.mjs (NEW, 25 тестов)

Coverage: все 14 ТР ТС аллергенов корректно маппятся из OFF tags, domain IDs зарегистрированы в ALLERGENS list, multiple/duplicate handling, traces используют тот же mapping, edge cases.

### .github/workflows/ci.yml (NEW)

GitHub Actions на push/PR в main: `lint → test:unit → build → verify dist artefacts`. Node 22, npm cache. Кеширование npm.

### api/health.js (NEW)

Public health endpoint для мониторинга. Reports Supabase reachability + latency, OpenAI configured, RAG configured. Returns 200 ok или 503 degraded с breakdown. `Cache-Control: no-store`. No PII.

## Verification

- 93/93 unit tests pass (было 0)
- build OK (Vite + PWA)
- lint 0 errors / 56 pre-existing warnings
- Production DB: 0 legacy IDs across all tables
- 6867 store_products active (магазин MARS) — soundness preserved
