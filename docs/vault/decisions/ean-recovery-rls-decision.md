# Решение: Serverless API для EAN Recovery (обход RLS)

> Дата: 2026-04-27
> Связи: [[ean-recovery-system]] · [[retail-cabinet]]

## Контекст

EAN Recovery Screen нужен для удаления и редактирования продуктов с fake EAN. Операции DELETE и UPDATE на таблице `global_products` блокируются RLS при использовании anon key Supabase клиента.

## Проблема

Supabase RLS с anon key возвращает `{data: null, error: null}` — молчаливый отказ без ошибки. Это сбивает с толку: код думает что всё ОК, но данные не меняются.

## Варианты

1. **Создать RLS policy для anon DELETE/UPDATE** — небезопасно, любой аноним может удалить продукты
2. **Использовать service_role key на фронтенде** — утечка ключа в бандл
3. **Serverless API с JWT + service_role** — безопасно, ключ на сервере

## Решение

**Вариант 3** — serverless API `api/ean-recovery.js`:
- JWT верификация через `supabase.auth.getUser(token)` — только авторизованные retail-пользователи
- service_role key используется ТОЛЬКО на сервере (не утекает)
- Паттерн повторяет `api/ai.js`

## Последствия

- Все write-операции с global_products из фронтенда должны идти через serverless API
- Read-операции (SELECT) работают через anon key — RLS пропускает
- Паттерн применим для будущих write-операций (импорт прайс-листа и т.д.)
