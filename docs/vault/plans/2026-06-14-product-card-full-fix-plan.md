# План: Профессиональная доработка карточки товара

**Дата:** 2026-06-14
**Статус:** In Progress
**Скоуп:** ProductScreen, ProductCompositionScreen, система ингредиентов, список покупок, цвета
**Создан по:** голосовой аудит владельца + codebase exploration

---

## Общая картина

### Затрагиваемые слои приложения

```
UI:           ProductScreen (+CSS), ProductCompositionScreen (+CSS),
              IngredientsPreview (+CSS), IngredientInfoSheet (+CSS)
Domain:       ingredientAnalysis.js, allergenSynonyms.js
Data:         ingredientDescriptions.js (новый), i18n (RU+KZ product.json)
Context:      UserDataContext.jsx (shopping list)
CSS vars:     index.css (новый токен --additive)
Тесты:        npm run build, lint, check-i18n, ручное тестирование
```

### Сводка принятых решений

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Выделение слов в составе | Искать как префикс целого слова (word boundary + startsWith) |
| 2 | Обрезанный состав на карточке | Затемнение + текст → клик → экран состава |
| 3 | Кнопка «Разобрать» | Убрать, только клик по карточке состава |
| 4 | Кнопка справки в шапке состава | Убрать |
| 5 | Секции legend/summary на экране состава | Свёрнуты по умолчанию, раскрываются по клику |
| 6 | Цвет additive (янтарный) | Золотисто-янтарный `#f59e0b`, отдельный CSS-токен |
| 7 | Описания ингредиентов | Локальный словарь на 100-150 ингредиентов (`ingredientDescriptions.js`) |
| 8 | Bottom sheet ингредиента | Fix bottom sheet + «Спросить ИИ» + «Поиск в Google» |
| 9 | Новые ингредиенты для разбора | AI-agent составляет список, owner подтверждает |
| 10 | Список покупок | Починить кнопку + анимация + переименовать favourite→shoppingList |
| 11 | Fallback ingredientsKz | Если пуст — использовать `ingredients` |

---

## Этап 1: Список покупок (Shopping List Fix)

**Приоритет:** High | **Сложность:** Low | **Зависимости:** Нет | **Риск:** Low

### Проблемы

1. **Кнопка молча не работает.** В `UserDataContext.jsx` функция `toggleFavorite` делает `if (!internalUserId) return` — если `internalUserId` undefined (асинхронная загрузка auth), нажатие игнорируется без фидбека. При этом `handleToggleFavorite` в ProductScreen проверяет только `!user`, что не покрывает этот кейс.

2. **Race condition.** `toggleFavorite` использует `favoriteEans` из замыкания (строка 158: `[internalUserId, favoriteEans]`). При быстром двойном клике `favoriteEans` в замыкании может быть устаревшим → неправильное поведение оптимистичного обновления.

3. **Нет анимации/фидбека.** Кнопка меняет только `fontVariationSettings: "'FILL' 1"/"'FILL' 0"` — мгновенно, без транзишена. Нет визуального подтверждения действия.

4. **Устаревшее именование.** Везде используется `favorite`, `favoriteEans`, `isFavorite` — хотя функциональность уже переименована в «Список покупок» (иконка `checklist`).

### Что делаем

#### 1A. Переименовать favourite → shoppingList во всём контексте

Файл: `src/contexts/UserDataContext.jsx`
- `favoriteEans` → `shoppingEans`
- `checkIsFavorite` → `checkIsInShoppingList`
- `toggleFavorite` → `toggleShoppingItem`
- `favoritesCount` → `shoppingListCount`

Файл: `src/screens/ProductScreen.jsx`
- `isFavorite` → `isInShoppingList`
- `handleToggleFavorite` → `handleToggleShoppingItem`
- Обновить переменные в JSX (строка 436, 448)

Все остальные потребители `useUserData()` в проекте — проверить grep-ом и обновить.

#### 1B. Починить молчаливый отказ

В `UserDataContext.jsx`, `toggleShoppingItem` (бывший `toggleFavorite`, строка 103):
```js
// Было:
if (!internalUserId) return

// Стало: бросаем ошибку или возвращаем статус, ProductScreen обрабатывает
if (!internalUserId) return false
```

В `ProductScreen.jsx`, `handleToggleShoppingItem` (бывший `handleToggleFavorite`, строка 161):
- Проверять не только `!user`, но и результат `toggleShoppingItem`
- Если `internalUserId` undefined — показывать сообщение об ошибке через тост или редирект

#### 1C. Убрать race condition

В `UserDataContext.jsx`, `toggleShoppingItem`:
- Убрать `favoriteEans` из списка зависимостей `useCallback`
- Внутри использовать функциональный апдейт: `setShoppingEans(prev => ...)` — не читать `favoriteEans` напрямую, а получать через колбэк

```js
// Было:
}, [internalUserId, favoriteEans])

// Стало:
}, [internalUserId])
// И внутри: setShoppingEans((prev) => { const isFav = prev.has(ean); ... })
```

#### 1D. Анимация нажатия

CSS-транзишен на иконке `checklist`:
```css
.product-header__shopping-btn .material-symbols-outlined {
  transition: transform 0.2s ease, color 0.2s ease;
}
.product-header__shopping-btn:active .material-symbols-outlined {
  transform: scale(1.25);
}
```

