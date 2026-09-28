import assert from 'node:assert/strict'
import test from 'node:test'
import { parseRakhatProduct } from '../../scripts/utils/rakhatCatalogParser.mjs'

test('extracts official composition and per-100g nutrition from product tab', () => {
  const html = `<section class=section-product><h1 class="page-title">Рахат</h1><div class=product-description>
    <div class="tab-pane active" id=1><p>С нежной начинкой.</p><span class=product-sku>№654</span></div>
    <div class="tab-pane fade" id=2><p>Пищевая ценность в 100г продукта:<br>
    Энергетическая ценность 1902 кДж Калорийность 454 ккал<br>Белков 2,7 г<br>Жиров 21,1 г<br>Углеводов 66,8 г<br>
    Состав: сахар, какао масло; молоко.<br>Хранить при 18°C.<br>Срок хранения: 8 месяцев</p></div></div></section>`
  const product = parseRakhatProduct(html, 'https://www.rakhat.kz/products/candies/konfety-s-nachinkoj/rahat-6/')
  assert.equal(product.name, 'Рахат')
  assert.equal(product.sourceId, '/products/candies/konfety-s-nachinkoj/rahat-6/')
  assert.equal(product.manufacturer_sku, '654')
  assert.equal(product.ingredients_raw, 'сахар, какао масло; молоко.')
  assert.deepEqual(product.nutriments_json, { energy_kcal: 454, protein_100g: 2.7, fat_100g: 21.1, carbohydrates_100g: 66.8 })
  assert.equal(product.shelf_life_raw, '8 месяцев')
  const alternative = parseRakhatProduct(html.replace('Энергетическая ценность 1902 кДж Калорийность 454 ккал', 'Энергетическая ценность 454ккал,'), 'https://www.rakhat.kz/products/candies/konfety-s-nachinkoj/rahat-6/')
  assert.equal(alternative.nutriments_json.energy_kcal, 454)
  const compact = parseRakhatProduct(html
    .replace('Энергетическая ценность 1902 кДж Калорийность 454 ккал', 'Энергетическая ценность 1902кДж/454ккал')
    .replace('Белков 2,7 г', 'белки 2,7 г')
    .replace('Жиров 21,1 г', 'жиры 21,1 г')
    .replace('Углеводов 66,8 г', 'углеводы 66,8 г'), 'https://www.rakhat.kz/products/candies/konfety-s-nachinkoj/rahat-6/')
  assert.deepEqual(compact.nutriments_json, product.nutriments_json)
  const paragraphs = parseRakhatProduct(html.replace('id=2><p>Пищевая', 'id=2><p>Пищевая').replace('продукта:<br>', 'продукта:</p><p>'), 'https://www.rakhat.kz/products/candies/konfety-s-nachinkoj/rahat-6/')
  assert.deepEqual(paragraphs.nutriments_json, product.nutriments_json)
  assert.equal(paragraphs.ingredients_raw, product.ingredients_raw)
  const slash = parseRakhatProduct(html
    .replace('Энергетическая ценность 1902 кДж Калорийность 454 ккал', 'Энергетическая ценность (калорийность), кДж/ккал 1902/454')
    .replace('Белков 2,7 г', 'Белков – 2,7 г'), 'https://www.rakhat.kz/products/candies/konfety-s-nachinkoj/rahat-6/')
  assert.deepEqual(slash.nutriments_json, product.nutriments_json)
})
