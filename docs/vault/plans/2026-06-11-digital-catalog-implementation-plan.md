# Реализация цифровой витрины магазина (Digital Storefront) и оптимизация SEO (Версия 2)

Этот план описывает техническую реализацию стратегического поворота Körset с учетом обратной связи:
1. **Индексация товаров в Google исключена** (риск авторских прав на изображения/составы с внешних ресурсов).
2. **SEO оптимизация сфокусирована исключительно на страницах магазинов** (продвинутый `LocalBusiness`/`GroceryStore` SEO-комплекс).
3. **Реализовано клиентское сжатие изображений** перед отправкой в Supabase Storage (экономия лимитов хранилища).

---

## Принятые решения и обратная связь (Approved Decisions)

> [!IMPORTANT]
> **1. Индексация товаров отключена:**
> * Мы **сохраняем** `Disallow: /s/*/product/*` в `robots.txt`.
> * Карточки товаров на фронтенде остаются под защитой `<meta name="robots" content="noindex, nofollow" />`.
>
> **2. Фокус на продвинутом SEO для магазинов:**
> * Продвижение страниц вида `/s/:storeSlug` и `/stores/:storeSlug`.
> * Использование Schema.org (`GroceryStore`), OpenGraph, динамических Title/Description.
> * Инструкции для ручной привязки в 2GIS и Google Business Profile (для корректной работы геолокации в картах).
>
> **3. Сжатие фото при загрузке:**
> * Перед загрузкой логотипа или фотографий магазина на клиенте запускается алгоритм сжатия (HTML5 Canvas).
> * Ограничение: максимальное разрешение 1200px по большей стороне, формат JPEG, качество 0.8. Это сократит вес каждого фото с 3-8 МБ до ~150-300 КБ без видимой потери качества.

---

## Открытые вопросы (Open Questions)

> [!NOTE]
> 1. **Нужно ли владельцу указывать точные GPS-координаты магазина в настройках?**
>    *Предложение:* Да, мы можем добавить скрытые (или видимые) поля для широты (`latitude`) и долготы (`longitude`) в карточку магазина в БД. Это позволит Schema.org отдавать точные координаты `geo` (GeoCoordinates) для Google, что радикально поднимет магазин в локальной выдаче (Near Me / Рядом со мной).
> 2. **Где именно на HomeScreen показывать карусель фотографий магазина?**
>    *Предложение:* Показывать карусель прямо под логотипом и описанием магазина на главном экране. Если фото нет — не показывать ничего (сохраняем компактный вид).

---

## Предлагаемые изменения (Proposed Changes)

### 1. База данных и Storage (Хранилище)

#### [NEW] [055_add_store_images.sql](file:///c:/projects/korset/supabase/migrations/055_add_store_images.sql)
* Миграция для поддержки фотографий магазина:
  * Добавление колонки `images` (`text[] DEFAULT '{}'::text[]`) в таблицу `stores`.
  * Добавление колонок `latitude` (`numeric`) и `longitude` (`numeric`) для точного гео-позиционирования магазина (помогает Google связывать страницу с координатами пользователя).
  * Создание бакета `store-images` в Supabase Storage с ограничением 5 МБ.
  * Настройка политик безопасности RLS (Row Level Security) для бакета `store-images` (чтение публично, управление — только для `owner_id` магазина).

---

### 2. Контексты и доменная логика (Contexts & Domain Logic)

#### [MODIFY] [StoreContext.jsx](file:///c:/projects/korset/src/contexts/StoreContext.jsx)
* В функции `fetchStoreBySlug(slug)` проверять статус `is_published`.
* Предоставлять флаг `isStorePublished` через `useStore()`.
* Обновить функцию `normalizeStore` для поддержки `images`, `latitude`, `longitude` и `is_published`.

#### [MODIFY] [UserDataContext.jsx](file:///c:/projects/korset/src/contexts/UserDataContext.jsx)
* **Гостевой список покупок (Guest Shopping List):**
  * Разрешить вызов `toggleFavorite` для гостей без `internalUserId` (сохранять массив EAN в `localStorage` под ключом `korset_local_favorites`).
  * При инициализации, если пользователь не авторизован, загружать `favoriteEans` из `localStorage`.
  * При входе пользователя в аккаунт (внутри `loadIdentifiers` / `syncScanHistoryWithCloud`) автоматически считывать гостевые `korset_local_favorites`, делать массовый `upsert` в таблицу `user_favorites` на сервере Supabase, после чего очищать локальный кэш гостей.

---

### 3. Пользовательский интерфейс покупателя (Buyer UI)

#### [MODIFY] [HistoryScreen.jsx](file:///c:/projects/korset/src/screens/HistoryScreen.jsx)
* **Удаление авторизационного барьера (Login Wall):**
  * Убрать проверку `if (!user) { return <AuthRequired /> }` при открытии вкладки «Список покупок» или «История».
  * Если пользователь — гость, считывать список покупок из локального стейта `favoriteEans` (предоставляемого `UserDataContext`) и гидрировать (подгружать детали) через `hydrateProductsFromFavoriteRows`.
  * Отображать деликатный призыв к действию (Call-To-Action / CTA) для гостей: *«Войдите в аккаунт, чтобы сохранять список покупок между устройствами»*.

