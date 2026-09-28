import assert from 'node:assert/strict'
import test from 'node:test'
import { parseKdvGroupCatalog } from '../../scripts/utils/kdvGroupCatalogParser.mjs'

test('extracts separate official product blocks without crossing into next product', () => {
  const html = `<li data-offerid="1"><h1>Печенье «Яшкино»</h1><h2>Яблоко</h2>
    <div class="composition__content" data-id="composition-content">Состав: мука, яблоко.</div>
    <th>Вес<br>товара</th><th>Кол-во<br>в коробке</th><tr><td><!-- Вес товара--><strong>137</strong><span>г</span></td></tr>
    <th>Белки</th><th>Жиры</th><th>Углеводы</th><th>Калорий на 100&nbsp;г</th>
    <td><strong>3.5</strong><span>г</span></td><td><strong>14</strong><span>г</span></td><td><strong>67</strong><span>г</span></td><td><strong>410</strong><span>ккал</span></td>
    </li><li data-offerid="2"><h1>Печенье «Яшкино»</h1><h2>Шоколад</h2>
    <div class="composition__content" data-id="composition-content">Состав: мука, какао.</div></li>`
  const products = parseKdvGroupCatalog(html, 'https://kdv-group.com/ru/catalog/388')
  assert.equal(products.length, 2)
  assert.equal(products[0].sourceId, '1')
  assert.equal(products[0].ingredients_raw, 'мука, яблоко.')
  assert.equal(products[0].package_quantity_raw, '137 г')
  assert.deepEqual(products[0].nutriments_json, { energy_kcal: 410, protein_100g: 3.5, fat_100g: 14, carbohydrates_100g: 67 })
  assert.equal(products[1].ingredients_raw, 'мука, какао.')
  assert.equal(products[1].nutriments_json, null)
})