Добавить короткий класс `shopping-list-added` через `setTimeout` для микро-анимации подтверждения:
```css
.product-header__shopping-btn--added .material-symbols-outlined {
  color: var(--accent-sky);
  animation: shoppingPop 0.35s ease;
}
@keyframes shoppingPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
```

#### 1E. i18n

Новые ключи в `src/locales/ru/product.json`:
```json
"product.shoppingList.added": "Добавлено в список покупок",
"product.shoppingList.removed": "Удалено из списка покупок",
"product.shoppingList.error": "Не удалось обновить список покупок"
```

Аналогично в `src/locales/kz/product.json`.

### Файлы

| Файл | Что меняется |
|------|-------------|
| `src/contexts/UserDataContext.jsx` | Переименование, fix race condition, fix молчаливый отказ |
| `src/screens/ProductScreen.jsx` | Переименование, анимация, обработка ошибок |
| `src/locales/ru/product.json` | 3 новых ключа |
| `src/locales/kz/product.json` | 3 новых ключа |
| Все файлы-потребители `useUserData` | Обновить импорты (grep + замена) |

### Проверка
- Нажать на кнопку списка покупок — иконка меняет состояние, анимация видна
- Без авторизации — редирект на `/auth`
- С авторизацией — работает, нет молчаливого отказа
- Двойной клик — не вызывает двойной upsert/delete
- Кнопка на HomeScreen (favorites tab) — не сломана

---

## Этап 2: Обрезка состава и навигация (Clamping + Clickable Card)

**Приоритет:** High | **Сложность:** Medium | **Зависимости:** Нет | **Риск:** Low

### Проблемы

1. Состав обрезается через `-webkit-line-clamp: 4` (IngredientsPreview.css:67-73) — чисто техническая обрезка, без визуального намёка
2. Нет подсказки что состав можно развернуть
3. Кнопка «Разобрать» (`ingredients-preview__open`) — отдельный элемент, неинтуитивный. Пользователь ожидает нажать на текст состава
4. Карточка состава не кликабельна целиком

### Что делаем

#### 2A. Градиентное затемнение

Заменить `-webkit-line-clamp` на кастомное решение:

```css
.ingredients-preview__text--clamped {
  max-height: 5.6em;           /* ~4 строки при line-height 1.4 */
  overflow: hidden;
  position: relative;
}

.ingredients-preview__text--clamped::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 44px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    color-mix(in srgb, var(--glass-subtle) 88%, var(--bg-surface) 12%) 100%
  );
  pointer-events: none;
}
```

#### 2B. Текст-подсказка

Добавить в `IngredientsPreview` при `variant="compact"`:

```jsx
<div className="ingredients-preview__expand-hint">
  <span className="material-symbols-outlined">expand_more</span>
  {t('product.ingredients.tapToExpand')}
</div>
```

Стили:
```css
.ingredients-preview__expand-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 0 4px;
  color: var(--text-faint);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
```

#### 2C. Кликабельность всей карточки

В `IngredientsPreview.jsx`:
- Корневой `<section>` обернуть или сделать кликабельным
- При `variant="compact"` + наличие `onOpenFull`: `onClick` → `onOpenFull()`
- Добавить `cursor: pointer` + `:hover` эффект (лёгкое осветление background)
- `role="button"` + `tabIndex={0}` для accessibility

#### 2D. Убрать кнопку «Разобрать»

Удалить из `IngredientsPreview.jsx` (стр. 77-84):
```jsx
// УДАЛИТЬ этот блок:
{!isFull && (
  <button type="button" className="ingredients-preview__open" onClick={onOpenFull}>
    {t('product.ingredients.openFull')}
    ...
  </button>
)}
```

Удалить CSS: `.ingredients-preview__open` (IngredientsPreview.css:41-59).

#### 2E. i18n

Новый ключ:
```json
"product.ingredients.tapToExpand": "Нажмите, чтобы посмотреть полностью"
// KZ: "Толық көру үшін басыңыз"
```

Удалить (больше не используется):
```json
"product.ingredients.openFull": "Разобрать"
```

### Файлы

| Файл | Что меняется |
|------|-------------|
| `src/components/product/IngredientsPreview.jsx` | Удаление кнопки, кликабельность, hint |
| `src/components/product/IngredientsPreview.css` | Гредент, hint-стили, cursor, hover |
| `src/screens/ProductScreen.jsx` | Без изменений (onOpenFull уже передаётся) |
| `src/locales/ru/product.json` | +tapToExpand, -openFull |
| `src/locales/kz/product.json` | +tapToExpand, -openFull |

### Примечания
- `onOpenFull` уже существует и настроен на `buildProductCompositionPath` — менять не надо
- На экране состава (`variant="full"`) гредент и hint НЕ применяются — состав виден полностью
- `ProductCompositionScreen` не затрагивается этим этапом

---

## Этап 3: Поиск целых слов (Word Boundary Fix)

**Приоритет:** Critical | **Сложность:** High | **Зависимости:** Этап 6 зависит от этого | **Риск:** Medium

### Проблемы

1. **`findTermRanges`** (ingredientAnalysis.js:165-179) ищет подстроки через `indexOf()`. Это создаёт:
   - `'молок'` → ловит 5 букв в слове `'молоко'` (баг: выделено не всё слово)
   - `'стабилизатор'` → ловит 11 букв в `'стабилизаторы'` (буква "ы" отваливается)
   - Аналогичные баги во всех случаях где синоним-корень короче целого слова

