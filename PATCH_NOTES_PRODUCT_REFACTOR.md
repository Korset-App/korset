# Körset Product Refactor

Что изменено в этом патче:

1. Введён единый канонический ProductEntity.
2. Добавлен product domain layer:
   - src/domain/product/model.js
   - src/domain/product/normalizers.js
   - src/domain/product/resolver.js
3. productLookup.js теперь тонкий адаптер, а не свалка бизнес-логики.
4. ProductScreen и ExternalProductScreen объединены через UnifiedProductScreen.
5. HistoryScreen переведён на batch-hydration и исправлен под реальные поля БД:
   - scan_events.scanned_at
   - global_products.images
   - external_product_cache.normalized_name / normalized_brand
6. Добавлен OFF proxy: api/off.js
7. AIScreen теперь работает с единым product resolver.
8. AlternativesScreen теперь умеет работать через канонический маршрут.
9. UserDataContext корректно пишет global_product_id из sourceMeta.
10. .env.example очищен от старого рассинхрона.

Что НЕ закрывает этот патч:
- полноценный admin / store onboarding
- SQL миграции / RLS-политики
- светлая тема
- store slug -> UUID mapping

Это именно качественный рефактор товарного слоя и связанных экранов.
