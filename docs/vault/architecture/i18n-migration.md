# i18n Migration — Полная архитектура

> **Статус:** План утверждён, реализация в следующем чате.
> Связи: [[auth-system]] · [[category-system]]
> **Дата:** 2026-05-03
> **Контекст:** Текущий `src/utils/i18n.js` (~1950 строк, RU+KZ в одном файле) → профессиональная flat-JSON система

---

## Проблемы текущей системы

1. **Один файл 2000+ строк** — при 3+ языках 4000-6000 строк, невозможно ревьюить
2. **Fallback `|| 'Русский'`** — если KZ-ключ пропадёт, казах видит русский текст (БАГ)
3. **Нет pluralization** — `(n) => \`${n} тауар\`` грамматически неправильно (1 тауар, 5 тауарлар)
4. **Нет валидации ключей** — 7 дублей словили только через ESLint, missing KZ-ключи не ловятся
5. **Нет Intl форматирования** — кастом formatPrice, нет Intl.ListFormat для аллергенов
6. **Нет `<html lang>`** — screen readers ломаются, SEO страдает
7. **`t` затенение** — scanner/query/event/index тоже используют `t`
8. **Inline `lang === 'kz' ? ... : ...`** — ~160 строк в 11 экранах вместо `t('key')`

---

## Новая архитектура

### Структура файлов

```
src/
  i18n/
    index.js           ← I18nProvider + useI18n() (useCallback/useMemo)
    resolve.js         ← fallback chain: KZ → RU → key path + console.warn
    plural.js          ← Intl.PluralRules (ru: one/few/many/other, kk: one/other)
    format.js          ← Intl.NumberFormat, ListFormat, DateTimeFormat
    interpolate.js     ← {var} подстановка
    loader.js          ← JSON merge + bundled import + OTA-ready
    __tests__/
      plural.test.js
      resolve.test.js
      format.test.js
      interpolate.test.js
  locales/
    ru/
      common.json      ← кнопки, статусы, ошибки, навигация
      product.json     ← карточка товара, nutrition, severity
      retail.json      ← весь retail cabinet (dashboard, products, import, settings, ean-recovery)
      scan.json        ← сканер
      compare.json
      alternatives.json
      auth.json
      history.json
      home.json        ← лендинг, футер
      onboarding.json  ← включая arrays (diets, allergens)
      settings.json    ← профиль, privacy, notifications
  legal/
    privacy-ru.md      ← юридический контент (НЕ i18n)
    privacy-kz.md
scripts/
  migrate-i18n.mjs     ← АВТОМАТИЧЕСКАЯ миграция t.key → t('key')
  check-i18n.mjs       ← warning-level валидация KZ vs RU ключей
  extract-i18n.mjs     ← авто-поиск хардкод в JSX
```

### API

```jsx
const { t, lang, format } = useI18n()

// Простой текст
t('product.unitG')                              // 'г'

// Pluralization
t('retail.products.allLoaded', { count: 5 })    // '5 товаров загружены'

// Интерполяция
t('compare.modeBannerPinned', { name: 'Кефир' }) // 'Первый товар выбран: Кефир'

// Форматирование
format.price(1500)                               // '1 500 ₸'
format.list(['молоко', 'яйца', 'глютен'])         // 'молоко, яйца и глютен'
format.date(new Date())                           // '3 мая 2026'

// html lang — автоматически обновляется при смене языка
```

### Import path

```js
// Было:
import { useI18n, useLang, getLang } from '../utils/i18n.js'
// Стало:
import { useI18n, useLang, getLang } from '../i18n/index.js'
```

### useI18n() — стабильные ссылки

```js
export function useI18n() {
  const dict = useMemo(() => loadDict(lang), [lang])
  const t = useCallback((key, vars) => resolve(dict, key, vars), [dict])
  const format = useMemo(() => ({
    price: (n) => fmtPrice(n, lang),
    list: (arr) => fmtList(arr, lang),
    date: (d) => fmtDate(d, lang),
  }), [lang])
  return { t, lang, format }
}
```

---

## Ключевые технологии

### 1. Flat JSON — совместимость с Crowdin/Lokalise

```json
{
  "product.unitG": "г",
  "product.unitKcal": "ккал",
  "retail.products.allLoaded_one": "{count} товар загружен",
  "retail.products.allLoaded_few": "{count} товара загружены",
  "retail.products.allLoaded_many": "{count} товаров загружены",
  "retail.products.allLoaded_other": "{count} товаров загружены"
}
```

