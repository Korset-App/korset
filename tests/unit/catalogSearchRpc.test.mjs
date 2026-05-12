import test from 'node:test'
import assert from 'node:assert/strict'
import { mapSearchRowToProduct } from '../../src/domain/product/searchMapping.js'

test('mapSearchRowToProduct maps RPC row to catalog product contract', () => {
  const product = mapSearchRowToProduct({
    id: 'store-product-1',
    ean: '4870000000001',
    local_name: 'Локальное молоко',
    price_kzt: 799,
    shelf_zone: 'A1',
    shelf_position: 'верх',
    stock_status: 'in_stock',
    search_rank: '512.5',
    match_type: 'fts_name',
    global_products: {
      id: 'global-product-1',
      ean: '4870000000000',
      alternate_eans: ['4870000000001'],
      name: 'Молоко 3.2%',
      name_kz: 'Сүт 3.2%',
      brand: 'Test Brand',
      category: 'dairy_eggs',
      subcategory: 'milk',
      quantity: '1 л',
      group: 'dairy',
      ingredients_raw: 'молоко нормализованное',
      ingredients_kz: 'сүт',
      allergens_json: ['milk'],
      diet_tags_json: ['vegetarian'],
      tags_json: ['fresh'],
      additives_tags_json: [],
      traces_json: ['nuts'],
      categories_tags_json: ['dairy'],
      halal_status: 'yes',
      packaging_type: 'tetrapak',
      fat_percent: 3.2,
      nutriscore: 'B',
      nutriments_json: { kcal: 60 },
      alcohol_100g: 0,
      saturated_fat_100g: 2,
      nova_group: 1,
      image_url: 'https://cdn.korset.app/products/4870000000000.png',
      images: ['https://cdn.korset.app/products/4870000000000.png'],
      manufacturer: 'Test Factory',
      country_of_origin: 'KZ',
      specs_json: { storage: 'cold' },
      data_quality_score: 90,
      source_confidence: 0.95,
    },
  })

  assert.equal(product.ean, '4870000000000')
  assert.equal(product.name, 'Локальное молоко')
  assert.equal(product.nameKz, 'Сүт 3.2%')
  assert.equal(product.brand, 'Test Brand')
  assert.equal(product.priceKzt, 799)
  assert.equal(product.shelf, 'A1 / верх')
  assert.equal(product.stockStatus, 'in_stock')
  assert.equal(product.storeProductId, 'store-product-1')
  assert.equal(product.globalProductId, 'global-product-1')
  assert.equal(product.source, 'search_rpc')
  assert.equal(product.searchRank, 512.5)
  assert.equal(product.matchType, 'fts_name')
  assert.deepEqual(product.searchMeta, {
    source: 'search_rpc',
    matchType: 'fts_name',
    matchGroup: 'text',
    rank: 512.5,
    rankBucket: 'high',
  })
  assert.deepEqual(product.allergens, ['milk'])
  assert.deepEqual(product.dietTags, ['vegetarian'])
  assert.deepEqual(product.traces, ['nuts'])
  assert.deepEqual(product.alternateEans, ['4870000000001'])
  assert.equal(product.halalStatus, 'yes')
  assert.equal(product.packagingType, 'tetrapak')
  assert.equal(product.fatPercent, 3.2)
  assert.equal(product.qualityScore, 90)
  assert.equal(product.sourceConfidence, 0.95)
})
