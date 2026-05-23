// Unit tests for fitCheck.js — юридически-критичная логика
// (аллергии, халал, целиакия, диабет, ФКУ).
// Любая регрессия здесь = риск судебного иска от пользователя.
//
// Запуск: npm run test:unit
//
// Покрытие: 35+ кейсов по всем 8 ветвям checkProductFit.

import test from 'node:test'
import assert from 'node:assert/strict'

import { checkProductFit } from '../../src/utils/fitCheck.js'

// ─── Helpers ────────────────────────────────────────────────────

const baseProduct = (overrides = {}) => ({
  ean: '1234567890123',
  name: 'Test Product',
  ingredients: '',
  allergens: [],
  dietTags: [],
  traces: [],
  nutritionPer100: {},
  ...overrides,
})

const baseProfile = (overrides = {}) => ({
  allergens: [],
  customAllergens: [],
  healthConditions: [],
  dietGoals: [],
  ...overrides,
})

const hasReason = (result, predicate) => result.reasons.some(predicate)

const hasReasonByCategory = (result, category) =>
  result.reasons.some((r) => r.category === category)

const hasDangerByText = (result, substring) =>
  result.reasons.some((r) => r.severity === 'danger' && r.text.includes(substring))

// ─── 1. Structured allergens (5 cases) ──────────────────────────

test('milk allergen → danger when product.allergens includes milk', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['milk'] }),
    baseProfile({ allergens: ['milk'] })
  )
  assert.equal(r.verdict, 'danger')
  assert.ok(hasDangerByText(r, 'аллерген'))
})

test('milk allergen with en: prefix → danger', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['en:milk'] }),
    baseProfile({ allergens: ['milk'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('peanuts allergen → danger', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['peanuts'] }),
    baseProfile({ allergens: ['peanuts'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('user has milk allergy but product has no allergens → safe', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['gluten'] }),
    baseProfile({ allergens: ['milk'] })
  )
  assert.equal(r.verdict, 'safe')
})

test('multiple allergens — at least one match → danger', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['gluten', 'eggs'] }),
    baseProfile({ allergens: ['milk', 'eggs', 'fish'] })
  )
  assert.equal(r.verdict, 'danger')
  assert.ok(r.reasons.some((x) => x.details?.allergenId === 'eggs'))
})

// ─── 2. Parsed ingredients (4 cases) ────────────────────────────

test('parsed milk in ingredients → danger when allergic', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Молоко обезжиренное, сахар, какао' }),
    baseProfile({ allergens: ['milk'] })
  )
  assert.equal(r.verdict, 'danger')
  assert.ok(r.reasons.some((x) => x.source === 'ingredient_parse'))
})

test('parsed gluten synonym ("пшеница") in ingredients → danger when allergic', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Мука пшеничная, вода, дрожжи' }),
    baseProfile({ allergens: ['gluten'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('no allergen synonym match → safe', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Вода, фруктоза, лимонная кислота' }),
    baseProfile({ allergens: ['milk'] })
  )
  assert.equal(r.verdict, 'safe')
})

test('structured allergen takes precedence — no double-report', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['milk'], ingredients: 'Молоко, сахар' }),
    baseProfile({ allergens: ['milk'] })
  )
  // Only one milk reason should exist (structured beats parsed)
  const milkReasons = r.reasons.filter((x) => x.details?.allergenId === 'milk')
  assert.equal(milkReasons.length, 1)
})

// ─── 3. Custom allergens (2 cases) ──────────────────────────────

test('custom allergen "лактоза" matched in ingredients → danger', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Сыворотка молочная, лактоза, соль' }),
    baseProfile({ customAllergens: ['лактоза'] })
  )
  assert.equal(r.verdict, 'danger')
  assert.ok(hasReason(r, (x) => x.text.includes('лактоза')))
})

test('custom allergen NOT in ingredients → safe', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Вода, сахар' }),
    baseProfile({ customAllergens: ['лактоза'] })
  )
  assert.equal(r.verdict, 'safe')
})

// ─── 4. Trace allergens (2 cases) ───────────────────────────────

test('structured traces — warning, not danger', () => {
  const r = checkProductFit(
    baseProduct({ traces: ['nuts'] }),
    baseProfile({ allergens: ['nuts'] })
  )
  assert.equal(r.verdict, 'warning')
  assert.ok(hasReasonByCategory(r, 'allergen'))
})