2. **Многие синонимы — корни слов** (например `'молочн'`, `'яичн'`, `'пшенич'`). Они намеренно неполные чтобы ловить склонения. Word boundary подход должен это учитывать.

3. **Многословные синонимы** (`'сухое молоко'`, `'молочный жир'`) должны продолжать работать как точные подстроки с границами слов.

### Что делаем

#### 3A. Новая логика `findTermRanges`

**Алгоритм:**
1. Текст разбивается на "слова" — токены, разделённые пробелами, запятыми, точками с запятой, скобками, точками, двоеточиями
2. Для каждого синонима:
   - **Однословный синоним:** проверяется КАЖДЫЙ токен текста. Если токен начинается с синонима (префикс) — выделяется ВЕСЬ токен. Это решает проблему: `'молочн'` матчит "молочный", "молочная", "молочное"; `'яйц'` матчит "яйца", "яйцо"; а `'молок'` НЕ матчит "молоко" (потому что нужен суффикс "о", а не префикс).
   - **Многословный синоним** (содержит пробел): ищется как точная подстрока, НО с проверкой что слева и справа границы слов (пробел, запятая, скобка, начало/конец строки).

**Пример работы:**

Текст: `"молоко сухое цельное, стабилизаторы (E440, E471), молочная кислота"`

| Синоним | Тип | Результат |
|---------|-----|-----------|
| `'молочн'` | префикс | Матчит "молочная" (весь токен) ✅ |
| `'сухое молоко'` | многословный | Матчит "сухое молоко" (точная фраза) — но не сработает т.к. в тексте "молоко сухое" |
| `'стабилизатор'` | префикс | Матчит "стабилизаторы" (весь токен) ✅ |
| `'E440'` | E-код | Матчит "E440" ✅ |

#### 3B. Ревизия `ALLERGEN_SYNONYMS`

Для каждого из 14 аллергенов проверить синонимы на совместимость с префиксным поиском:

**Milk (молоко):**
- ❌ `'молок'` — удалить (ловит 5 букв в "молоко")
- ✅ `'молочн'` — оставить (префикс для "молочный", "молочная")
- ➕ Добавить `'молоко'`, `'молока'` как точные слова
- ✅ `'сливк'` — префикс для "сливки", "сливках"
- ✅ `'сыр'` — точное совпадение
- Проверить все 47 синонимов milk на совместимость

**Gluten (глютен):**
- ❌ `'хлопь'` — удалить (префикс "хлопья" — редкий случай)
- ➕ Добавить `'хлопья'` как точное слово
- ❌ `'отруб'` — может зацепить "отрубить"? Но в составах — "отруби", "отрубей". Оставить как префикс.
- Проверить все 51 синоним gluten

**Fish (рыба):**
- ✅ `'рыбн'` — префикс для "рыбный", "рыбная"
- ✅ `'рыба'` — точное слово
- ❌ `'икр'` — удалить (в комментарии написано: ловит "микрокристаллическая") — оставить текущий набор без `'икр'`
- Проверить все синонимы fish

**Все остальные 11 аллергенов** — аналогичная ревизия.

**Правило ревизии:**
- Если синоним — корень (без окончания) И в русском языке этот корень НИКОГДА не является частью другого слова → оставить как префикс
- Если синоним может зацепить лишнее → заменить на полные словоформы
- Пример опасного корня: `'молок'` — есть в "молоко", "молока", "молоком"
- Пример безопасного корня: `'арахис'` — нет других слов с таким началом в продуктовых составах

#### 3C. Ревизия `ADDITIVE_PATTERNS`

Проверить каждый паттерн:
- `'стабилизатор'` — префикс для "стабилизаторы", "стабилизатора" ✅
- `'эмульгатор'` — аналогично ✅
- `'консервант'` — аналогично ✅
- `'краситель'` — аналогично ✅
- `'подсластитель'` — аналогично ✅

Все однословные русские паттерны в этом списке — это корни, которые СЛУЧАЙНО работают как префиксы для своих склонений. После перехода на word boundary они продолжат работать корректно.

### Файлы

| Файл | Что меняется |
|------|-------------|
| `src/domain/product/ingredientAnalysis.js` | Новая `findTermRanges` с word boundary |
| `src/constants/allergenSynonyms.js` | Ревизия всех синонимов под префиксный поиск |

### Примечания
- Это **наиболее рискованный этап** — меняет фундаментальную логику парсинга состава
- Необходимо тестирование на реальных составах из БД после внедрения
- `buildTokens` (стр. 358-374) не требует изменений — он работает с уже отфильтрованными ranges
- E-коды обрабатываются отдельно (`buildECodeCandidates`) — их regex и так ловит целые коды

---

## Этап 4: Система цветов (Additive разделение + Light Theme Fix)

**Приоритет:** High | **Сложность:** Low | **Зависимости:** Этапы 5,6,7 используют цвета | **Риск:** Low

### Проблемы

1. **`warning` и `additive` используют один токен `--warning`:**
   - Тёмная тема: оба `#d97706`
   - Светлая тема: оба `#b45309`
   - Легенда говорит "Оранжевый" и "Янтарный" как про разные цвета — но они одинаковые всегда

2. **Светлая тема: оранжевые цвета выглядят коричневыми:**
   - `--warning: #b45309` — тёмно-коричневый, не оранжевый
   - Нужен более яркий оранжевый для светлой темы