#### [MODIFY] [ProductScreen.jsx](file:///c:/projects/korset/src/screens/ProductScreen.jsx)
* Убрать перенаправление на `/auth` при нажатии на кнопку добавления в список покупок («чеклист») для гостей. Вызывать стандартный `toggleFavorite`.
* **SEO:** Сохранить тег `<meta name="robots" content="noindex, nofollow" />` для защиты от индексации карточек товаров.

#### [MODIFY] [HomeScreen.jsx](file:///c:/projects/korset/src/screens/HomeScreen.jsx)
* **Продвинутое SEO для магазина:**
  * Генерация Schema.org разметки `GroceryStore` с полями: название, логотип, адрес, телефон, часы работы, валюта, диапазон цен и точные гео-координаты (`geo` -> `GeoCoordinates` на основе `latitude`/`longitude`).
  * Мета-теги OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`) для красивого отображения ссылок на магазин в мессенджерах (WhatsApp/Telegram).
  * Динамические SEO-тексты на казахском и русском языках.
* **Карусель фото магазина:**
  * Отображать аккуратную горизонтальную карусель с фотографиями магазина (из `store.images`) под логотипом и описанием.
* Вывести статус «Черновик» (Draft) в шапке главного экрана для владельца магазина (когда `isStoreOwnerOrAdmin = true` и `is_published = false`).

#### [MODIFY] [StorePublicScreen.jsx](file:///c:/projects/korset/src/screens/StorePublicScreen.jsx)
* Отображать сетку фотографий магазина с возможностью клика и раскрытия во весь экран.

---

### 4. Кабинет ритейлера (Retail Cabinet)

#### [NEW] [src/utils/imageCompressor.js](file:///c:/projects/korset/src/utils/imageCompressor.js)
* Создание легковесного модуля сжатия на Canvas:
  * Функция `compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.8 })`.
  * Возвращает сжатый Blob-объект, готовый для отправки в Supabase Storage.

#### [MODIFY] [RetailSettingsScreen.jsx](file:///c:/projects/korset/src/screens/RetailSettingsScreen.jsx)
* Интегрировать `compressImage` in загрузку логотипа и загрузку фотографий магазина.
* Добавить блок **«Фотографии магазина» (Store Photos)**:
  * Позволить загружать до 5 изображений в бакет `store-images` (с обязательным сжатием перед загрузкой).
  * Возможность предпросмотра, удаления и изменения порядка фото.
  * После загрузки/удаления обновлять массив `images` в БД Supabase.
* Добавить поля для точных гео-координат:
  * Широта (`latitude`) и долгота (`longitude`) с подсказкой, как скопировать их из 2GIS или Google Maps.
* Вывести переключатель **«Опубликовать в поиске» (Publish Catalog)**:
  * Позволяет владельцу переключать флаг `is_published` (`true` / `false`) прямо из настроек, с удобным пояснением.

#### [MODIFY] [RetailDashboardScreen.jsx](file:///c:/projects/korset/src/screens/RetailDashboardScreen.jsx)
* Отображать яркий баннер-предупреждение вверху дашборда ритейлера, если магазин находится в режиме черновика (`is_published = false`): *«Ваш магазин находится в режиме черновика и не виден покупателям. Настройте каталог и опубликуйте его в Настройках»*.

---

### 5. Поисковая оптимизация и инфраструктура (SEO & Infra)

#### [MODIFY] [robots.txt](file:///c:/projects/korset/public/robots.txt)
* Убедиться, что `Disallow: /s/*/product/*` остается активным.
* Разрешить индексацию страниц магазинов: `Allow: /s/*` (исключая пути продуктов).

#### [MODIFY] [sitemap.js](file:///c:/projects/korset/api/sitemap.js)
* В запросе списка магазинов добавить фильтр `.eq('is_published', true)`, чтобы не передавать в поисковики адреса черновиков.

#### [MODIFY] [034_catalog_search_v3_rpc.sql](file:///c:/projects/korset/supabase/migrations/034_catalog_search_v3_rpc.sql)
* Обновить функцию поиска `fn_search_store_products`, отфильтровав товары со статусом `out_of_stock` для покупателей, аналогично тому, как это было сделано в `fn_get_store_catalog` в миграции `050`.

---

## План верификации (Verification Plan)

### Автоматические тесты
1. Запуск юнит-тестов и линтинга:
   ```bash
   npm run lint
   npm run test:unit
   ```
2. Проверка локализации (i18n):
   ```bash
   node scripts/check-i18n.mjs
   ```

### Ручная верификация
1. **Режим Черновика:**
   * Проверить, что черновики скрыты от незалогиненных пользователей и обычных покупателей, но видны владельцам.
2. **Список покупок для гостей:**
   * Проверить работу без авторизации, затем залогиниться и убедиться, что локальные товары синхронизировались с облачной таблицей `user_favorites`.
3. **Сжатие изображений:**
   * Загрузить тяжелое фото (например, 6 МБ). Убедиться, что оно успешно сжимается на клиенте и загружается в Supabase Storage весом не более 300 КБ.
4. **Проверка Schema.org:**
   * Загрузить разметку Schema.org с `GeoCoordinates` в валидатор структурированных данных Google и проверить на отсутствие ошибок.