test('trace allergen NOT relevant to user → safe', () => {
  const r = checkProductFit(
    baseProduct({ traces: ['fish'] }),
    baseProfile({ allergens: ['milk'] })
  )
  assert.equal(r.verdict, 'safe')
})

// ─── 5. Diabetes (4 cases) ──────────────────────────────────────

test('diabetes + high sugar (>22.5) → danger', () => {
  const r = checkProductFit(
    baseProduct({ nutritionPer100: { sugar: 30 } }),
    baseProfile({ healthConditions: ['diabetes'] })
  )
  assert.equal(r.verdict, 'danger')
  assert.ok(hasDangerByText(r, 'сахар'))
})

test('diabetes + medium sugar (>5, ≤22.5) → warning', () => {
  const r = checkProductFit(
    baseProduct({ nutritionPer100: { sugar: 12 } }),
    baseProfile({ healthConditions: ['diabetes'] })
  )
  assert.equal(r.verdict, 'warning')
})

test('diabetes + low sugar (≤5) → safe with positive feedback', () => {
  const r = checkProductFit(
    baseProduct({ nutritionPer100: { sugar: 2 } }),
    baseProfile({ healthConditions: ['diabetes'] })
  )
  assert.equal(r.verdict, 'safe')
  assert.ok(r.reasons.some((x) => x.severity === 'safe'))
})

test('diabetes + sugar keywords (no value) → warning', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Вода, сахар, ароматизатор' }),
    baseProfile({ healthConditions: ['diabetes'] })
  )
  assert.equal(r.verdict, 'warning')
})

// ─── 6. Celiac (3 cases) ────────────────────────────────────────

test('celiac + structured wheat allergen → danger', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['gluten'] }),
    baseProfile({ healthConditions: ['celiac'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('celiac + gluten in parsed ingredients → danger', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Пшеничная мука, дрожжи, соль' }),
    baseProfile({ healthConditions: ['celiac'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('celiac + no gluten → safe', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Рисовая мука, вода' }),
    baseProfile({ healthConditions: ['celiac'] })
  )
  assert.equal(r.verdict, 'safe')
})

// ─── 7. PKU (3 cases) ───────────────────────────────────────────

test('PKU + aspartame in ingredients → danger', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Вода, аспартам, лимонная кислота' }),
    baseProfile({ healthConditions: ['pku'] })
  )
  assert.equal(r.verdict, 'danger')
  assert.ok(hasDangerByText(r, 'аспартам'))
})

test('PKU + high protein (>20g) → warning', () => {
  const r = checkProductFit(
    baseProduct({ nutritionPer100: { protein: 25 } }),
    baseProfile({ healthConditions: ['pku'] })
  )
  assert.equal(r.verdict, 'warning')
})

test('PKU + raw Arbuz protein_100g (>20g) → warning', () => {
  const r = checkProductFit(
    baseProduct({ nutritionPer100: null, nutriments_json: { protein_100g: 25 } }),
    baseProfile({ healthConditions: ['pku'] })
  )
  assert.equal(r.verdict, 'warning')
})

test('PKU + low protein, no aspartame → safe', () => {
  const r = checkProductFit(
    baseProduct({ nutritionPer100: { protein: 3 } }),
    baseProfile({ healthConditions: ['pku'] })
  )
  assert.equal(r.verdict, 'safe')
})

// ─── 8. Halal (5 cases) ─────────────────────────────────────────

test('halal profile + halalStatus=yes → safe with confirmation', () => {
  const r = checkProductFit(
    baseProduct({ halalStatus: 'yes' }),
    baseProfile({ halal: true })
  )
  assert.equal(r.verdict, 'safe')
  assert.ok(hasReasonByCategory(r, 'halal'))
})

test('halal profile + halalStatus=no (non-strict) → caution', () => {
  const r = checkProductFit(
    baseProduct({ halalStatus: 'no' }),
    baseProfile({ halal: true })
  )
  assert.equal(r.verdict, 'caution')
})

test('halal profile + halalStatus=no + halalStrict=true → warning', () => {
  const r = checkProductFit(
    baseProduct({ halalStatus: 'no' }),
    baseProfile({ halal: true, halalStrict: true })
  )
  assert.equal(r.verdict, 'warning')
})

test('halal profile + alcohol > 0 → danger', () => {
  const r = checkProductFit(
    baseProduct({ halalStatus: 'unknown', alcohol100g: 4.5 }),
    baseProfile({ halal: true })
  )
  assert.equal(r.verdict, 'danger')
  assert.ok(hasDangerByText(r, 'алкоголь'))
})

test('halal profile + halalStatus=unknown + haram keyword "пиво" → danger', () => {
  const r = checkProductFit(
    baseProduct({
      halalStatus: 'unknown',
      ingredients: 'Солод, хмель, пиво нефильтрованное',
    }),
    baseProfile({ halal: true })
  )
  assert.equal(r.verdict, 'danger')
})

// ─── 9. Diet goals (3 cases) ────────────────────────────────────

test('sugar_free goal + dietTags has contains_sugar → caution', () => {
  const r = checkProductFit(
    baseProduct({ dietTags: ['contains_sugar'] }),
    baseProfile({ dietGoals: ['sugar_free'] })
  )
  assert.equal(r.verdict, 'caution')
})

test('dairy_free goal + dietTags has contains_dairy → caution', () => {
  const r = checkProductFit(
    baseProduct({ dietTags: ['contains_dairy'] }),
    baseProfile({ dietGoals: ['dairy_free'] })
  )
  assert.equal(r.verdict, 'caution')
})

test('vegan goal + product has milk allergen → caution', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['milk'] }),
    baseProfile({ dietGoals: ['vegan'] })
  )
  assert.equal(r.verdict, 'caution')
})

