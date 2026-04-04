# Stage 1 Data Patch

## Что сделано
- `products.json` теперь содержит глобальные данные товара без магазинной цены и полки.
- Добавлен `src/data/storeInventories.js` с ассортиментом `store-one`.
- `storeCatalog.js` теперь собирает карточку как `global product + store overlay`.
- `productLookup.js` сначала пытается найти товар в store-aware каталоге, потом в Supabase, потом в cache/OFF.
- `fitCheck.js` понимает `halalStatus` и работает с обновлённой моделью.
- `ProductScreen.jsx` показывает, когда это глобальная карточка без магазинного оверлея.
- `QRPrintScreen.jsx` генерирует QR на store-aware route по EAN.
