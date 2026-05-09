---
title: Hardening Pass 2 - app_metadata RBAC + IndexedDB Migration Framework
date: 2026-04-28
tags: [security, rbac, app_metadata, indexeddb, migration_framework, critical, jwt]
related: [[auth-system]] · [[offline-resilience]]
---

# 2026-04-28: HARDENING Этап 4 — Security Pass 2 + Migration Framework

Commit `011211f`. Production migration 021 запущена пользователем.

## 🚨 Критичная security дыра (admin role escalation)

### Что было

`src/layouts/RetailLayout.jsx:95` (до фикса):

```js
const isAdmin = user.user_metadata?.role === 'admin'
```

### Почему это дыра

`user_metadata` — это **client-mutable** namespace в Supabase Auth. Любой авторизованный пользователь мог выполнить в DevTools console:

```js
await supabase.auth.updateUser({ data: { role: 'admin' } })
```

→ После refresh токена получал доступ ко **всему RetailLayout**: RetailDashboard, RetailProducts, EanRecoveryScreen, RetailSettings.

Сервер RPC `is_admin_user` (из migration 017) был **корректен** — реальные admin-операции защищены. Но **UI-гейт** в RetailLayout пускал любого псевдо-админа в админский интерфейс. В production это означало:

- Просмотр чужого магазина без RLS-блока (UI делал запросы прежде чем ловить 403)
- Видимость EanRecoveryScreen со списком missing products
- Видимость RetailSettings (чужие preferences)

### Как фиксили

**`app_metadata`** — это **server-only** namespace в Supabase Auth. Модифицируется ТОЛЬКО через `service_role` (admin API). Клиент его **видит** через JWT, но **не может изменить**. Это правильное место для RBAC флагов.

#### Migration 021_sync_admin_to_app_metadata.sql

```sql
CREATE OR REPLACE FUNCTION public.sync_admin_to_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.auth_id IS NULL THEN RETURN NEW; END IF;
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{is_admin}',
    to_jsonb(COALESCE(NEW.is_admin, false))
  )
  WHERE id = NEW.auth_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_users_admin_to_jwt
  AFTER UPDATE OF is_admin ON public.users
  FOR EACH ROW
  WHEN (NEW.is_admin IS DISTINCT FROM OLD.is_admin)
  EXECUTE FUNCTION public.sync_admin_to_app_metadata();

-- Triggers also for INSERT (when new admin user created)
-- + Backfill existing admins
-- + Verification block (RAISE EXCEPTION on mismatch)
```

**SECURITY DEFINER** обязателен — триггер пишет в `auth.users`, обычные роли не могут. `search_path = public, pg_temp` защищает от CVE-2018-1058.

#### AuthContext.jsx

```js
function extractIsAdmin(authUser) {
  return Boolean(authUser?.app_metadata?.is_admin)
}

// в AuthProvider:
const [isAdmin, setIsAdmin] = useState(false)

const syncSessionState = useCallback((nextSession) => {
  // ...existing...
  setIsAdmin(extractIsAdmin(nextSession?.user))
  setLoading(false)
}, [])

// и в context value: { ..., isAdmin, ... }
```

#### RetailLayout.jsx

```js
// БЫЛО:
const isAdmin = user.user_metadata?.role === 'admin'

// СТАЛО:
const { user, isAdmin } = useAuth()
```

### Распространение

`app_metadata` попадает в JWT. JWT обновляется:

- При login/signup
- При `supabase.auth.refreshSession()`
- Автоматически каждые ~60 минут (Supabase auto-refresh)

Это означает: после изменения `users.is_admin` пользователь увидит обновление **на следующем refresh токена** (≤60 мин) или после logout/login. Для редко-меняющегося admin-флага это приемлемо.

### Verified

```
[021] Backfilled is_admin in app_metadata for N users
[021] Verification OK: all admin flags synchronized
```

(N = количество записей с `users.is_admin = true`)

## DB Migration Framework (offlineDB.js)

### Зачем

До этого `offlineDB.js` имел `DB_VERSION = 1` с упрощённым `upgrade(db)`. При любом изменении схемы:

- Не было фреймворка для последовательных миграций
- Пользователи на старой версии БД могли остаться без upgrade-логики
- `blocked()` / `blocking()` callbacks не использовались — старые открытые вкладки могли заблокировать upgrade

### Что сделано

#### 1. DB_VERSION → 2 + явный changelog comment

```js
// v1 (initial): store_catalog, store_meta, pending_scans
// v2 (2026-04-28): pending_scans + index 'client_token' (для дедуп flush'а)
const DB_VERSION = 2
```

#### 2. Refactor `upgrade(db)` → `runMigrations(db, oldVersion, newVersion, tx)`

```js
function runMigrations(db, oldVersion, newVersion, tx) {
  if (oldVersion < 1) {
    // initial schema (бывший upgrade)
  }

  if (oldVersion < 2) {
    // tx — versionchange transaction, через неё доступ к существующему store
    const scanStore = tx.objectStore(STORE_PENDING_SCANS)
    if (!scanStore.indexNames.contains('client_token')) {
      scanStore.createIndex('client_token', 'client_token', { unique: false })
    }
  }
}
```

**Sequential `if (oldVersion < N)` blocks** — новые миграции добавляются в конец, существующие НЕ трогаются. Это позволяет миграциям накапливаться для устройств на любой старой версии.

#### 3. Lifecycle callbacks

```js
openDB(DB_NAME, DB_VERSION, {
  upgrade: runMigrations,
  blocked() {
    console.warn('[offlineDB] upgrade blocked by another open tab')
  },
  blocking() {
    if (dbPromise) {
      dbPromise.then((db) => db.close()).catch(() => {})
      dbPromise = null
    }
  },
  terminated() {
    console.warn('[offlineDB] connection terminated — will reopen')
    dbPromise = null
  },
})
```

- **blocked**: текущая вкладка ждёт пока другие закроют БД (показать toast)
- **blocking**: эта вкладка блокирует upgrade в другой вкладке → закрываем gracefully
- **terminated**: БД упала (low-disk, OS kill) → пересоздадим dbPromise при следующем call

### Применение для будущих миграций

Когда понадобится новое поле / index / store:

```js
const DB_VERSION = 3 // bump

// в runMigrations:
if (oldVersion < 3) {
  // Например, добавить новый objectStore для offline shopping list
  if (!db.objectStoreNames.contains('shopping_list')) {
    db.createObjectStore('shopping_list', { keyPath: 'id', autoIncrement: true })
  }
}

// Документировать в changelog comment в начале файла
```

## Background Sync direct API — отложен

Реальная Background Sync без открытого клиента требует:

1. Импортировать `idb` в `src/sw.js`
2. Хранить Supabase URL + anon key в SW (через `postMessage` от main thread при registration)
3. Получать `access_token` из IndexedDB Supabase auth-cache внутри SW
4. Обработать сценарий с истёкшим токеном (refresh без главной thread)

Это >1 час работы и риск зацепить production auth flow. Текущий fallback (flush на следующем открытии через `flushPendingScans` в `OfflineContext`) работает корректно для KZ retail сценариев.

**Документировано как future work.**

## Acceptance Criteria — все ✅

- 93/93 unit tests pass
- build OK (Vite + PWA, sw.js generated, 36 precache entries 15.5MiB)
- lint 0 errors / 56 pre-existing warnings
- Migration 021 verified в production (`Verification OK`)
- Старая дыра `user_metadata?.role` удалена из repo (grep подтверждает)
