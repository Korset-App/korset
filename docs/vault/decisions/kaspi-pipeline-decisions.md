# Решения: Kaspi Pipeline

## Принятые решения

### Каспи = первичный источник данных (не OFF)
- OFF — мусор для КЗ рынка: английские названия, нет фото, нет цен
- Kaspi — реальные КЗ товары с ценами, фото, составом (через HTML)
- OFF удалён из БД если нет name/brand/image

### HTML fallback для состава
- Mobile API `/mobile/specifications` никогда не возвращает "Состав"
- HTML страница товара содержит полный specs-блок с составом
- Парсим HTML только если mobile API не дал состав (fallback)
- Стоимость: ~2с/товар + 285KB HTML на товар

### Временный EAN `kaspi_XXXXXX`
- Для товаров без реального EAN используем `kaspi_{kaspiCode}`
- Помечаем `needs_review=true`, `is_verified=false`
- Позже заменяем на реальные EAN через EAN-lookup сервисы

### Фильтрация подарочных товаров
- Бренды: "Без бренда", "CLUBNIKA.KZ", "ANDOR", "RA Company" и т.д. (~30 брендов)
- Ключевые слова: "букет", "корзина", "бокс", "клубника в шоколаде", "финики в шоколаде"
- Паттерны: NxN упаковки, сантиметры в названии
- Результат: 269 grocery из 1592 total (83% отфильтровано)

### Удаление OFF-мусора
- Критерий: source_primary='off' И (name is NULL ИЛИ brand is NULL ИЛИ image_url is NULL)
- Удалено: 1503 global_products, 1441 store_products
- Оставшиеся 382 OFF-товаров — с фото и валидными данными

### Цена из listing API
- `unitPrice` из `/yml/product-view/pl/results` — 100% покрытие
- Offers API (`/mobile/offers`) возвращает пустой массив (товары не в наличии)
- HTML страницы: цена в JSON-LD, но 285KB на товар — слишком дорого

### Следующий приоритет: USDA FoodData Central
- Бесплатный API, даёт EAN + состав + 14 нутриентов
- Покрытие: ~70% импортных брендов (Milka, Ritter, Kinder, Lindt)
- Не покрывает: локальные КЗ/РУ бренды (Победа, Спартак, Alma Chocolates)

## Отклонённые подходы

### Kaspi Desktop API
- `/shop/rest/misc/product/specifications` (без /mobile/) → 404

### Kaspi Offers API для цен
- `/mobile/offers` → пустой массив для большинства товаров

### OFF Search API
- Упал (503) с ~апреля 2025, до сих пор не восстановлен

### barcodelookup.com
- Captcha на каждый запрос, невозможно программно

### GS1 GEPIR
- Только поиск по компании, не по штрихкоду продукта

### DuckDuckGo search для EAN
- Блокирует после ~100 запросов (rate limit)
- Низкое качество результатов для КЗ товаров
