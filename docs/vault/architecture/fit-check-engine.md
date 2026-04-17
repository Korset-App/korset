# Fit-Check Engine v2.0

> Домен: architecture / fit-check-engine
> Обновлено: 2026-04-17
> Связи: [[e-additives]] · [[halal-certification]] · [[allergen-cross-contamination]] · [[why-deterministic-fit-check]] · [[product-resolution]]

---

## Обзор

Fit-Check — ядро безопасности и ценности Körset. Проверяет продукт на соответствие профилю пользователя (аллергии, диеты, халал, здоровье).

**Файл:** `src/utils/fitCheck.js` (~406 строк)

---

## Уровни серьезности

| Уровень    | Код       | Цвет      | Логика                                      | Источник данных                            |
| ---------- | --------- | --------- | ------------------------------------------- | ------------------------------------------ |
| **Red**    | `danger`  | Красный   | Детерминированный IF/ELSE — жёсткий блок    | ТР ТС 022/2011, структурированные данные   |
| **Orange** | `warning` | Оранжевый | Детерминированный — предупреждение о следах | Фразы-маркеры на этикетке                  |
| **Yellow** | `caution` | Жёлтый    | Частично детерминированный + RAG/AI         | База знаний + LLM для сомнительных добавок |
| **Green**  | `pass`    | Зелёный   | Продукт безопасен                           | —                                          |

---

## Red Level — Детерминированные проверки

### Аллергены (структурированные)

- Проверяет `product.allergens[]` против `profile.allergens[]`
- Использует `ALLERGEN_NAMES` из `constants/allergens.js` для маппинга
- Использует `allergenSynonyms.js` для синонимов (напр. «молоко» = «лактоза» = «сыворотка»)

### Аллергены (текстовый поиск по составу)

- Сканирует `product.ingredients` строку на ключевые слова
- Ключевые слова из `constants/allergens.js` и `allergenSynonyms.js`
- Найдено совпадение → `danger`

### Диабет

- Проверяет содержание сахара: >22.5 г на 100 г → `danger`, >5 г → `warning`
- Сканирует состав на ключевые слова: «сахар», «сироп», «фруктоз»
- **Пробел:** нет хард-блока на фруктозу отдельно (фруктоза только как warning при неизвестном количестве сахара)

### Целиакия (глютен)

- Если `profile.healthConditions` содержит `celiac`
- Проверяет allergens на `gluten` / `wheat`
- Сканирует состав на «глютен», «пшениц», «рожь», «ячмень», «овёс»
- Найдено → `danger`

### Фенилкетонурия (PKU)

- Если `profile.healthConditions` содержит `pku`
- Проверяет наличие аспартама (E951) → `danger`
- Проверяет высокое содержание белка → `warning`

---

## Orange Level — Следы и перекрёстное загрязнение

- Использует `constants/tracePhrases.js` для детекции фраз «может содержать следы»
- `extractTraceAllergens()` парсит текст рядом с фразой-маркером
- Найденный аллерген в профиле → `warning`
- **Пользователь решает сам** — не блок

---

## Yellow Level — Халал / Lifestyle

### Халал (детерминированная часть)

- `product.halal === true` или `halalStatus === 'yes'` → `pass`
- `product.halal === false` или `halalStatus === 'no'` → `danger` (если профиль халал)
- `halalStatus === 'unknown'` → `caution`
- `profile.halalStrict === true` → unknown = `warning` (строгий режим)

### Халал (RAG/AI часть — НОВАЯ, через pgvector)

- При `caution` или `warning` для халал — AI-чат запрашивает контекст из `vault_embeddings`
- Ищет релевантные знания по составу продукта (Е-добавки, сомнительные ингредиенты)
- RAG-контекст добавляется в system prompt AI-чата
- AI даёт более точный ответ о халал-статусе конкретных добавок в данном продукте

### Диета (dietGoals)

- `sugar_free`: проверяет сахар и подсластители
- `dairy_free`: проверяет молочные ингредиенты
- `vegan`: проверяет животные ингредиенты
- Несоответствие → `caution`

---

## Возвращаемая структура

```js
{
  severity: 'danger' | 'warning' | 'caution' | 'pass',
  reasons: [{ severity, text, textKz, allergen? }],
  score: number,         // качество продукта (0-100), НЕ fit-score
  type: 'pass' | 'fail', // бинарный для v1 UI
  halalStatus: 'yes' | 'no' | 'unknown'
}
```

---

## Известные проблемы

1. **dietGoal reasons без textKz** — строки 248-270 в fitCheck.js
2. **score = product.qualityScore || 100** — не настоящий fit-score
3. **getAlternatives()** использует демо-данные из products.json вместо Supabase
4. **buildWhyFits()** — хардкод RU без KZ
5. **CATEGORY_LABELS** — хардкод RU без KZ
6. **Нет хард-блока на фруктозу** для диабета
