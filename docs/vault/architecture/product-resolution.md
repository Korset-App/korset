# Product Resolution Pipeline

> Домен: architecture / product-resolution
> Обновлено: 2026-04-17
> Связи: [[fit-check-engine]] · [[retail-cabinet]] · [[auth-flow]]

---

## Обзор

Пайплайн определения продукта по штрихкоду (EAN). От сканирования до отображения карточки.

**Ключевые файлы:**

- `src/domain/product/resolver.js` — основная логика резолва
- `src/utils/storeCatalog.js` — каталог магазина (локальный + DB)
- `src/utils/productLookup.js` — тонкая обёртка над resolver

---

## Порядок резолва (приоритет)

```
1. store_products (Supabase) — товар конкретного магазина с ценой и полкой
   ↓ не найден
2. global_products (Supabase) — глобальный товар без магазина
   ↓ не найден
3. products.json (локальный) — демо-товары [ФАЗА 8: УДАЛИТЬ]
   ↓ не найден
4. external_product_cache (Supabase) — кэш внешних API
   ↓ не найден
5. Open Food Facts API (/api/off) — внешний запрос
   ↓ не найден
6. missing_products (Supabase) — лог неизвестного EAN
```

---

## Результат резолва

```js
{
  product: { ... },           // данные продукта
  source: 'store' | 'global' | 'demo' | 'cache' | 'off' | 'missing',
  isExternal: boolean,         // из внешнего API
  storeSpecific: boolean       // привязан к магазину
}
```

---

## Проблемы текущей реализации

1. **products.json как fallback** — 20 демо-товаров блокируют переход на 100% SQL
2. **stores.js хардкод** — один тестовый магазин, нет Supabase-альтернативы для списка магазинов
3. **storeInventories.js** — мёртвые EAN-ссылки (не существуют ни в products.json ни в БД)
4. **Двойной экземпляр Supabase-клиента** — resolver.js создаёт свой собственный клиент вместо использования `src/utils/supabase.js`

---

## План миграции (Фаза 8)

1. Перенести 20 демо-товаров из products.json в global_products через seed-скрипт
2. Перенести инвентарь из storeInventories.js в store_products
3. Удалить products.json, stores.js, storeInventories.js
4. Обновить storeCatalog.js — DB-функции становятся единственным путём
5. Обновить resolver.js — убрать fallback на демо-данные
6. Обновить StoreContext.jsx — искать магазин в Supabase, не в stores.js
7. Обновить StoresScreen.jsx — список магазинов из Supabase
