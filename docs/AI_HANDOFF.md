# KORSET — AI HANDOFF

> Рабочий файл для передачи состояния между Codex, OpenCode, Windsurf, Antigravity и другими агентами.

---

## 1. Сводка текущего состояния (Current Status)

### Тема А: Переход на Azure OpenAI и гибридную схему ИИ (Завершено)
* **Цель:** Использование гранта Microsoft Azure для ИИ и предотвращение перерасхода баланса (Cost Leakage).
* **Схема моделей:**
  * Чат-ассистент: `DeepSeek-V4-Flash` (через OpenAI-совместимый шлюз Azure).
  * Распознавание изображений (Vision): `gpt-4o-mini` (Azure OpenAI).
  * Распознавание голоса (Whisper): `gpt-4o-mini-transcribe`.
  * Векторная память (Vault/RAG): `text-embedding-3-small` (самая дешевая модель, $0.02 за 1 млн токенов, работает инкрементально).
* **Сделано:**
  * Все эндпоинты в `api/ai.js` (RAG-эмбеддинги), `src/telegram-bot/ai.js` (Telegram-бот поддержки), `scripts/translate-composition.cjs` и `scripts/translate-names-kz.mjs` избавлены от жестко закодированного `api.openai.com` и перенаправлены на `process.env.OPENAI_API_BASE_URL` с поддержкой заголовка `api-key` для Azure.
  * Файл `.env.local` настроен на Azure-развертку.
  * База знаний Vault синхронизирована (`npm run memory:save` прошел успешно).
  * Все 564 теста (`npm run check:agent`) и сборка (`npm run build`) проходят успешно.
  * Задокументирован расчет затрат в `docs/vault/changelog/2026-06-14-azure-ai-hybrid-migration.md` и [ai_cost_analysis.md](file:///C:/Users/User/.gemini/antigravity-ide/brain/ebac45b0-ae71-4c68-86e1-23f10e81aeca/ai_cost_analysis.md). Бюджет $10 покрывает ~3 140 сессий покупателей.

### Тема Б: Стратегия Цифрового каталога (Applied & Ready)
* **Сделано:**
  * База данных готова к запуску новой стратегии. Применены две миграции (уже коммитнуты в ветку):
    1. `supabase/migrations/050_hide_out_of_stock_catalog.sql` — модифицирует RPC-функцию `fn_get_store_catalog`, отфильтровывая товары со статусом `out_of_stock`.
    2. `supabase/migrations/051_superadmin_auth_and_stores.sql` — добавляет флаг `is_superadmin` в таблицу `public.users`, защищает его триггером и пробрасывает в JWT для RLS-политики.

---

## 2. Задачи на следующую сессию (Next Steps)

Необходимо продолжить реализацию плана из `docs/vault/plans/2026-06-11-digital-catalog-implementation-plan.md` по следующим пунктам:

### 1. Поддержка режима черновика (`is_published`) в UI
* **StoreContext:** В `src/contexts/StoreContext.jsx` при загрузке данных магазина проверять значение поля `is_published` таблицы `stores`.
* **Страница заглушки:** Если `is_published = false` и авторизованный пользователь не является владельцем (owner) данного магазина, перенаправлять/показывать экран-заглушку «Магазин готовится к открытию».
* **Управление статусом:** В `RetailDashboard` или `RetailSettingsScreen` вывести плашку со статусом («Черновик» / «Опубликован») и кнопку «Опубликовать каталог» (вызывает сохранение `is_published = true` в БД).

### 2. Скрытие отсутствующих товаров в поиске
* Обновить RPC-функцию `fn_search_store_products` (определена в `supabase/migrations/034_catalog_search_v3_rpc.sql`), добавив в секцию `WHERE` фильтр:
  `AND sp.stock_status IS DISTINCT FROM 'out_of_stock'`
  Это скроет отсутствующие товары из выдачи поиска для покупателей.
* Убедиться, что для владельца магазина в Retail-кабинете (поиск в товарах) этот фильтр **не применяется** (владелец должен видеть и редактировать все товары).

### 3. Рефакторинг «Избранного» в «Список покупок»
* Изменить тексты в переводах: `src/locales/ru/*.json` и `src/locales/kz/*.json`. Переименовать «Избранное» → «Список покупок», «Добавить в избранное» → «В список покупок».
* Изменить UI-иконки: во всех компонентах заменить сердечко (`favorite` / `favorite_border`) на чеклист или корзину (например, `checklist`, `shopping_bag`, или `add_shopping_cart` — см. Material Symbols).

### 4. SEO, Мета-теги и Schema.org
* Интегрировать микроразметку Schema.org (`LocalBusiness` / `GroceryStore` для страниц магазинов и `Product` для страниц товаров) через динамическое внедрение JSON-LD скрипта в `<head>` (или с использованием `react-helmet-async`).

---

## 3. Файлы для работы в следующей сессии:
* Контекст роутинга и каталога: [StoreContext.jsx](file:///c:/projects/korset/src/contexts/StoreContext.jsx)
* Главный экран каталога: [CatalogScreen.jsx](file:///c:/projects/korset/src/screens/CatalogScreen.jsx)
* Файлы локализации: `src/locales/ru/product.json`, `src/locales/kz/product.json`
* Настройки и дашборд владельца: `src/screens/RetailDashboardScreen.jsx`, `src/screens/RetailSettingsScreen.jsx`
* RPC-миграция для поиска: [034_catalog_search_v3_rpc.sql](file:///c:/projects/korset/supabase/migrations/034_catalog_search_v3_rpc.sql)