// ─── 10. Verdict priority + display logic (4 cases) ─────────────

test('danger overrides warning and caution in verdict', () => {
  const r = checkProductFit(
    baseProduct({
      allergens: ['milk'],
      dietTags: ['contains_sugar'],
      nutritionPer100: { sugar: 12 },
    }),
    baseProfile({
      allergens: ['milk'],
      healthConditions: ['diabetes'],
      dietGoals: ['sugar_free'],
    })
  )
  assert.equal(r.verdict, 'danger')
})

test('display reasons for danger include warnings too', () => {
  const r = checkProductFit(
    baseProduct({
      allergens: ['milk'],
      traces: ['eggs'],
    }),
    baseProfile({ allergens: ['milk', 'eggs'] })
  )
  assert.equal(r.verdict, 'danger')
  // Должна быть и danger (milk), и warning (eggs traces)
  assert.ok(r.reasons.some((x) => x.severity === 'danger'))
  assert.ok(r.reasons.some((x) => x.severity === 'warning'))
})

test('display reasons for safe include positive confirmation when no other reasons', () => {
  const r = checkProductFit(baseProduct(), baseProfile())
  assert.equal(r.verdict, 'safe')
  assert.ok(r.reasons.length > 0)
  assert.ok(r.reasons.every((x) => x.severity === 'safe'))
})

test('safe verdict — no allergens means positive "no allergens" confirmation', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['fish'] }),
    baseProfile({ allergens: ['milk', 'gluten'] })
  )
  assert.equal(r.verdict, 'safe')
  assert.ok(r.reasons.some((x) => x.text.includes('Не содержит ваших аллергенов')))
})

// ─── 11. Edge cases (4 cases) ───────────────────────────────────

test('empty profile + clean product → safe', () => {
  const r = checkProductFit(baseProduct(), baseProfile())
  assert.equal(r.verdict, 'safe')
  assert.equal(r.fits, true)
})

test('product with missing fields gracefully handled', () => {
  const r = checkProductFit({ ean: '123', name: 'Bare' }, baseProfile())
  assert.equal(r.verdict, 'safe')
})

test('result includes checkedAt ISO timestamp', () => {
  const r = checkProductFit(baseProduct(), baseProfile())
  assert.ok(typeof r.checkedAt === 'string')
  assert.doesNotThrow(() => new Date(r.checkedAt))
})

test('fits=true only when verdict is safe', () => {
  const safe = checkProductFit(baseProduct(), baseProfile())
  assert.equal(safe.fits, true)

  const danger = checkProductFit(
    baseProduct({ allergens: ['milk'] }),
    baseProfile({ allergens: ['milk'] })
  )
  assert.equal(danger.fits, false)
})

