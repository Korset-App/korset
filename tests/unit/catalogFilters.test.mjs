import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_CATALOG_FILTERS,
  applyCatalogExtraFilters,
} from '../../src/hooks/useCatalogFilter.js'

describe('Catalog Filters (useCatalogFilter domain logic)', () => {
  const sampleProducts = [
    {
      ean: '1001',
      name: 'Молоко Айналайын 3.2%',
      category: 'dairy',
      subcategory: 'milk',
      price: 540,
      old_price: 600,
      halal: true,
      image: 'https://example.com/milk.jpg',
      in_stock: true,
    },
    {
      ean: '1002',
      name: 'Шоколад Без Сахара Рахат',
      category: 'confectionery',
      subcategory: 'chocolate',
      price: 850,
      halal: true,
      diet_flags: ['sugar_free'],
      image: 'https://example.com/chocolate.jpg',
      in_stock: true,
    },
    {
      ean: '1003',
      name: 'Сыр Безлактозный 45%',
      category: 'dairy',
      subcategory: 'cheese',
      price: 1400,
      lactose_free: true,
      diet_flags: ['lactose_free'],
      image: null,
      in_stock: true,
    },
    {
      ean: '1004',
      name: 'Хлеб Безглютеновый',
      category: 'bakery',
      subcategory: 'bread',
      price: 750,
      oldPrice: 850,
      gluten_free: true,
      image: 'https://example.com/bread.jpg',
      in_stock: false,
    },
    {
      ean: '1005',
      name: 'Колбаса Свиная Обычная',
      category: 'meat',
      subcategory: 'sausage',
      price: 2100,
      halal: false,
      image: 'https://example.com/sausage.jpg',
      stock_quantity: 0,
    },
  ]

  it('DEFAULT_CATALOG_FILTERS has all flags off', () => {
    assert.deepEqual(DEFAULT_CATALOG_FILTERS, {
      halalOnly: false,
      sugarFree: false,
      lactoseFree: false,
      glutenFree: false,
      onSaleOnly: false,
      inStockOnly: false,
      withPhotoOnly: false,
    })
  })

  it('returns original products when filters are default or empty', () => {
    const res = applyCatalogExtraFilters(sampleProducts, DEFAULT_CATALOG_FILTERS)
    assert.equal(res.length, sampleProducts.length)

    const nullRes = applyCatalogExtraFilters(sampleProducts, null)
    assert.equal(nullRes.length, sampleProducts.length)
  })

  it('filters halal products only when halalOnly is enabled', () => {
    const res = applyCatalogExtraFilters(sampleProducts, {
      ...DEFAULT_CATALOG_FILTERS,
      halalOnly: true,
    })
    const eans = res.map((p) => p.ean)
    assert.ok(eans.includes('1001'))
    assert.ok(eans.includes('1002'))
    assert.ok(!eans.includes('1005'))
  })

  it('filters sugar-free products when sugarFree is enabled', () => {
    const res = applyCatalogExtraFilters(sampleProducts, {
      ...DEFAULT_CATALOG_FILTERS,
      sugarFree: true,
    })
    const eans = res.map((p) => p.ean)
    assert.ok(eans.includes('1002'))
    assert.ok(!eans.includes('1001'))
    assert.ok(!eans.includes('1005'))
  })

  it('filters lactose-free products when lactoseFree is enabled', () => {
    const res = applyCatalogExtraFilters(sampleProducts, {
      ...DEFAULT_CATALOG_FILTERS,
      lactoseFree: true,
    })
    const eans = res.map((p) => p.ean)
    assert.ok(eans.includes('1003'))
    assert.ok(!eans.includes('1001'))
  })

  it('filters gluten-free products when glutenFree is enabled', () => {
    const res = applyCatalogExtraFilters(sampleProducts, {
      ...DEFAULT_CATALOG_FILTERS,
      glutenFree: true,
    })
    const eans = res.map((p) => p.ean)
    assert.ok(eans.includes('1004'))
    assert.ok(!eans.includes('1001'))
  })

  it('filters discounted products when onSaleOnly is enabled', () => {
    const res = applyCatalogExtraFilters(sampleProducts, {
      ...DEFAULT_CATALOG_FILTERS,
      onSaleOnly: true,
    })
    const eans = res.map((p) => p.ean)
    assert.ok(eans.includes('1001')) // old_price: 600 > 540
    assert.ok(eans.includes('1004')) // oldPrice: 850 > 750
    assert.ok(!eans.includes('1002'))
    assert.ok(!eans.includes('1003'))
  })

  it('filters in-stock products when inStockOnly is enabled', () => {
    const res = applyCatalogExtraFilters(sampleProducts, {
      ...DEFAULT_CATALOG_FILTERS,
      inStockOnly: true,
    })
    const eans = res.map((p) => p.ean)
    assert.ok(eans.includes('1001'))
    assert.ok(eans.includes('1002'))
    assert.ok(eans.includes('1003'))
    assert.ok(!eans.includes('1004')) // in_stock: false
    assert.ok(!eans.includes('1005')) // stock_quantity: 0
  })

  it('filters products with photo when withPhotoOnly is enabled', () => {
    const res = applyCatalogExtraFilters(sampleProducts, {
      ...DEFAULT_CATALOG_FILTERS,
      withPhotoOnly: true,
    })
    const eans = res.map((p) => p.ean)
    assert.ok(eans.includes('1001'))
    assert.ok(eans.includes('1002'))
    assert.ok(eans.includes('1004'))
    assert.ok(!eans.includes('1003')) // image: null
  })

  it('handles combination of filters', () => {
    // Halal + In Stock + With Photo + On Sale
    const res = applyCatalogExtraFilters(sampleProducts, {
      ...DEFAULT_CATALOG_FILTERS,
      halalOnly: true,
      inStockOnly: true,
      withPhotoOnly: true,
      onSaleOnly: true,
    })
    assert.equal(res.length, 1)
    assert.equal(res[0].ean, '1001')
  })
})
