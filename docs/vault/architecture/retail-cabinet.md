# Retail Cabinet Architecture

> Домен: architecture / retail-cabinet
> Обновлено: 2026-04-17
> Связи: [[auth-flow]] · [[product-resolution]] · [[fit-check-engine]]

---

## Маршруты

```
/retail                    → RetailEntryScreen (авто-редирект по owner_id)
/retail/:storeSlug/        → RetailLayout (RBAC: owner_id === user.id)
/retail/:storeSlug/dashboard → RetailDashboardScreen
/retail/:storeSlug/products  → RetailProductsScreen
/retail/:storeSlug/import    → RetailImportScreen (STUB — не реализован)
/retail/:storeSlug/settings  → RetailSettingsScreen
```

---

## RBAC

`RetailLayout.jsx` проверяет:

- `user.id === currentStore.owner_id`
- Если нет → экран «Нет доступа»
- `RetailEntryScreen` — автоматически находит магазин по `owner_id` и редиректит

---

## Dashboard (RetailDashboardScreen)

### Метрики

- Сканы за 7/30 дней (из scan_events)
- Уникальные товары (из scan_events)
- «Спасённые продажи» — count (Фаза 1: нужно перевести в тенге)
- «Радар дефицита» — упущенная выгода (missing_products + scan_events)

### Источник данных

- `src/utils/retailAnalytics.js` — Supabase-запросы

---

## Products (RetailProductsScreen)

- Каталог товаров магазина (из store_products + global_products)
- Поиск по названию
- Встроенный сканер штрихкодов (RetailScannerModal)
- Аккордеон-редактор: цена, наличие, полка
- Inline-редактирование через retailAnalytics.js

---

## Settings (RetailSettingsScreen)

- Название и адрес магазина → Supabase UPDATE
- QR-код магазина (генерация + скачивание PNG)
- Тумблеры уведомлений (notify_oos_enabled, notify_daily_enabled)
- Кнопка «Очистить каталог» (реализовано)
- **НЕ реализовано:** загрузка логотипа и баннера в Supabase Storage

---

## Import (RetailImportScreen)

**СТАТУС: STUB** — UI есть, функционал нет:

- Кнопка «Скачать шаблон» → нет onClick
- File input → нет onChange
- Нужно: Excel/CSV парсер + валидация + batch insert в store_products

---

## Известные баги

1. Аккордеон-редактор: баги верстки, SVG иконки вместо Material Symbols
2. RetailScannerModal: 10+ хардкод RU строк, 20+ inline стилей
3. RetailSettingsScreen: 31+ хардкод RU строк
4. Нет пагинации в каталоге — при тысячах товаров будет медленно
