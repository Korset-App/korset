# KORSET — AI HANDOFF

> Рабочий файл для передачи состояния между Codex, OpenCode, Windsurf, Antigravity и другими агентами.

---

## 1. Сводка текущего состояния (Current Status)

### Тема А: Переход на Azure OpenAI и гибридную схему ИИ (Завершено)
- **Цель:** Использование гранта Microsoft Azure для ИИ и предотвращение перерасхода баланса (Cost Leakage).
- **Схема моделей:**
  - Чат-ассистент: `DeepSeek-V4-Flash` (через OpenAI-совместимый шлюз Azure).
  - Распознавание изображений (Vision): `gpt-4o-mini` (Azure OpenAI).
  - Распознавание голоса (Whisper): `gpt-4o-mini-transcribe`.
  - Векторная память (Vault/RAG): `text-embedding-3-small`.
- **Сделано:** все эндпоинты, `.env.local`, Vault синхронизирован. Бюджет $10 покрывает ~3 140 сессий покупателей.

### Тема Б: Цифровой каталог и SEO (Завершено)
- **is_published:** реализовано в StoreContext, RetailSettingsScreen, SuperAdmin, HomeScreen (бейдж черновика).
- **out_of_stock:** миграция 050, RPC `fn_get_store_catalog` фильтрует. В поиске (`fn_search_store_products`) — требует проверки, скрыты ли out_of_stock для покупателей.
- **Favorites → Shopping List:** переводы RU/KZ обновлены (ключи в i18n остались `profile.favorites*`).
- **SEO:** SSR-эндпоинты (`api/store-seo.js`, `api/product-seo.js`), Schema.org GroceryStore + Product, robots.txt, sitemap, мета-теги, Vercel rewrites — всё реализовано. HomeScreen получил twitter-теги и canonical 2026-06-19.
- **Favorites иконка:** всё ещё сердечко. Нужно заменить на `checklist`/`shopping_bag` — см. пункт ниже.

---

## 2. Задачи на следующую сессию (Next Steps)

### 1. Замена иконки «Избранное» → «Список покупок»
- Все тексты переведены, но иконки всё ещё `favorite`/`favorite_border`.
- Заменить во всех компонентах (CatalogProductCard, ProductScreen, HistoryScreen, ProfileScreen и др.) на `checklist` или `shopping_bag`.

### 2. Скрытие out_of_stock в поиске для покупателей
- Проверить RPC `fn_search_store_products` (миграция 034). Если фильтр `out_of_stock` ещё не добавлен — добавить.
- Владелец в Retail должен видеть всё, включая out_of_stock.

### 3. После production-деплоя
- Пройти Google Rich Results Test для Schema.org на живых URL.
- Добавить sitemap в Google Search Console.
- Магазинам добавить ссылки в 2GIS и Google Business Profile.

---

## 3. Файлы для работы в следующей сессии:
- `src/components/catalog/CatalogProductCard.jsx` — иконка избранного
- `src/screens/ProductScreen.jsx` — иконка избранного
- `src/screens/ProfileScreen.jsx` — иконка избранного
- `src/screens/HistoryScreen.jsx` — иконка избранного
- `supabase/migrations/034_catalog_search_v3_rpc.sql` — RPC поиска
- `api/store-seo.js`, `api/product-seo.js` — SSR SEO
- `public/robots.txt` — правила индексации
- `vercel.json` — rewrites