3. **`CollapsibleFitCheck.jsx` имеет хардкод цветов:**
   - `warning: { color: '#F97316' }` — не использует CSS-переменные, отличается от `--warning: #d97706`
   - То же для danger, caution, safe

### Что делаем

#### 4A. Новый CSS-токен `--additive`

В `src/index.css`, секция `:root` (тёмная тема):
```css
--additive: #f59e0b;               /* золотисто-янтарный */
--additive-dim: rgba(245, 158, 11, 0.12);
--additive-border: rgba(245, 158, 11, 0.22);
```

Секция `:root[data-theme='light']` (светлая тема):
```css
--additive: #d97706;               /* насыщенный янтарный */
--additive-dim: rgba(217, 119, 6, 0.1);
--additive-border: rgba(217, 119, 6, 0.2);
```

#### 4B. Исправить `--warning` в светлой теме

```css
/* Было: */
--warning: #b45309;                /* тёмно-коричневый — НЕ ОРАНЖЕВЫЙ */

/* Стало: */
--warning: #ea580c;                /* ярко-оранжевый, видный на светлом фоне */
```

В тёмной теме `--warning` тоже обновить для согласованности:
```css
/* Было: */
--warning: #d97706;

/* Стало: */
--warning: #f97316;                /* ярко-оранжевый, как в FitCheck */
```

#### 4C. Применить токены во всех компонентах

**IngredientsPreview.css:**
```css
/* Было: */
.ingredients-preview__token--warning,
.ingredients-preview__token--additive { color: var(--warning); }

/* Стало: */
.ingredients-preview__token--warning { color: var(--warning); }
.ingredients-preview__token--additive { color: var(--additive); }
```
То же для `.ingredients-preview__card--warning` и `--additive`.

**IngredientInfoSheet.css:**
```css
/* Было: */
.ingredient-sheet__panel--warning,
.ingredient-sheet__panel--additive { color: var(--warning); }

/* Стало: */
.ingredient-sheet__panel--warning { color: var(--warning); }
.ingredient-sheet__panel--additive { color: var(--additive); }
```

**ProductCompositionScreen.css:**
```css
/* Было: */
.product-composition-legend__item.warning,
.product-composition-legend__item.additive { color: var(--warning); }

/* Стало: */
.product-composition-legend__item.warning { color: var(--warning); }
.product-composition-legend__item.additive { color: var(--additive); }
```

**CollapsibleFitCheck.jsx:**
Заменить `SEVERITY_STYLES` с хардкода на CSS-переменные:
```js
// Было:
const SEVERITY_STYLES = {
  danger: { color: '#EF4444', ... },
  warning: { color: '#F97316', ... },
  ...
}

// Стало: использовать CSS custom properties через inline style
// Либо оставить объект но синхронизировать значения с CSS-переменными
```

Рекомендация: оставить `SEVERITY_STYLES` для цветов (они используются в inline-стилях), но синхронизировать hex-значения с CSS-переменными. Либо переписать компонент на классы.

#### 4D. Обновить легенду в i18n

RU:
```json
"product.ingredients.legend.warning": "Оранжевый — возможный риск: следы аллергена или компонент, который лучше проверить по упаковке.",
"product.ingredients.legend.additive": "Золотистый — технологическая добавка, E-код, ароматизатор, стабилизатор или эмульгатор."
```

KZ:
```json
"product.ingredients.legend.warning": "Қызғылт сары — ықтимал қауіп: аллерген ізі немесе қаптамадан тексерілетін компонент.",
"product.ingredients.legend.additive": "Алтын сары — технологиялық қоспа, E-код, хош иістендіргіш, тұрақтандырғыш немесе эмульгатор."
```

### Визуальный результат (целевые значения)

| Tone | Тёмная тема | Светлая тема | Роль |
|------|-------------|-------------|------|
| **Danger** | `--error-bright: #f87171` | `--error-bright: #dc2626` | Аллерген в составе |
| **Warning** | `--warning: #f97316` | `--warning: #ea580c` | Следы / риск |
| **Additive** | `--additive: #f59e0b` | `--additive: #d97706` | Тех. добавка |
| **Info** | `--primary-bright: #a78bfa` | `--primary-bright: #5f46e8` | Инфо |

### Файлы

| Файл | Что меняется |
|------|-------------|
| `src/index.css` | +`--additive` токены, обновление `--warning` |
| `src/components/product/IngredientsPreview.css` | Разделить warning/additive цвета |
| `src/components/product/IngredientInfoSheet.css` | Разделить warning/additive цвета |
| `src/screens/ProductCompositionScreen.css` | Разделить warning/additive в легенде |
| `src/components/product/CollapsibleFitCheck.jsx` | Синхронизировать цвета с переменными |
| `src/locales/ru/product.json` | Обновить легенду (оранжевый → золотистый) |
| `src/locales/kz/product.json` | Обновить легенду |

---

## Этап 5: Экран состава (ProductCompositionScreen Redesign)

**Приоритет:** Medium | **Сложность:** Medium | **Зависимости:** Этап 4 (цвета) | **Риск:** Low

### Проблемы

1. **Кнопка справки в шапке** (стр. 90-98) — не работает, висит мёртвым грузом. Занимает место в 3-колоночном гриде.
2. **Секция «Разбор состава» (summary)** — всегда открыта, занимает ~100px даже если пользователю не нужна.
3. **Секция «Что значат цвета» (legend)** — всегда открыта, занимает ~200px.
4. Вместе эти секции отодвигают собственно состав далеко вниз.

