# RetailImport V1.1 — 2026-04-25

> Связи: [[retail-cabinet]] · [[ean-recovery-system]]

## Что изменилось

- `src/screens/RetailImportScreen.jsx` получил B2B-ready UX вокруг импорта: скачивание шаблона CSV/XLSX, более понятные счётчики, отдельный отчёт по `unknown EAN` и блок по неуспешным обновлениям.
- `src/utils/retailImportCore.js` выделен как чистый модуль для шаблона, CSV-парсинга, preview-валидации и разделения known/unknown строк.
- `src/utils/retailImport.js` теперь переиспользует core-логику и умеет выгружать CSV-отчёт `unknown EAN` для передачи в Data Moat pipeline.
- `tests/unit/retailImportCore.test.mjs` добавляет regression coverage на шаблон, нормализацию preview и разделение known/unknown EAN.
- `src/utils/i18n.js` расширен ключами `retail.import` на RU/KZ под новый импортный flow.

## Почему это важно

V1 импорта уже позволял обновлять цены и наличие, но продавать это магазину было тяжело: не было готового шаблона, а `unknown EAN` терялись внутри общего отчёта. V1.1 переводит импорт в более операционный режим: магазин может скачать шаблон, загрузить прайс и сразу получить артефакт для следующего шага Data Moat.

## Проверено

- `node --test tests/unit/retailImportCore.test.mjs` — 3/3.
- `npm run lint` — OK, без новых ошибок, осталось 46 старых warning по проекту.
- `npm test` — 4/4.
- `npm run build` — OK; `xlsx` остаётся lazy chunk, PWA precache около 1806 KiB.

## Дальше

1. Добавить bulk RPC или staging-table flow для `unknown EAN`, чтобы отчёт можно было не только скачать, но и безопасно отправить в Data Moat ingestion.
2. Подтвердить вручную применение миграции `supabase/migrations/011_add_korzinavdom_image_source.sql`.
3. Вернуться к DB/search/scaling fixes (`CASCADE`, `GIN`, search/scaling).