**НЕ nested объект** — flat key-value. `t('product.unitG')` ищет по ключу напрямую.

### 2. Pluralization — Intl.PluralRules

```js
// plural.js
const rules = {
  ru: new Intl.PluralRules('ru'),
  kk: new Intl.PluralRules('kk'),
}
// RU: 1→'one', 2-4→'few', 5-20→'many', 21→'many' но 22→'few'
// KZ: 1→'one', 2+→'other'

export function selectPluralSuffix(lang, n) {
  const rule = lang === 'kz' ? rules.kk : rules.ru
  return rule.select(n) // 'one' | 'few' | 'many' | 'other'
}
```

```json
// KZ проще — only one/other:
"retail.products.allLoaded_one": "{count} тауар жүктелді",
"retail.products.allLoaded_other": "{count} тауарлар жүктелді"
```

### 3. Fallback chain — профессионально

```js
function resolve(dict, key, vars, fallbackDict) {
  let val = dict[key]
  if (val == null || val === '') {
    val = fallbackDict?.[key]  // KZ missing → RU fallback
    if (val != null) {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] missing "${key}" for lang="${currentLang}", using RU fallback`)
        showMissingDot(key)  // жёлтая точка рядом с текстом в dev-mode
      }
    } else {
      if (import.meta.env.DEV) {
        console.error(`[i18n] missing "${key}" in BOTH languages`)
      }
      return key  // возвращаем путь ключа, НЕ русский текст
    }
  }
  // Plural resolution
  if (vars?.count != null) {
    const suffix = selectPluralSuffix(currentLang, vars.count)
    const pluralKey = `${key}_${suffix}`
    const pluralVal = dict[pluralKey] ?? fallbackDict?.[pluralKey]
    if (pluralVal != null) val = pluralVal
  }
  // Interpolation
  if (vars && typeof val === 'string') {
    val = interpolate(val, vars)
  }
  return val
}
```

### 4. Intl форматирование

```js
// format.js
export function fmtPrice(amount, lang) {
  return new Intl.NumberFormat(lang === 'kz' ? 'kk-KZ' : 'ru-RU', {
    style: 'currency',
    currency: 'KZT',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function fmtList(items, lang) {
  return new Intl.ListFormat(lang === 'kz' ? 'kk-KZ' : 'ru-RU', {
    style: 'long', type: 'conjunction',
  }).format(items)
}

export function fmtDate(date, lang) {
  return new Intl.DateTimeFormat(lang === 'kz' ? 'kk-KZ' : 'ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(date)
}
```

### 5. <html lang> автообновление

```js
// В I18nProvider или при setLang:
document.documentElement.lang = lang === 'kz' ? 'kk' : 'ru'
document.documentElement.dir = 'ltr'
```

### 6. Interpolation — простой template engine

```js
// interpolate.js
export function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}
```

---

## Миграционный скрипт — критические edge cases

### `t` затенение — САМАЯ БОЛЬШАЯ ДЫРА

`t` используется НЕ только для i18n:

| Паттерн | Что это | Действие |
|---------|---------|----------|
| `t.stop()` | html5-qrcode scanner | ПРОПУСТИТЬ |
| `t.querySelector(...)` | DOM element | ПРОПУСТИТЬ |
| `t.getBoundingClientRect()` | DOM element | ПРОПУСТИТЬ |
| `t.setQueryData(...)` | React Query client | ПРОПУСТИТЬ |
| `t.invalidateQueries(...)` | React Query client | ПРОПУСТИТЬ |
| `t.target.files` | Event target | ПРОПУСТИТЬ |
| `t.target.value` | Event target | ПРОПУСТИТЬ |
| `t.value` | input element | ПРОПУСТИТЬ |
| `t.id` | product/row объект | ПРОПУСТИТЬ |
| `t.ean` | product объект | ПРОПУСТИТЬ |
| `t.name` | product объект | ПРОПУСТИТЬ |
| `t.brand` | product объект | ПРОПУСТИТЬ |
| `t.trim()` | string | ПРОПУСТИТЬ |
| `t.entries(...)` | Object.entries alias | ПРОПУСТИТЬ |
| `t.keys(...)` | Object.keys alias | ПРОПУСТИТЬ |
| `t.values(...)` | Object.values alias | ПРОПУСТИТЬ |
| `t.retail.products` | i18n | МИГРАЦИЯ |
| `t.product.unitG` | i18n | МИГРАЦИЯ |
| `t.scan.title` | i18n | МИГРАЦИЯ |

**Эвристика скрипта:**
1. Найти `const t = useI18n()` — это i18n scope
2. Внутри этого scope — `t.xxx` → проверить против списка i18n-ключей
3. Если `t.xxx` совпадает с i18n-ключом → `t('xxx')`
4. Если нет → flag для manual review
5. За пределами i18n scope — НЕ трогать

### Замены паттернов

| Было | Стало | Авто? |
|------|-------|-------|
| `t.product.unitG` | `t('product.unitG')` | ✅ |
| `t.compare?.modeBanner` | `t('compare.modeBanner')` | ✅ (убрать `?`) |
| `t.key \|\| 'Русский'` | `t('key')` | ✅ (убрать fallback) |
| `(n) => \`Все ${n} товаров\`` | `t('retail.products.allLoaded', { count: n })` | ⚠️ Manual — нужна plural-группа |
| `lang === 'kz' ? 'X' : 'Y'` | `t('key')` | ⚠️ Manual — нужно добавить ключ |
| `t.langShort === 'Қаз'` | `lang === 'kz'` | ✅ (1 место: CompareScreen:287) |

---

## Экраны с хардкодом — полный список

### Уже мигрированы на `t.*` (нужна только t.key → t('key') замена):
- ProductScreen.jsx — ~30 вызовов
- EanRecoveryScreen.jsx — ~22 вызова
- CompareScreen.jsx — ~30 вызовов
- ScanScreen.jsx — ~15 вызовов
- AlternativesScreen.jsx — ~7 вызовов
- CatalogScreen.jsx — ~40 вызовов
- AIScreen.jsx — ~15 вызовов
- AIAssistantScreen.jsx — ~5 вызовов
- ExternalProductScreen.jsx — ~25 вызовов
- UnifiedProductScreen.jsx — ~35 вызовов
- ProfileScreen.jsx — ~25 вызовов
- ProfileEditScreen.jsx — ~15 вызовов
- PrivacySettingsScreen.jsx — ~15 вызовов
- NotificationSettingsScreen.jsx — ~25 вызовов
- OnboardingScreen.jsx — ~10 вызовов
- QRPrintScreen.jsx — ~5 вызовов
- LandingScreen.jsx — ~5 вызовов
- HomeScreen.jsx — ~10 вызовов (i18n-часть)
- AccountScreen.jsx — ~15 вызовов
- PrivacyPolicyScreen.jsx — 1 вызов (`t.profile.policy`)
- RetailDashboardScreen.jsx — 1 вызов

### Нужна миграция с inline → `t('key')`:
- AuthScreen.jsx — ~15 `lang === 'kz'` тернари + inline error map
- HistoryScreen.jsx — ~7 `lang === 'kz'` тернари
- HomeScreen.jsx — ~6 `lang === 'kz'` тернари + HTML-сегменты
- RetailSettingsScreen.jsx — ~30 `isKz ? ... : ...` тернари
- StorePublicScreen.jsx — ~8 `isKz ? ... : ...`
- SetupProfileScreen.jsx — ~3 `lang === 'kz'`
- RetailDashboardScreen.jsx — ~5 хардкод fallback строк
- RetailEntryScreen.jsx — ~3 хардкод строки
- RetailProductsScreen.jsx — ~1 placeholder хардкод
- QRPrintScreen.jsx — ~1 fallback `'Магазин 1'`
- PrivacyPolicyScreen.jsx — 60+ строк юридического текста → `src/legal/` markdown
- OnboardingScreen.jsx — ~20 строк данных (diets/allergens) → JSON arrays

### Затенение `t` — файлы где `t` НЕ i18n:
- ScanScreen.jsx — `t = useRef()` scanner object
- RetailProductsScreen.jsx — `t = useQueryClient()` React Query
- RetailImportScreen.jsx — `t` как event target и import state
- RetailSettingsScreen.jsx — `t` как event target
- SetupProfileScreen.jsx — `t` как event target
- ProfileEditScreen.jsx — `t` как event target

**В этих файлах i18n-переменная может быть переименована в `i18n` если конфликт:**
```jsx
const { t: i18n } = useI18n()
```

---

## Plural-группы — полный список

Текущие `(n) => ...` функции которые нужно заменить:

| Ключ | RU (one/few/many/other) | KZ (one/other) |
|------|------------------------|----------------|
| `retail.products.allLoaded` | 1 товар / 2 товара / 5 товаров / 22 товара | 1 тауар / 5 тауарлар |
| `retail.products.countLabel` | 1 тауар / 2 тауара / 5 тауаров | (аналогично KZ) |
| `catalog.productsCount` | аналогично | аналогично |

**Остальные** `(n) => ...` — это простая интерполяция без plural (например `t.retail.products.countLabel(n)` → `t('retail.products.countLabel', { count: n })`).

---

## Build-time валидатор — check-i18n.mjs

```
$ node scripts/check-i18n.mjs

╔════════════════════════════════════════════════╗
║  i18n Validation Report                         ║
╠════════════════════════════════════════════════╣
║  RU keys: 342    KZ keys: 331                  ║
║  Missing in KZ: 11                             ║
║  Extra in KZ: 0                                ║
║  Plural incomplete: 2                          ║
╠════════════════════════════════════════════════╣
║  MISSING IN KZ:                                ║
║    retail.products.allHaveBarcode              ║
║    scan.comparePinned                          ║
║  PLURAL INCOMPLETE:                            ║
║    retail.products.allLoaded (KZ: no _other)   ║
╚════════════════════════════════════════════════╝
⚠  13 issues found (build continues — warning only)
```

---

## План реализации — пошагово

| # | Шаг | Время | Зависимости |
|---|-----|-------|-------------|
| 1 | Создать `src/i18n/` модули (6 файлов) + useCallback/useMemo | 1.5 часа | Нет |
| 2 | Выгрузить RU → `locales/ru/*.json` (12 файлов) | 30 мин | Шаг 1 |
| 3 | Выгрузить KZ → `locales/kz/*.json` | 20 мин | Шаг 1 |
| 4 | Написать `scripts/migrate-i18n.mjs` | 30 мин | Шаг 1-3 |
| 5 | Запуск миграции: `t.key` → `t('key')`, убрать `?` и `|| fallback` | 30 мин | Шаг 4 |
| 6 | Ручной ревью non-auto паттернов (затенение `t`, HTML-сегменты) | 30 мин | Шаг 5 |
| 7 | Plural: заменить `(n) => ...` на `t('key', { count: n })` | 30 мин | Шаг 5 |
| 8 | Миграция inline `lang === 'kz' ? ... : ...` → `t('key')` (11 экранов) | 1 час | Шаг 5 |
| 9 | `formatPrice` → `Intl.NumberFormat`, `formatList` → `Intl.ListFormat` | 30 мин | Шаг 1 |
| 10 | `<html lang>` автообновление | 10 мин | Шаг 1 |
| 11 | Unit-тесты (4 файла) | 30 мин | Шаг 1 |
| 12 | `check-i18n.mjs` + `extract-i18n.mjs` | 30 мин | Шаг 2-3 |
| 13 | Dev-mode: console.warn + missing dot | 15 мин | Шаг 1 |
| 14 | PrivacyPolicyScreen → `src/legal/` markdown | 20 мин | Нет |
| 15 | Удалить старый `src/utils/i18n.js` | 5 мин | Шаг 5-8 |
| 16 | Обновить все import paths | 15 мин | Шаг 15 |
| 17 | Build + Playwright верификация RU+KZ | 30 мин | Всё |

**Итого ~7 часов**

---

## 15 дыр — все закрыты

1. `t.key` не работает с plural → нужен `t('key')` ✅
2. Нет fallback chain (KZ→RU→key path) ✅
3. Нет Intl форматирования ✅
4. Нет `<html lang>` ✅
5. Namespace merging не продуман → flat JSON, merge не нужен ✅
6. Нет unit-тестов ✅
7. HTML в переводах → сегментирование ✅
8. `t` нестабильная ссылка → useCallback/useMemo ✅
9. Optional chaining + fallback → миграционный скрипт убирает ✅
10. Inline-данные (OnboardingScreen arrays) → JSON arrays ✅
11. Нет скрипта автоматической миграции → migrate-i18n.mjs ✅
12. PrivacyPolicyScreen → src/legal/ markdown ✅
13. `t.langShort` → заменить на `lang` из useI18n() ✅
14. Нет верификации → check-i18n.mjs + Playwright ✅
15. `t` затенение (scanner/query/event) → эвристика в скрипте + `t: i18n` rename при конфликте ✅

---

## Future-proof

- 3-й язык: добавить `locales/en/` — 0 рефакторинга
- RTL: использовать `margin-inline-start` в новом коде
- OTA: loader.js → fetch JSON из Supabase + IndexedDB cache, bundled как fallback
- Crowdin/Lokalise: flat JSON напрямую совместим