### Что делаем

#### 5A. Убрать кнопку справки

Удалить из `ProductCompositionScreen.jsx` (стр. 90-98):
```jsx
// УДАЛИТЬ:
<button type="button" className="product-composition-header__info" ...>
  <span className="material-symbols-outlined">info</span>
</button>
```

Удалить CSS: `.product-composition-header__info` (стр. 23-39, только info-часть).

#### 5B. Перестроить хедер

С 3-колоночного на 2-колоночный:
```css
/* Было: */
.product-composition-header {
  grid-template-columns: 40px minmax(0, 1fr) 40px;
}

/* Стало: */
.product-composition-header {
  grid-template-columns: 40px minmax(0, 1fr);
}
```

#### 5C. Сворачиваемые секции

Использовать паттерн из `CollapsibleFitCheck.jsx` или простой `useState`:

```jsx
function CollapsibleSection({ icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="collapsible-section">
      <button
        type="button"
        className="collapsible-section__trigger"
        onClick={() => setOpen(x => !x)}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined">{icon}</span>
        <span className="collapsible-section__title">{title}</span>
        <span className={`material-symbols-outlined collapsible-section__chevron ${open ? 'open' : ''}`}>
          expand_more
        </span>
      </button>
      {open && <div className="collapsible-section__body">{children}</div>}
    </section>
  )
}
```

Применить к:
- **Summary** (разбор состава): `icon="fact_check"`, `defaultOpen={false}`
- **Legend** (что значат цвета): `icon="palette"`, `defaultOpen={false}`

#### 5D. CSS для сворачиваемых секций

```css
.collapsible-section {
  border: 1px solid ...;
  border-radius: 20px;
  background: ...;
  overflow: hidden;
}

.collapsible-section__trigger {
  width: 100%;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 24px;
  gap: 12px;
  align-items: center;
  padding: 15px;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  text-align: left;
}

.collapsible-section__chevron {
  transition: transform 0.25s ease;
  font-size: 20px;
  color: var(--text-dim);
}
.collapsible-section__chevron.open {
  transform: rotate(180deg);
}

.collapsible-section__body {
  padding: 0 15px 15px;
  animation: collapsibleFadeIn 0.2s ease;
}

@keyframes collapsibleFadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Файлы

| Файл | Что меняется |
|------|-------------|
| `src/screens/ProductCompositionScreen.jsx` | Удаление info-кнопки, CollapsibleSection |
| `src/screens/ProductCompositionScreen.css` | Хедер 2-колонки, collapsible-стили |

### Примечания
- i18n не требует изменений — все тексты уже есть
- Состояние свёрнутости не сохраняется между сессиями (не нужно для V1)
- Анимация раскрытия — лёгкая, не мешает UX

---

## Этап 6: Новые ингредиенты + локальный словарь описаний

**Приоритет:** Critical | **Сложность:** High | **Зависимости:** Этап 3 (word boundary) | **Риск:** Medium

### Проблемы

1. **Пропущены десятки ингредиентов:** пектин, цитрат кальция, бета-каротин, аскорбиновая кислота, камеди, фосфаты, подсластители нового поколения и многие другие не подсвечиваются и не объясняются.
2. **Описания шаблонные:** вместо объяснения "что такое сухое молоко" пользователь видит "сухое молоко есть в ваших ограничениях" — это бесполезно.
3. **`ingredientsKz` без fallback:** если казахский состав пуст, `analyzeProductIngredients` возвращает пустой результат (молчаливый failure).

### Что делаем

#### 6A. Расширить ADDITIVE_PATTERNS (~40 новых)

Добавить в `ingredientAnalysis.js`:

```
Технологические добавки:
  пектин, цитрат кальция, цитрат натрия, бета-каротин,
  аскорбиновая кислота, аскорбат натрия, токоферолы,
  альгинат натрия, гуаровая камедь, ксантановая камедь,
  камедь рожкового дерева, моно- и диглицериды жирных кислот,
  сорбиновая кислота, сорбат калия, бензоат натрия,
  нитрит натрия, фосфаты натрия, пирофосфаты, полифосфаты,
  ацесульфам калия, сахарин, цикламат, сукралоза,
  стевиол-гликозиды, экстракт дрожжей, автолизат дрожжей,
  гидролизованный растительный белок, мальтол, этилмальтол,
  ванилин, этилванилин, диоксид титана, оксиды железа,
  аннато, куркумин, хлорофилл, карбонат кальция,
  карбонат магния, сульфат кальция, хлорид кальция,
  молочная кислота, уксусная кислота, яблочная кислота,
  винная кислота, фумаровая кислота, пропионат кальция
```

#### 6B. Расширить NOTEWORTHY_PATTERNS (~30 новых)

```
Информационные компоненты:
  кокосовое масло, гидрогенизированные жиры, трансжиры,
  изолят соевого белка, концентрат сывороточного белка,
  какао-масло, какао тёртое, сухое цельное молоко,
  сухое обезжиренное молоко, восстановленное молоко,
  заменитель молочного жира, эквивалент какао-масла,
  инулин, олигофруктоза, полидекстроза,
  мальтит, сорбит, ксилит, эритрит, изомальт, лактит,
  витаминно-минеральный премикс, обогащающая добавка,
  краситель натуральный, ароматизатор натуральный,
  ароматизатор идентичный натуральному, экстракт солода,
  ячменно-солодовый экстракт, концентрат сока