// ─── 12. Halal religion array compatibility (1 case) ────────────

test('profile.religion includes "halal" → halal logic activates', () => {
  const r = checkProductFit(
    baseProduct({ halalStatus: 'no' }),
    baseProfile({ religion: ['halal'] })
  )
  assert.equal(r.verdict, 'caution')
})

// ─── 13. Audit findings: расширенный словарный аудит ────────────
// Эти тесты были добавлены после системного аудита 2026-04-28,
// который выявил 8 пробелов в словарях. Каждый тест соответствует
// конкретному найденному багу (детали в docs/vault/changelog/).

// БАГ #3: diabetes раньше использовал только 3 sugar keywords
test('audit#3: diabetes detects "мальтодекстрин" in ingredients', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Мука, мальтодекстрин, соль' }),
    baseProfile({ healthConditions: ['diabetes'] })
  )
  assert.equal(r.verdict, 'warning')
})

test('audit#3: diabetes detects "декстроза" in ingredients', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Декстроза, ароматизатор' }),
    baseProfile({ healthConditions: ['diabetes'] })
  )
  assert.equal(r.verdict, 'warning')
})

test('audit#3: diabetes detects "патока" in ingredients', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Сухари, патока, дрожжи' }),
    baseProfile({ healthConditions: ['diabetes'] })
  )
  assert.equal(r.verdict, 'warning')
})

test('audit#3: diabetes detects "мёд" in ingredients', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Мёд натуральный, ароматизатор' }),
    baseProfile({ healthConditions: ['diabetes'] })
  )
  assert.equal(r.verdict, 'warning')
})

