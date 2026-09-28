import assert from 'node:assert/strict'
import test from 'node:test'
import { parseFoodmasterProduct } from '../../scripts/utils/foodmasterCatalogParser.mjs'

test('extracts manufacturer nutrition without treating description as ingredients', () => {
  const html = `<section class="productPage"><h1>FoodMaster Молоко 2,5%</h1><figure><img src="/static/upload/Milk_25.png"></figure>
  <p>Молоко от FoodMaster — натуральный источник белка.</p>
  <h2>Пищевая ценность на 100 г продукта:</h2><span>2,5 г</b> – жир</span><span>2,8 г</b> – белок</span><span>4,6 г</b> – углеводы</span>
  <h3>Энергетическая ценность на 100 г (калорийность):</h3><span>52,0 ккал | 218,0 кДж</span>
  <h4>Срок хранения:</h4><span>10 дней</span><h4>Температура хранения:</h4><span>4+2°С</span>
  <h4>Упаковка:</h4><span>1000 кг | Пауч</span></section>`
  const product = parseFoodmasterProduct(html, 'https://foodmaster.kz/ru/catalog/foodmaster-moloko-25-7')
  assert.equal(product.name, 'FoodMaster Молоко 2,5%')
  assert.equal(product.ingredients_raw, null)
  assert.deepEqual(product.nutriments_json, { energy_kcal: 52, protein_100g: 2.8, fat_100g: 2.5, carbohydrates_100g: 4.6 })
  assert.equal(product.package_quantity_raw, '1000 кг | Пауч')
  assert.equal(product.package_quantity_suspect, true)
  const ordinary = parseFoodmasterProduct(html.replace('1000 кг | Пауч', '0,900 кг | Пауч'), 'https://foodmaster.kz/ru/catalog/foodmaster-moloko-25-7')
  assert.equal(ordinary.package_quantity_suspect, false)
})