```

#### 6C. Создать `src/constants/ingredientDescriptions.js`

Файл с конкретными описаниями ингредиентов (~100 записей для старта):

```js
export const INGREDIENT_DESCRIPTIONS = {
  // Молочные компоненты
  'сухое молоко': {
    ru: 'Обезвоженное коровье молоко. Содержит молочный белок, лактозу и кальций. Используется для придания сливочного вкуса, текстуры и увеличения срока хранения.',
    kz: 'Сусыздандырылған сиыр сүті. Құрамында сүт ақуызы, лактоза және кальций бар. Кілегей дәмі мен құрылымын беру үшін қолданылады.',
  },
  'сухое цельное молоко': {
    ru: 'Обезвоженное цельное молоко с сохранением молочного жира (~26%). Придаёт насыщенный сливочный вкус выпечке, шоколаду и кондитерским изделиям.',
    kz: 'Сүт майы сақталған (~26%) сусыздандырылған қаймағы алынбаған сүт. Пісірілген өнімдерге, шоколадқа бай кілегей дәмін береді.',
  },

  // Добавки
  'пектин': {
    ru: 'Натуральный загуститель из яблок и цитрусовых (E440). Безопасен. Создаёт желейную текстуру в джемах, мармеладе, йогуртах и начинках.',
    kz: 'Алма мен цитрустардан жасалған табиғи қоюлатқыш (E440). Қауіпсіз. Джемдер мен мармеладтарға желе тәрізді құрылым береді.',
  },
  'E440': {
    ru: 'Пектин (E440) — натуральный загуститель из фруктов. Безопасен.',
    kz: 'Пектин (E440) — жемістерден жасалған табиғи қоюлатқыш. Қауіпсіз.',
  },
  'цитрат кальция': {
    ru: 'Кальциевая соль лимонной кислоты (E333). Регулятор кислотности и источник кальция. Безопасен, часто используется в плавленых сырах.',
    kz: 'Лимон қышқылының кальций тұзы (E333). Қышқылдықты реттеуші және кальций көзі. Қауіпсіз, балқытылған ірімшіктерде жиі қолданылады.',
  },
  'бета-каротин': {
    ru: 'Природный краситель (E160a) из моркови и других овощей. В организме превращается в витамин A. Безопасен, придаёт оранжевый/жёлтый цвет.',
    kz: 'Сәбіз бен басқа көкөністерден алынатын табиғи бояғыш (E160a). Ағзада А дәруменіне айналады. Қауіпсіз, қызғылт сары/сары түс береді.',
  },
  'аскорбиновая кислота': {
    ru: 'Витамин C (E300). Антиоксидант: защищает продукт от окисления и сохраняет цвет. Часто в соках, мясных изделиях и консервах.',
    kz: 'С дәрумені (E300). Антиоксидант: өнімді тотығудан қорғайды және түсін сақтайды. Шырындарда, ет өнімдерінде жиі кездеседі.',
  },

  // Жиры
  'пальмовое масло': {
    ru: 'Растительное масло из плодов масличной пальмы. Полутвёрдое при комнатной температуре. Содержит ~50% насыщенных жиров. Не аллерген, но часто обсуждается из-за состава жиров и экологии.',
    kz: 'Майлы пальма жемісінен алынатын өсімдік майы. Бөлме температурасында жартылай қатты. Құрамында ~50% қаныққан май бар. Аллерген емес, бірақ май құрамына байланысты жиі талқыланады.',
  },

  // Подсластители
  'сорбит': {
    ru: 'Сахарный спирт (E420). Подсластитель с пониженной калорийностью (~2.6 ккал/г). Медленно усваивается, не вызывает резкого скачка сахара в крови. В больших количествах может иметь слабительный эффект.',
    kz: 'Қант спирті (E420). Төмен калориялы тәттілендіргіш (~2.6 ккал/г). Баяу сіңеді, қандағы қантты күрт көтермейді. Көп мөлшерде іш өткізетін әсері болуы мүмкін.',
  },

  // ... ещё ~80-100 записей
}
```

#### 6D. Интегрировать словарь в enrichHighlight

В `IngredientsPreview.jsx`, функция `enrichHighlight`:

```js
function enrichHighlight(item, t, lang) {
  const custom = INGREDIENT_DESCRIPTIONS[item.label] || INGREDIENT_DESCRIPTIONS[item.matchedText]
  return {
    ...item,
    kindLabel: t(`product.ingredients.kind.${item.kind}`),
    reason: custom
      ? (lang === 'kz' ? custom.kz : custom.ru)
      : t(item.reasonKey, { ingredient: item.label }),
    description: custom
      ? undefined
      : t(item.descriptionKey || `product.ingredients.description.${item.kind}`, {
          ingredient: item.label,
        }),
    askAiLabel: t('product.ingredients.askAiIngredient'),
    closeLabel: t('common.close'),
    searchGoogleLabel: t('product.ingredients.searchGoogle'),
  }
}
```

Приоритет: если есть в `INGREDIENT_DESCRIPTIONS` → конкретное описание. Если нет → шаблонное из i18n.

#### 6E. Fallback для ingredientsKz

В `analyzeProductIngredients` (стр. 399-400):
```js
// Было:
const text = lang === 'kz' && product.ingredientsKz ? product.ingredientsKz : product.ingredients

