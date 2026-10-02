import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createIntegrationTestDatabase } from '../helpers/integrationDatabase.mjs'
import { STORE_ID, OWNER_ID, PRODUCT_ID, envelope } from '../helpers/integrationFixtures.mjs'
import { normalizeEnvelope, tokenHash, envelopeHash } from '../../server/integration/protocol.js'

let db
const hash = tokenHash(`krt1_${'a'.repeat(64)}`)
before(async () => {
  db = await createIntegrationTestDatabase()
})
after(async () => { await db?.close() })

async function reset() {
  await db.exec('truncate korset_integration.owner_actions; truncate korset_integration.connections cascade; truncate public.store_products cascade;')
  await db.query('select public.korset_integration_manage($1,$2,$3,$4)', [OWNER_ID, STORE_ID, 'create', hash])
}
async function ingest(value) {
  const normalized = normalizeEnvelope(value)
  return (await db.query('select public.korset_integration_ingest($1,$2::jsonb,$3) as result',
    [hash, JSON.stringify(normalized), envelopeHash(normalized)])).rows[0].result
}
async function status() {
  return (await db.query('select public.korset_integration_manage($1,$2,$3) as result', [OWNER_ID, STORE_ID, 'status'])).rows[0].result
}

test('preview recognises a manual exact barcode without a global link as an ownership conflict', async () => {
  await reset()
  await db.query("insert into public.store_products(store_id,ean,price_kzt,stock_status) select $1,ean,777,'in_stock' from public.global_products where id=$2", [STORE_ID, PRODUCT_ID])
  const preview = normalizeEnvelope(envelope(1, { operation: 'dry_run' }))
  const result = (await db.query('select public.korset_integration_preview($1,$2::jsonb) as result', [hash, JSON.stringify(preview)])).rows[0].result
  assert.equal(result.matched, 0)
  assert.equal(result.conflicts, 1)
  assert.equal((await ingest(envelope())).conflicts, 1)
})

test('complete snapshot retains full assortment statistics after its final empty command', async () => {
  await reset()
  const snapshot = '22222222-2222-4222-8222-222222222222'
  await ingest(envelope(1, { operation: 'snapshot_begin', snapshot_id: snapshot, expected_count: 2, items: [] }))
  const batch = envelope(2, { snapshot_id: snapshot })
  batch.items.push({ ...batch.items[0], external_id: 'local-source', barcodes: [{ value: '000042', kind: 'local' }] })
  await ingest(batch)
  await ingest(envelope(3, { operation: 'snapshot_complete', snapshot_id: snapshot, items: [] }))
  const state = await status()
  assert.equal(state.integration.report.total, 2)
  assert.equal(state.integration.report.matched, 1)
  assert.equal(state.integration.report.needs_enrichment, 1)
  assert.equal(state.integration.last_snapshot.status, 'complete')
  assert.equal(state.integration.last_snapshot.report.total, 2)
})

test('owner can page every unresolved position and exact stock without exposing the queue to another owner', async () => {
  await reset()
  const batch = envelope()
  batch.items = Array.from({ length: 55 }, (_, index) => ({ ...batch.items[0], external_id: `local-${index}`, barcodes: [] }))
  await ingest(batch)
  const first = (await db.query('select public.korset_integration_issues($1,$2,$3,$4,$5) as result', [OWNER_ID, STORE_ID, null, 50, null])).rows[0].result
  assert.equal(first.items.length, 50)
  assert.equal(first.total, 55)
  const second = (await db.query('select public.korset_integration_issues($1,$2,$3,$4,$5) as result', [OWNER_ID, STORE_ID, first.next_cursor, 50, null])).rows[0].result
  assert.equal(second.items.length, 5)
  assert.equal(new Set([...first.items, ...second.items].map((row) => row.source_id)).size, 55)
  assert.equal(first.items[0].source_stock_quantity, '2.50')
  await assert.rejects(() => db.query('select public.korset_integration_issues($1,$2,$3,$4,$5)', [PRODUCT_ID, STORE_ID, null, 50, null]), /NOT_STORE_OWNER/)
})

function complete(sequence = 1) {
  const value = envelope(sequence)
  value.protocol_version = 2
  Object.assign(value.items[0], { currency: 'KZT', observed_at: '2026-10-01T12:00:00Z' })
  return value
}

test('unknown and weighted source cards are published with stable identities and exact unit prices', async () => {
  await reset()
  const value = complete()
  value.items[0].stock = { quantity: '5.250', unit: 'kg' }
  value.items[0].price.regular_minor = 123456
  value.items.push({ ...value.items[0], external_id: 'store-own', item_kind: 'own_production', barcodes: [] })
  const received = await ingest(value)
  assert.equal(received.applied, 2)
  const getCards = async () => (await db.query('select public.korset_get_store_source_cards($1) as result', [STORE_ID])).rows[0].result
  const cards = await getCards()
  assert.equal(cards.length, 2)
  assert.equal(cards[0].regular_minor, 123456)
  assert.equal(cards[0].unit, 'kg')
  assert.ok(cards.every((row) => !Object.hasOwn(row, 'stock_quantity')))
  assert.equal((await status()).integration.report.published, 2)
  const next = complete(2)
  next.items = value.items.map((row) => ({ ...row, revision: 2, price: { regular_minor: 140000, sale_minor: null } }))
  await ingest(next)
  assert.deepEqual((await getCards()).map((row) => row.store_source_item_id).sort(), cards.map((row) => row.store_source_item_id).sort())
  await db.query('update public.stores set is_published=false where id=$1', [STORE_ID])
  try { assert.deepEqual(await getCards(), []) }
  finally { await db.query('update public.stores set is_published=true where id=$1', [STORE_ID]) }
})

