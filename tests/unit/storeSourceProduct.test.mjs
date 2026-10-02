import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSourceCard, getProductRef } from '../../src/domain/product/storeSourceProduct.js'
import { coerceProductEntity } from '../../src/domain/product/normalizers.js'
import { checkProductFit } from '../../src/utils/fitCheck.js'
import { applySyncedConditions, applySyncedRegularFallback } from '../../src/domain/product/syncedConditions.js'

const sourceId='11111111-1111-4111-8111-111111111111'
const row={store_source_item_id:sourceId,store_id:'store',name:'Local food',ean:null,unit:'kg',regular_minor:123456,
  stock_status:'in_stock',observed_at:'2026-10-01T12:00:00Z',global_product:null,needs_enrichment:true}

test('local item has a stable store reference without a fabricated EAN or safety facts',()=>{
  const product=normalizeSourceCard(row,'2026-10-01T12:01:00Z')
  assert.equal(getProductRef(product),`si:${sourceId}`);assert.equal(product.ean,null)
  assert.equal(product.priceKzt,1234.56);assert.equal(product.saleUnit,'kg');assert.equal(product.needsEnrichment,true)
  assert.deepEqual(product.dietTags,[]);assert.equal(product.halalStatus,'unknown');assert.equal(product.ingredients,null)
  assert.equal(checkProductFit(product,{allergens:['milk']}).fits,false)
  assert.equal(checkProductFit(product,{}).verdict,'warning')
  const coerced=coerceProductEntity(product)
  assert.equal(coerced.storeSourceItemId,sourceId);assert.equal(getProductRef(coerced),`si:${sourceId}`)
})

test('old or unconfirmed source time cannot claim fresh availability',()=>{
  for(const observed_at of ['2020-01-01T00:00:00Z',null]) {
    const product=normalizeSourceCard({...row,observed_at},'2026-10-01T12:01:00Z')
    assert.equal(product.conditionsStale,true);assert.equal(product.stockStatus,'unknown')
  }
})

test('a cached or aging source card loses its confirmed stock state',()=>{
  const product=normalizeSourceCard(row,'2026-10-01T12:01:00Z')
  assert.equal(applySyncedRegularFallback(product).stockStatus,'unknown')
  assert.equal(applySyncedConditions(product,undefined,'2026-10-01T12:31:00Z').stockStatus,'unknown')
})

test('a weighted source card retains verified global facts and applies exact timed promotions',()=>{
  const product=normalizeSourceCard({...row,ean:'5449000000996',needs_enrichment:false,
    global_product:{id:'22222222-2222-4222-8222-222222222222',ean:'5449000000996',name:'Verified name',ingredients_raw:'Water'},
    sale_minor:99999,valid_from:'2026-10-01T12:00:00Z',valid_until:'2026-10-01T12:10:00Z'},'2026-10-01T12:01:00Z')
  assert.equal(product.priceKzt,999.99);assert.equal(product.ingredients,'Water')
  assert.equal(product.ean,'5449000000996');assert.equal(getProductRef(product),`si:${sourceId}`)
})