// Стало (явный fallback):
const text = lang === 'kz'
  ? (product.ingredientsKz || product.ingredients || '')
  : (product.ingredients || '')
```

### Файлы

| Файл | Что меняется |
|------|-------------|
| `src/domain/product/ingredientAnalysis.js` | ADDITIVE_PATTERNS, NOTEWORTHY_PATTERNS, fallback |
| `src/constants/ingredientDescriptions.js` | **Новый файл** — словарь описаний |
| `src/components/product/IngredientsPreview.jsx` | Интеграция словаря в enrichHighlight |
| `src/locales/ru/product.json` | Новые reason/description ключи для новых ингредиентов |
| `src/locales/kz/product.json` | Новые reason/description ключи для новых ингредиентов |
| `src/locales/ru/product.json` | searchGoogle ключ |
| `src/locales/kz/product.json` | searchGoogle ключ |

### Процесс составления списка ингредиентов

1. AI-agent выгружает уникальные ингредиенты из БД (все `ingredients_raw`)
2. Фильтрует: исключает простые слова (сахар, соль, вода, мука, и т.д.)
3. Группирует по категориям: добавки, E-коды, жиры, подсластители, консерванты, красители
4. Показывает список owner-у на подтверждение
5. После подтверждения добавляет в `ADDITIVE_PATTERNS` / `NOTEWORTHY_PATTERNS`
6. Пишет конкретные описания в `INGREDIENT_DESCRIPTIONS`

---

## Этап 7: Bottom Sheet ингредиента (IngredientInfoSheet Fix)

**Приоритет:** Critical | **Сложность:** High | **Зависимости:** Этапы 3, 4, 6 | **Риск:** Medium

### Проблемы

1. **Позиционирование ломаное.** Сейчас `.ingredient-sheet` использует `position: fixed; inset: 0; align-items: flex-end` — правильный подход. Но bottom sheet может рендериться внутри скролл-контейнера `.screen` (который имеет `overflow-y: auto`), что ломает `position: fixed` если у родителя есть `transform`/`will-change`/`contain`.

2. **Дублирование кнопок закрытия:** крестик сверху + «Закрыть» снизу — избыточно.

3. **Шаблонные описания:** вместо конкретного объяснения ингредиента (исправляется в Этапе 6).

4. **Нет дополнительного действия:** только «Спросить ИИ». Пользователь не может быстро найти ингредиент в интернете.

### Что делаем

#### 7A. Портал (Portal)

Вынести рендеринг bottom sheet из `IngredientsPreview` в `document.body` через `ReactDOM.createPortal`:

```jsx
// IngredientInfoSheet.jsx
import { createPortal } from 'react-dom'

export default function IngredientInfoSheet({ item, onClose, onAskAI, onSearchGoogle }) {
  // ...
  if (!item) return null

  return createPortal(
    <div className="ingredient-sheet" ...>
      ...
    </div>,
    document.body
  )
}
```

Это гарантирует что bottom sheet всегда позиционируется относительно viewport, независимо от родительских контейнеров.

#### 7B. Анимация появления

Добавить CSS-транзишен:

```css
.ingredient-sheet {
  opacity: 0;
  transition: opacity 0.2s ease;
  animation: sheetFadeIn 0.25s ease forwards;
}