test('complete preview predicts local weighted publication instead of claiming unsupported precision', async () => {
  await reset()
  const value = complete()
  value.items[0].stock.unit = 'kg'
  value.items[0].price.regular_minor = 123456
  value.operation = 'dry_run'
  const normalized = normalizeEnvelope(value)
  const predicted = (await db.query('select public.korset_integration_preview($1,$2::jsonb) as result', [hash, JSON.stringify(normalized)])).rows[0].result
  assert.equal(predicted.matched, 1)
  assert.equal(predicted.items[0].code, 'MATCHED')
  value.operation = 'upsert'
  assert.equal((await ingest(value)).applied, 1)
})

test('replaying a receipt cannot revive a source position omitted by a newer complete snapshot', async () => {
  await reset()
  const value = complete()
  value.items[0].barcodes = []
  value.items.push({...value.items[0],external_id:'kept-source'})
  await ingest(value)
  const snapshot = '33333333-3333-4333-8333-333333333333'
  await ingest(envelope(2, { operation: 'snapshot_begin', snapshot_id: snapshot, expected_count: 1, items: [] }))
  await ingest({...value,sequence:3,request_id:envelope(3).request_id,snapshot_id:snapshot,items:[value.items[1]]})
  await ingest(envelope(4, { operation: 'snapshot_complete', snapshot_id: snapshot, items: [] }))
  assert.equal((await status()).integration.report.total, 1)
  await ingest(value)
  assert.equal((await status()).integration.report.total, 1)
  const returned={...value,sequence:5,request_id:envelope(5).request_id,items:[{...value.items[0],revision:2}]}
  assert.equal((await ingest(returned)).applied,1)
})

test('mass omission protection includes basic source cards',async()=>{
  await reset()
  const value=complete()
  value.items=Array.from({length:12},(_,index)=>({...value.items[0],external_id:`local-${index}`,barcodes:[]}))
  await ingest(value)
  const snapshot='44444444-4444-4444-8444-444444444444'
  await ingest(envelope(2,{operation:'snapshot_begin',snapshot_id:snapshot,expected_count:1,items:[]}))
  await ingest({...value,sequence:3,request_id:envelope(3).request_id,snapshot_id:snapshot,items:[value.items[0]]})
  await assert.rejects(ingest(envelope(4,{operation:'snapshot_complete',snapshot_id:snapshot,items:[]})),/MASS_DEACTIVATION_BLOCKED/)
  assert.equal((await status()).integration.report.published,12)
})

test('legacy-compatible V2 prices retain source freshness rather than receipt time',async()=>{
  await reset()
  const value=complete();value.items[0].observed_at='2020-01-01T00:00:00Z'
  await ingest(value)
  const result=(await db.query('select public.korset_get_store_product_conditions($1,$2) as result',[STORE_ID,['5449000000996']])).rows[0].result
  assert.equal(result[0].observed_at,'2020-01-01T00:00:00.000Z')
})

test('local barcode lookup is exact, scoped to a published store and refuses ambiguity',async()=>{
  await reset()
  const value=complete();value.items[0].barcodes=[{kind:'local',value:'000042'}]
  await ingest(value)
  const lookup=async(code,store=STORE_ID)=>(await db.query('select public.korset_find_store_source_card($1,$2) as result',[store,code])).rows[0].result
  assert.equal((await lookup('000042'))[0].name,'Source product')
  assert.deepEqual(await lookup('42'),[]);assert.deepEqual(await lookup('000042',PRODUCT_ID),[])
  const next=complete(2);next.items=[{...value.items[0],external_id:'second',revision:1}]
  await ingest(next)
  assert.deepEqual(await lookup('000042'),[])
})

test('source shopping references preserve real EANs and enforce user and store isolation',async()=>{
  await reset()
  const value=complete();value.items[0].barcodes=[]
  await ingest(value)
  const source=(await db.query('select id from korset_integration.source_items')).rows[0].id
  await db.query('insert into public.stores(id,owner_id) values($1,$2)',[PRODUCT_ID,OWNER_ID])
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${OWNER_ID}';`)
  try {
    await db.query('insert into public.store_source_shopping_items(user_id,store_id,store_source_item_id) values($1,$2,$3)',[OWNER_ID,STORE_ID,source])
    assert.equal((await db.query('select count(*)::int as n from public.store_source_shopping_items')).rows[0].n,1)
    await assert.rejects(db.query('insert into public.store_source_shopping_items(user_id,store_id,store_source_item_id) values($1,$2,$3)',[OWNER_ID,PRODUCT_ID,source]),/SOURCE_NOT_AVAILABLE/)
    await db.exec(`set request.jwt.claim.sub='${PRODUCT_ID}';`)
    assert.equal((await db.query('select count(*)::int as n from public.store_source_shopping_items')).rows[0].n,0)
    await assert.rejects(db.query('insert into public.store_source_shopping_items(user_id,store_id,store_source_item_id) values($1,$2,$3)',[OWNER_ID,STORE_ID,source]),/row-level security/)
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub;')
    await db.query('delete from public.stores where id=$1',[PRODUCT_ID])
  }
})