// БАГ #4: gluten не покрывал хлопья/мюсли/отруби/геркулес
test('audit#4: celiac detects "хлопья пшеничные" → danger', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Хлопья пшеничные, сахар, соль' }),
    baseProfile({ healthConditions: ['celiac'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('audit#4: celiac detects "пшеничные отруби" → danger', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Пшеничные отруби, вода' }),
    baseProfile({ healthConditions: ['celiac'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('audit#4: celiac detects "геркулес" → danger', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Геркулес, сахар, соль' }),
    baseProfile({ healthConditions: ['celiac'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('audit#4: celiac detects "мюсли" → danger', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Мюсли с фруктами, изюм' }),
    baseProfile({ healthConditions: ['celiac'] })
  )
  assert.equal(r.verdict, 'danger')
})

// БАГ #5: fish не покрывал форель/окунь/судак/хек/килька/шпрот
test('audit#5: fish allergy detects "форель" in ingredients', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Форель радужная, соль' }),
    baseProfile({ allergens: ['fish'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('audit#5: fish allergy detects "килька" in ingredients (консервы)', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Килька в томатном соусе' }),
    baseProfile({ allergens: ['fish'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('audit#5: fish allergy detects "шпроты" in ingredients', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Шпроты в масле' }),
    baseProfile({ allergens: ['fish'] })
  )
  assert.equal(r.verdict, 'danger')
})

test('audit#5: fish allergy detects "хек" in ingredients', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Филе хека замороженное' }),
    baseProfile({ allergens: ['fish'] })
  )
  assert.equal(r.verdict, 'danger')
})

// БАГ #5b: false-positive prevention
test('audit#5b: "микрокристаллическая целлюлоза" (E460) does NOT trigger fish allergy', () => {
  const r = checkProductFit(
    baseProduct({
      ingredients: 'Сахар, микрокристаллическая целлюлоза (E460), ароматизатор',
    }),
    baseProfile({ allergens: ['fish'] })
  )
  assert.equal(r.verdict, 'safe')
})

test('audit#5b: "кетчуп" does NOT trigger fish allergy', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Томатный кетчуп, специи' }),
    baseProfile({ allergens: ['fish'] })
  )
  assert.equal(r.verdict, 'safe')
})

// БАГ #6: haram keywords — расширение
test('audit#6: halal + "виски" в составе → danger', () => {
  const r = checkProductFit(
    baseProduct({
      halalStatus: 'unknown',
      ingredients: 'Шоколад, ароматизатор виски, какао',
    }),
    baseProfile({ halal: true })
  )
  assert.equal(r.verdict, 'danger')
})

test('audit#6: halal + "этанол" в составе → danger', () => {
  const r = checkProductFit(
    baseProduct({
      halalStatus: 'unknown',
      ingredients: 'Этиловый эфир, этанол как растворитель',
    }),
    baseProfile({ halal: true })
  )
  assert.equal(r.verdict, 'danger')
})

test('audit#6: halal + "шампанское" → danger', () => {
  const r = checkProductFit(
    baseProduct({
      halalStatus: 'unknown',
      ingredients: 'Конфеты с шампанским, шоколад',
    }),
    baseProfile({ halal: true })
  )
  assert.equal(r.verdict, 'danger')
})

// БАГ #6b: false-positive prevention
test('audit#6b: halal + "хром" (металл) does NOT trigger haram', () => {
  const r = checkProductFit(
    baseProduct({
      halalStatus: 'unknown',
      ingredients: 'Витамины, хромат калия, минералы',
    }),
    baseProfile({ halal: true })
  )
  assert.equal(r.verdict, 'safe')
})

test('audit#6b: halal + "ароматизатор" (без алкоголя) does NOT trigger haram', () => {
  const r = checkProductFit(
    baseProduct({
      halalStatus: 'unknown',
      ingredients: 'Сахар, ароматизатор натуральный, лимонная кислота',
    }),
    baseProfile({ halal: true })
  )
  assert.equal(r.verdict, 'safe')
})

test('audit#6b: halal + "виноград" does NOT trigger haram', () => {
  const r = checkProductFit(
    baseProduct({
      halalStatus: 'unknown',
      ingredients: 'Виноград сушёный, изюм, сахар',
    }),
    baseProfile({ halal: true })
  )
  assert.equal(r.verdict, 'safe')
})

// БАГ #7: vegan — расширенная проверка
test('audit#7: vegan + product has eggs allergen → caution', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['eggs'] }),
    baseProfile({ dietGoals: ['vegan'] })
  )
  assert.equal(r.verdict, 'caution')
  assert.ok(r.reasons.some((x) => x.text.includes('яйца')))
})

test('audit#7: vegan + product has fish allergen → caution', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['fish'] }),
    baseProfile({ dietGoals: ['vegan'] })
  )
  assert.equal(r.verdict, 'caution')
  assert.ok(r.reasons.some((x) => x.text.includes('рыба')))
})

test('audit#7: vegan + "мёд" в ingredients → caution', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Сахар, мёд натуральный, фруктоза' }),
    baseProfile({ dietGoals: ['vegan'] })
  )
  assert.equal(r.verdict, 'caution')
})

test('audit#7: vegan + "куриное филе" → caution', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Куриное филе, соль, специи' }),
    baseProfile({ dietGoals: ['vegan'] })
  )
  assert.equal(r.verdict, 'caution')
})

test('audit#7: vegan + "желатин" → caution', () => {
  const r = checkProductFit(
    baseProduct({ ingredients: 'Сахар, желатин, ароматизатор' }),
    baseProfile({ dietGoals: ['vegan'] })
  )
  assert.equal(r.verdict, 'caution')
})

// БАГ #8: dairy_free goal должен учитывать prodAllergens.includes('milk')
test('audit#8: dairy_free + product has milk allergen (без dietTags) → caution', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['milk'] }), // без dietTags
    baseProfile({ dietGoals: ['dairy_free'] })
  )
  assert.equal(r.verdict, 'caution')
})

test('audit#8: dairy_free + en:milk allergen → caution', () => {
  const r = checkProductFit(
    baseProduct({ allergens: ['en:milk'] }),
    baseProfile({ dietGoals: ['dairy_free'] })
  )
  assert.equal(r.verdict, 'caution')
})

// БАГ #1+#2 (через end-to-end): OFF allergen tag + user profile
// (нормализация уже покрыта normalizers.test.mjs, тут проверяем интеграцию)
test('audit#1+2: user with tree_nuts allergy + OFF product mapped from en:nuts → danger', () => {
  // Имитируем то, что делает normalizers.normalizeOFFProduct
  const r = checkProductFit(
    baseProduct({ allergens: ['tree_nuts'] }), // post-normalization
    baseProfile({ allergens: ['tree_nuts'] }) // user choice from profile
  )
  assert.equal(r.verdict, 'danger')
})