@keyframes sheetFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.ingredient-sheet__panel {
  transform: translateY(10%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  animation: sheetSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes sheetSlideUp {
  from { transform: translateY(10%); }
  to { transform: translateY(0); }
}
```

#### 7C. Заменить «Закрыть» на «Поиск в Google»

В `IngredientInfoSheet.jsx`:

```jsx
// УДАЛИТЬ:
<button type="button" className="ingredient-sheet__secondary" onClick={onClose}>
  {item.closeLabel}
</button>

// ДОБАВИТЬ:
<button
  type="button"
  className="ingredient-sheet__secondary"
  onClick={() => {
    const query = encodeURIComponent(`${item.label} ингредиент что это`)
    window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener')
  }}
>
  <span className="material-symbols-outlined" aria-hidden="true">search</span>
  {item.searchGoogleLabel}
</button>
```

Крестик сверху — остаётся для закрытия.

#### 7D. Конкретные описания

Описания уже исправлены в Этапе 6 через `INGREDIENT_DESCRIPTIONS`. Bottom sheet автоматически получит конкретные описания через `enrichHighlight`.

Структура bottom sheet после исправления:
```
[Ручка]
[Бейдж: Аллерген / Добавка / Информация]  [×]
[Название ингредиента: "Сухое молоко"]
[Описание: "Обезвоженное коровье молоко. Содержит..."]

[Спросить ИИ]  [🔍 Поиск в Google]
```

### Файлы

| Файл | Что меняется |
|------|-------------|
| `src/components/product/IngredientInfoSheet.jsx` | Портал, Google кнопка, анимация |
| `src/components/product/IngredientInfoSheet.css` | Анимация, новые стили Google кнопки |
| `src/components/product/IngredientsPreview.jsx` | Прокинуть onSearchGoogle, обновить enrichHighlight |

---

## Этап 8: Проверка и полировка

**Приоритет:** High | **Сложность:** Low | **Зависимости:** Все этапы | **Риск:** Low

### Автоматические проверки

```bash
npm run build          # Сборка без ошибок
npm run lint           # ESLint чисто
npm run test:unit      # Юнит-тесты проходят
node scripts/check-i18n.mjs  # Все ключи есть в RU и KZ
```

### Ручное тестирование (checklist)

**Список покупок:**
- [ ] Кнопка на ProductScreen добавляет товар в список (иконка заполняется)
- [ ] Повторное нажатие удаляет товар (иконка пустая)
- [ ] Анимация нажатия видна
- [ ] Без авторизации — редирект на `/auth`
- [ ] Быстрый двойной клик — один вызов БД (без дублирования)

**Обрезанный состав:**
- [ ] Продукт с длинным составом (15+ ингредиентов) — обрезан до 4 строк
- [ ] Виден гредент (затемнение снизу)
- [ ] Видна подсказка «Нажмите, чтобы посмотреть полностью»
- [ ] Нажатие на карточку состава → переход на `/composition`
- [ ] Кнопка «Разобрать» отсутствует

**Выделение слов:**
- [ ] Продукт с "молоко" — выделяется слово целиком (6 букв), не "молок" (5)
- [ ] Продукт с "стабилизаторы" — выделяется целиком, не "стабилизатор" + "ы"
- [ ] Многословные синонимы ("сухое молоко") — выделяются корректно
- [ ] E-коды выделяются

**Цвета (dark + light):**
- [ ] Danger (красный) — виден в обеих темах
- [ ] Warning (оранжевый) — виден, отличается от danger и additive
- [ ] Additive (янтарный/золотистый) — виден, отличается от warning
- [ ] Info (фиолетовый) — виден в обеих темах
- [ ] CollapsibleFitCheck цвета синхронизированы с остальными

**Экран состава:**
- [ ] Кнопка справки в хедере отсутствует
- [ ] Секции «Разбор состава» и «Что значат цвета» — свёрнуты
- [ ] При клике на заголовок — секция раскрывается с анимацией
- [ ] Полный состав виден, все ингредиенты подсвечены

**Bottom sheet:**
- [ ] Открывается снизу экрана (не сверху, не в рандомном месте)
- [ ] Анимация slide-up видна
- [ ] Крестик сверху закрывает
- [ ] Кнопка «Спросить ИИ» работает
- [ ] Кнопка «Поиск в Google» открывает новую вкладку с результатами
- [ ] Описание ингредиента — конкретное (не шаблонное)
- [ ] Кнопка «Закрыть» отсутствует (только крестик + Google)

**Новые ингредиенты:**
- [ ] Пектин подсвечен, кликабелен, описание конкретное
- [ ] Цитрат кальция подсвечен, кликабелен
- [ ] Бета-каротин подсвечен, кликабелен
- [ ] ~100 ингредиентов в словаре имеют описания RU + KZ

### Критерии приёмки
- Все проверки пройдены
- Ни один баг из списка owner-а не воспроизводится
- Код следует стилю проекта (JS, Vanilla CSS, i18n, CSS-переменные)
- Нет регрессий в существующей функциональности
- `check-i18n.mjs` проходит без ошибок

---

## Карта зависимостей и порядок выполнения

```
                    ┌─────────────────┐
                    │  Этап 1         │
                    │  Shopping List  │
                    └────────┬────────┘
                             │ (независим)
                    ┌────────┴────────┐
                    │  Этап 2         │
                    │  Clamping + Nav │
                    └────────┬────────┘
                             │ (независим)
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────┴────────┐    │     ┌────────┴────────┐
     │  Этап 3         │    │     │  Этап 4         │
     │  Word Boundary  │    │     │  Color System   │
     └────────┬────────┘    │     └────────┬────────┘
              │              │              │
              │              │     ┌────────┴────────┐
              │              │     │  Этап 5         │
              │              │     │  CompositionScr │
              │              │     └────────┬────────┘
              │              │              │
     ┌────────┴────────┐    │              │
     │  Этап 6         │    │              │
     │  Ingredients +  │    │              │
     │  Descriptions   │    │              │
     └────────┬────────┘    │              │
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────┴────────┐
                    │  Этап 7         │
                    │  Bottom Sheet   │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │  Этап 8         │
                    │  Verification   │
                    └─────────────────┘
```

**Параллельно можно делать:** 1, 2, 3+4 (разные файлы, нет конфликтов)
**Последовательно:** 6 после 3, 7 после 4+6, 5 после 4, 8 после всех

**Рекомендуемый порядок:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

---

## Файлы, затронутые каждым этапом

| Файл | Этапы |
|------|-------|
| `src/contexts/UserDataContext.jsx` | 1 |
| `src/screens/ProductScreen.jsx` | 1, 2 |
| `src/components/product/IngredientsPreview.jsx` | 2, 6, 7 |
| `src/components/product/IngredientsPreview.css` | 2, 4 |
| `src/domain/product/ingredientAnalysis.js` | 3, 6 |
| `src/constants/allergenSynonyms.js` | 3 |
| `src/index.css` | 4 |
| `src/components/product/IngredientInfoSheet.jsx` | 7 |
| `src/components/product/IngredientInfoSheet.css` | 4, 7 |
| `src/components/product/CollapsibleFitCheck.jsx` | 4 |
| `src/screens/ProductCompositionScreen.jsx` | 5 |
| `src/screens/ProductCompositionScreen.css` | 4, 5 |
| `src/constants/ingredientDescriptions.js` | 6 (новый) |
| `src/locales/ru/product.json` | 1, 2, 4, 6, 7 |
| `src/locales/kz/product.json` | 1, 2, 4, 6, 7 |