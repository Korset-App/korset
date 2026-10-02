import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createIntegrationHandler } from '../../server/integration/handler.js'
import { normalizeEnvelope, envelopeHash, tokenHash } from '../../server/integration/protocol.js'
import { STORE_ID, OWNER_ID, PRODUCT_ID, envelope } from '../helpers/integrationFixtures.mjs'
import { createIntegrationTestDatabase } from '../helpers/integrationDatabase.mjs'

let db
const secret = `krt1_${'a'.repeat(64)}`
async function ingest(value, hash = tokenHash(secret)) {
  const normalized = normalizeEnvelope(value)
  const result = await db.query('select public.korset_integration_ingest($1,$2::jsonb,$3) as result', [hash, JSON.stringify(normalized), envelopeHash(normalized)])
  return result.rows[0].result
}
async function setupStore() {
  await db.exec('truncate korset_integration.owner_actions; truncate korset_integration.connections cascade; truncate public.store_products cascade;')
  await db.query('select public.korset_integration_manage($1,$2,$3,$4)', [OWNER_ID, STORE_ID, 'create', tokenHash(secret)])
}
async function resolveSource({adopt=false,revision=1,price=null,updatedAt=null,owner=OWNER_ID}={}) {
  const source=(await db.query('select id from korset_integration.source_items order by updated_at desc limit 1')).rows[0]
  return (await db.query('select public.korset_integration_resolve($1,$2,$3,$4,$5,$6,$7) as result',
    [owner,STORE_ID,source.id,revision,adopt,price,updatedAt])).rows[0].result
}

before(async () => {
  db = await createIntegrationTestDatabase()
})
after(async () => { await db?.close() })

async function withHttpServer(run,{loseResponse=false,unavailable=false}={}) {
  const client={auth:{getUser:async()=>({data:{user:{id:OWNER_ID}},error:null})},rpc:async(name,args)=>{
    if(unavailable)return {data:null,error:{code:'08006',message:'private database diagnostic'}}
    try {
      let result
      if(name==='korset_integration_ingest')result=await db.query('select public.korset_integration_ingest($1,$2::jsonb,$3) as result',[args.p_token_hash,JSON.stringify(args.p_envelope),args.p_payload_hash])
      else if(name==='korset_integration_preview')result=await db.query('select public.korset_integration_preview($1,$2::jsonb) as result',[args.p_token_hash,JSON.stringify(args.p_envelope)])
      else if(name==='korset_integration_resolve')result=await db.query('select public.korset_integration_resolve($1,$2,$3,$4,$5,$6,$7) as result',
        [args.p_owner_id,args.p_store_id,args.p_source_id,args.p_expected_revision,args.p_adopt,args.p_expected_manual_price,args.p_expected_manual_updated_at])
      else result=await db.query('select public.korset_integration_manage($1,$2,$3,$4) as result',[args.p_owner_id,args.p_store_id,args.p_action,args.p_token_hash])
      return {data:result.rows[0].result,error:null}
    } catch(error){return {data:null,error:{code:error.code,message:error.message}}}
  }}
  const handler=createIntegrationHandler({enabled:true,clientFactory:()=>client})
  const server=createServer((req,res)=>{
    req.query=Object.fromEntries(new URL(req.url,'http://localhost').searchParams)
    res.status=function(code){this.statusCode=code;return this}
    res.json=function(value){if(loseResponse){loseResponse=false;this.destroy();return this}this.setHeader('Content-Type','application/json');this.end(JSON.stringify(value));return this}
    void handler(req,res)
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  try { await run(`http://127.0.0.1:${server.address().port}/api/integration`) }
  finally { server.closeAllConnections();await new Promise(resolve=>server.close(resolve)) }
}
const post=(url,value,credential=secret)=>fetch(url,{method:'POST',headers:{authorization:`Bearer ${credential}`,'content-type':'application/json'},body:JSON.stringify(value)})

test('real HTTP lost acknowledgement after PostgreSQL commit retries exactly once',async()=>{
  await setupStore()
  await withHttpServer(async url=>{
    await assert.rejects(()=>post(url,envelope()))
    const response=await post(url,envelope());assert.equal(response.status,200)
    assert.equal((await response.json()).result.applied,1)
  },{loseResponse:true})
  assert.equal((await db.query('select count(*)::int as n from korset_integration.receipts')).rows[0].n,1)
  assert.equal((await db.query('select count(*)::int as n from public.store_products')).rows[0].n,1)
})

test('real HTTP dry-run onboarding and unavailable database never fake a successful import',async()=>{
  await setupStore()
  await withHttpServer(async url=>{
    const response=await post(url,envelope(1,{operation:'dry_run'}));assert.equal(response.status,200)
    assert.equal((await response.json()).result.matched,1)
    assert.equal((await post(url,envelope(),`krt1_${'b'.repeat(64)}`)).status,401)
    assert.equal((await post(url,envelope())).status,200)
  })
  await withHttpServer(async url=>{
    const response=await post(url,envelope(2));assert.equal(response.status,503)
    assert.deepEqual(await response.json(),{error:'INTEGRATION_UNAVAILABLE'})
  },{unavailable:true})
})

test('dry-run predicts duplicate target conflicts and pause blocks both preview and ingestion',async()=>{
  await setupStore()
  const value=envelope(1,{operation:'dry_run'});value.items.push({...value.items[0],external_id:'second-source-item'})
  const preview=async()=> (await db.query('select public.korset_integration_preview($1,$2::jsonb) as result',[tokenHash(secret),JSON.stringify(normalizeEnvelope(value))])).rows[0].result
  const result=await preview();assert.equal(result.matched,1);assert.equal(result.conflicts,1)
  value.operation='upsert';const applied=await ingest(value);assert.equal(applied.applied,1);assert.equal(applied.conflicts,1)
  value.operation='dry_run'
  await db.query('select public.korset_integration_manage($1,$2,$3,$4)',[OWNER_ID,STORE_ID,'pause',null])
  await assert.rejects(preview,/INTEGRATION_PAUSED/)
})

test('shared database limiter caps preview traffic but replayed committed requests remain recoverable',async()=>{
  await setupStore();await ingest(envelope())
  const value=JSON.stringify(normalizeEnvelope(envelope(2,{operation:'dry_run'})))
  for(let i=0;i<119;i++)await db.query('select public.korset_integration_preview($1,$2::jsonb)',[tokenHash(secret),value])
  await assert.rejects(()=>db.query('select public.korset_integration_preview($1,$2::jsonb)',[tokenHash(secret),value]),/RATE_LIMITED/)
  assert.equal((await ingest(envelope())).applied,1)
  await withHttpServer(async url=>{
    const response=await post(url,envelope(2));assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'30')
  })
  await db.exec("update korset_integration.request_windows set started_at=now()-interval '61 seconds'")
  assert.equal((await ingest(envelope(2))).applied,1)
})

test('60000 synthetic local SKUs survive batched ingestion and complete manifest with controlled rate-window time',
  {skip:process.env.KORSET_LARGE_CATALOG_TEST!=='true'},async()=>{
  await setupStore()
  const snapshot='77777777-7777-4777-8777-777777777777'
  await ingest(envelope(1,{operation:'snapshot_begin',snapshot_id:snapshot,expected_count:60000,items:[]}))
  for(let offset=0;offset<60000;offset+=200){
    if(offset%20000===0)await db.exec("update korset_integration.request_windows set started_at=now()-interval '61 seconds'")
    const value=envelope(offset/200+2,{snapshot_id:snapshot})
    value.items=Array.from({length:200},(_,i)=>({...value.items[0],external_id:`LOCAL-TEST-${offset+i}`,
      barcodes:[{kind:'local',value:`LOCAL-TEST-${offset+i}`}]}))
    assert.equal((await ingest(value)).unresolved,200)
  }
  await db.exec("update korset_integration.request_windows set started_at=now()-interval '61 seconds'")
  assert.equal((await ingest(envelope(302,{operation:'snapshot_complete',snapshot_id:snapshot,items:[]}))).deactivated,0)
  assert.equal((await db.query('select count(*)::int as n from korset_integration.source_items')).rows[0].n,60000)
  assert.equal((await db.query('select count(*)::int as n from public.store_products')).rows[0].n,0)
})

test('dry run validates without receipts, source binding or public product writes', async () => {
  await setupStore()
  const normalized=normalizeEnvelope(envelope(1,{operation:'dry_run'}))
  const result=(await db.query('select public.korset_integration_preview($1,$2::jsonb) as result',
    [tokenHash(secret),JSON.stringify(normalized)])).rows[0].result
  assert.equal(result.matched,1); assert.equal(result.applied,0); assert.equal(result.dry_run,true)
  for(const table of ['source_items','receipts','snapshots']) {
    assert.equal((await db.query(`select count(*)::int as n from korset_integration.${table}`)).rows[0].n,0)
  }
  assert.deepEqual((await db.query('select source_instance_id,last_sequence from korset_integration.connections')).rows,
    [{source_instance_id:null,last_sequence:0}])
  assert.equal((await db.query('select count(*)::int as n from public.store_products')).rows[0].n,0)
})

test('heartbeat cannot erase an outstanding source problem or report it as a successful application',async()=>{
  await setupStore()
  const value=envelope();value.items[0].barcodes=[{kind:'local',value:'LOCAL-TEST-unmatched'}]
  await ingest(value)
  const before=(await db.query('select counters,last_error_code,last_applied_at from korset_integration.connections')).rows[0]
  await ingest(envelope(2,{operation:'heartbeat',items:[]}))
  const after=(await db.query('select counters,last_error_code,last_applied_at from korset_integration.connections')).rows[0]
  assert.deepEqual(after,before);assert.equal(after.last_error_code,'ITEMS_REQUIRE_REVIEW')
  const status=(await db.query('select public.korset_integration_manage($1,$2,$3,$4) as result',[OWNER_ID,STORE_ID,'status',null])).rows[0].result
  assert.equal(status.issues[0].code,'UNKNOWN_PRODUCT')
  assert.equal(status.issues[0].name,'Source product')
  assert.equal(JSON.stringify(status).includes(secret),false)
  await assert.rejects(()=>db.query('select public.korset_integration_manage($1,$2,$3,$4)',[PRODUCT_ID,STORE_ID,'status',null]),/NOT_STORE_OWNER/)
})

test('visible price conditions exclude private fields and protect unpublished stores', async () => {
  await setupStore()
  const value=envelope(); value.items[0].price={regular_minor:123400,sale_minor:100050,
    valid_from:'2026-09-30T00:00:00.000Z',valid_until:'2026-10-02T00:00:00.000Z'}
  assert.equal((await ingest(value)).applied,1)
  await db.exec('set role anon')
  try {
    const rows=(await db.query('select public.korset_get_store_product_conditions($1,$2) as result',[STORE_ID,['5449000000996']])).rows[0].result
    assert.equal(rows[0].sale_minor,100050)
    assert.deepEqual(Object.keys(rows[0]).sort(),['applied_at','ean','observed_at','regular_minor','sale_minor','unit','valid_from','valid_until'])
  } finally { await db.exec('reset role') }
  await db.query('update public.stores set is_published=false where id=$1',[STORE_ID])
  await db.exec('set role anon')
  try { assert.deepEqual((await db.query('select public.korset_get_store_product_conditions($1,$2) as result',[STORE_ID,['5449000000996']])).rows[0].result,[]) }
  finally { await db.exec('reset role'); await db.query('update public.stores set is_published=true where id=$1',[STORE_ID]) }
})

test('applies known global item and acknowledges lost-response retries without a second write', async () => {
  await setupStore()
  const first = await ingest(envelope())
  const retry = await ingest(envelope())
  assert.deepEqual(retry, first)
  assert.equal(first.applied, 1)
  const rows = await db.query('select price_kzt,local_name from public.store_products')
  assert.deepEqual(rows.rows, [{ price_kzt: 1234, local_name: 'Source product' }])
})

test('same request key with changed content cannot corrupt existing price', async () => {
  await setupStore(); await ingest(envelope())
  const changed = envelope(); changed.items[0].price.regular_minor = 90000
  await assert.rejects(() => ingest(changed), /IDEMPOTENCY_CONFLICT/)
  assert.equal((await db.query('select price_kzt from public.store_products')).rows[0].price_kzt, 1234)
})

test('unknown GTIN stays private and never changes global facts or appears as a fake canonical product', async () => {
  await setupStore()
  const value = envelope(); value.items[0].barcodes = [{ value: 'internal-no-match', kind: 'local' }]
  const result = await ingest(value)
  assert.equal(result.unresolved, 1)
  assert.equal((await db.query('select count(*)::int as n from public.store_products')).rows[0].n, 0)
  assert.equal((await db.query('select count(*)::int as n from korset_integration.source_items')).rows[0].n, 1)
})

test('preserves manual products and exposes an explicit ownership conflict', async () => {
  await setupStore()
  await db.query("insert into public.store_products(store_id,global_product_id,ean,price_kzt) values($1,$2,'5449000000996',77)", [STORE_ID, PRODUCT_ID])
  const result = await ingest(envelope())
  assert.equal(result.conflicts, 1)
  assert.equal((await db.query('select price_kzt from public.store_products')).rows[0].price_kzt, 77)
})

test('rejects out-of-order requests and another source instance', async () => {
  await setupStore(); await ingest(envelope(2))
  await assert.rejects(() => ingest(envelope(1)), /STALE_SEQUENCE/)
  await assert.rejects(() => ingest(envelope(3, { source_instance_id: 'restored-different-source' })), /SOURCE_INSTANCE_MISMATCH/)
})

test('pause and revoke immediately stop source writes; owner identity is enforced in database', async () => {
  await setupStore()
  await assert.rejects(() => db.query('select public.korset_integration_manage($1,$2,$3,$4)', [PRODUCT_ID, STORE_ID, 'pause', null]), /NOT_STORE_OWNER/)
  await db.query('select public.korset_integration_manage($1,$2,$3,$4)', [OWNER_ID, STORE_ID, 'pause', null])
  await assert.rejects(() => ingest(envelope()), /INTEGRATION_PAUSED/)
  await db.query('select public.korset_integration_manage($1,$2,$3,$4)', [OWNER_ID, STORE_ID, 'revoke', null])
  await assert.rejects(() => ingest(envelope()), /INVALID_TOKEN/)
})

test('ordinary users cannot call privileged RPC or read private source rows', async () => {
  await setupStore()
  await db.exec('set role authenticated')
  try {
    await assert.rejects(() => db.query('select public.korset_integration_manage($1,$2,$3,$4)', [OWNER_ID, STORE_ID, 'status', null]), /permission denied/)
    await assert.rejects(() => db.query('select public.korset_integration_resolve($1,$2,$3,$4,$5,$6,$7)',
      [OWNER_ID,STORE_ID,STORE_ID,1,false,null,null]), /permission denied/)
    await assert.rejects(() => db.query('select * from korset_integration.source_items'), /permission denied/)
    await assert.rejects(() => db.query('select * from korset_integration.owner_actions'), /permission denied/)
  } finally { await db.exec('reset role') }
})

test('exact fractional prices and unknown quantities are quarantined instead of rounding or claiming availability', async () => {
  await setupStore()
  const value = envelope(); value.items[0].price.regular_minor = 123456
  assert.equal((await ingest(value)).unresolved, 1)
  assert.equal((await db.query('select count(*)::int as n from public.store_products')).rows[0].n, 0)
})

const SNAPSHOT_ID = '22222222-2222-4222-8222-222222222222'
test('incomplete snapshot and interrupted load cannot deactivate an existing product', async () => {
  await setupStore(); await ingest(envelope(1))
  await ingest(envelope(2, {operation:'snapshot_begin',snapshot_id:SNAPSHOT_ID,expected_count:2,items:[]}))
  await assert.rejects(() => ingest(envelope(3, {operation:'snapshot_complete',snapshot_id:SNAPSHOT_ID,items:[]})), /SNAPSHOT_INCOMPLETE/)
  assert.equal((await db.query('select is_active from public.store_products')).rows[0].is_active,true)
})

test('empty complete snapshot is blocked before mass deletion and remains recoverable', async () => {
  await setupStore(); await ingest(envelope(1))
  await ingest(envelope(2, {operation:'snapshot_begin',snapshot_id:SNAPSHOT_ID,expected_count:0,items:[]}))
  await assert.rejects(() => ingest(envelope(3, {operation:'snapshot_complete',snapshot_id:SNAPSHOT_ID,items:[]})), /MASS_DEACTIVATION_BLOCKED/)
  assert.equal((await db.query('select is_active from public.store_products')).rows[0].is_active,true)
})

test('delta after snapshot begins survives completion even when absent from that older snapshot', async () => {
  await setupStore(); await ingest(envelope(1))
  await ingest(envelope(2, {operation:'snapshot_begin',snapshot_id:SNAPSHOT_ID,expected_count:1,items:[]}))
  const other=envelope(3,{snapshot_id:SNAPSHOT_ID});other.items[0].external_id='new-local';other.items[0].barcodes=[{value:'LOCAL-42',kind:'local'}]
  await ingest(other)
  await ingest(envelope(4))
  await ingest(envelope(5,{operation:'snapshot_complete',snapshot_id:SNAPSHOT_ID,items:[]}))
  assert.equal((await db.query('select is_active from public.store_products')).rows[0].is_active,true)
})

test('identical unchanged delta after snapshot begins protects the item from omission',async()=>{
  await setupStore();await ingest(envelope(1))
  await ingest(envelope(2,{operation:'snapshot_begin',snapshot_id:SNAPSHOT_ID,expected_count:1,items:[]}))
  const other=envelope(3,{snapshot_id:SNAPSHOT_ID});other.items[0].external_id='new-local';other.items[0].barcodes=[{value:'LOCAL-42',kind:'local'}]
  await ingest(other)
  const unchanged=envelope(4);unchanged.items[0].revision=1
  await ingest(unchanged)
  await ingest(envelope(5,{operation:'snapshot_complete',snapshot_id:SNAPSHOT_ID,items:[]}))
  assert.equal((await db.query('select is_active from public.store_products')).rows[0].is_active,true)
})

test('revision conflict rolls back the entire batch, including already processed prices and receipt',async()=>{
  await setupStore();await ingest(envelope(1))
  const other=envelope(2);other.items[0].external_id='new-local';other.items[0].barcodes=[{value:'LOCAL-42',kind:'local'}]
  await ingest(other)
  const batch=envelope(3);batch.items[0].price.regular_minor=99000
  const conflict=structuredClone(other.items[0]);conflict.name='changed without revision'
  batch.items.push(conflict)
  await assert.rejects(()=>ingest(batch),/REVISION_CONFLICT/)
  assert.equal((await db.query('select price_kzt from public.store_products')).rows[0].price_kzt,1234)
  assert.equal((await db.query('select last_sequence::int as n from korset_integration.connections')).rows[0].n,2)
})

test('database guard blocks manual price updates and deletion but allows storefront merchandising',async()=>{
  await setupStore();await ingest(envelope(1))
  await db.exec("select set_config('request.jwt.claim.role','authenticated',false)")
  try {
    await assert.rejects(()=>db.exec('update public.store_products set price_kzt=42'),/INTEGRATION_MANAGED_FIELDS/)
    await assert.rejects(()=>db.exec('delete from public.store_products'),/INTEGRATION_MANAGED_FIELDS/)
    await assert.rejects(()=>db.exec("update public.store_products set store_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'"),/INTEGRATION_MANAGED_FIELDS/)
    await db.exec("update public.store_products set shelf_zone='A',is_featured=true")
    assert.equal((await db.query('select is_featured from public.store_products')).rows[0].is_featured,true)
  } finally {await db.exec("select set_config('request.jwt.claim.role','',false)")}
})

test('revoke releases manual field ownership and a fresh connection can be created without reviving old credentials',async()=>{
  await setupStore();await ingest(envelope(1))
  await db.query('select public.korset_integration_manage($1,$2,$3,$4)',[OWNER_ID,STORE_ID,'revoke',null])
  await db.exec("select set_config('request.jwt.claim.role','authenticated',false)")
  try {await db.exec('update public.store_products set price_kzt=99')} finally {await db.exec("select set_config('request.jwt.claim.role','',false)")}
  await db.query('select public.korset_integration_manage($1,$2,$3,$4)',[OWNER_ID,STORE_ID,'create',tokenHash(`krt1_${'b'.repeat(64)}`)])
  await assert.rejects(()=>ingest(envelope(2)),/INVALID_TOKEN/)
})

test('abort frees an incomplete snapshot so recovery can start a new generation',async()=>{
  await setupStore()
  await ingest(envelope(1,{operation:'snapshot_begin',snapshot_id:SNAPSHOT_ID,expected_count:10,items:[]}))
  await ingest(envelope(2,{operation:'snapshot_abort',snapshot_id:SNAPSHOT_ID,items:[]}))
  await ingest(envelope(3,{operation:'snapshot_begin',snapshot_id:'33333333-3333-4333-8333-333333333333',expected_count:0,items:[]}))
  assert.equal((await db.query("select count(*)::int as n from korset_integration.snapshots where status='open'")).rows[0].n,1)
})

test('owner adopts a reviewed manual row with exact price and timestamp',async()=>{
  await setupStore()
  await db.query("insert into public.store_products(store_id,global_product_id,ean,price_kzt,stock_status) values($1,$2,'5449000000996',77,'low_stock')",[STORE_ID,PRODUCT_ID])
  assert.equal((await ingest(envelope())).conflicts,1)
  const status=(await db.query('select public.korset_integration_manage($1,$2,$3,$4) as result',[OWNER_ID,STORE_ID,'status',null])).rows[0].result
  const issue=status.issues[0]
  assert.equal(issue.code,'OWNERSHIP_CONFLICT')
  assert.equal(issue.revision,1)
  assert.equal(issue.target_price_kzt,77)
  assert.equal(issue.target_stock_status,'low_stock')
  assert.equal(issue.source_regular_minor,123400)
  assert.equal(issue.source_stock_quantity,'2.50')
  assert.ok(issue.source_id && issue.target_updated_at)
  const result=await resolveSource({adopt:true,price:77,updatedAt:issue.target_updated_at})
  assert.deepEqual(result.issues,[])
  assert.equal(result.integration.last_error_code,null)
  assert.equal(result.integration.last_applied_at,null)
  const target=(await db.query('select price_kzt,sync_integration_id from public.store_products')).rows[0]
  assert.equal(target.price_kzt,1234)
  assert.ok(target.sync_integration_id)
  assert.equal((await db.query("select count(*)::int as n from korset_integration.owner_actions where action='adopt'")).rows[0].n,1)
  assert.equal(JSON.stringify((await db.query('select * from korset_integration.owner_actions')).rows).includes(secret),false)
})

test('owner can adopt an exact-EAN manual card with no prior price or global link',async()=>{
  await setupStore()
  await db.query("insert into public.store_products(store_id,ean) values($1,'5449000000996')",[STORE_ID])
  assert.equal((await ingest(envelope())).conflicts,1)
  const issue=(await db.query('select public.korset_integration_manage($1,$2,$3,$4) as result',[OWNER_ID,STORE_ID,'status',null])).rows[0].result.issues[0]
  assert.equal(issue.target_price_kzt,null)
  assert.ok(issue.target_updated_at)
  assert.deepEqual((await resolveSource({adopt:true,price:null,updatedAt:issue.target_updated_at})).issues,[])
  const row=(await db.query('select price_kzt,global_product_id from public.store_products')).rows[0]
  assert.equal(row.price_kzt,1234)
  assert.equal(row.global_product_id,PRODUCT_ID)
})

test('adoption refuses revision, price, timestamp and owner races without changing ownership',async()=>{
  await setupStore()
  await db.query("insert into public.store_products(store_id,global_product_id,ean,price_kzt,stock_status) values($1,$2,'5449000000996',77,'in_stock')",[STORE_ID,PRODUCT_ID])
  await ingest(envelope())
  const issue=(await db.query('select public.korset_integration_manage($1,$2,$3,$4) as result',[OWNER_ID,STORE_ID,'status',null])).rows[0].result.issues[0]
  await assert.rejects(()=>resolveSource({adopt:true,revision:2,price:77,updatedAt:issue.target_updated_at}),/REVISION_CONFLICT/)
  await assert.rejects(()=>resolveSource({adopt:true,price:78,updatedAt:issue.target_updated_at}),/OWNERSHIP_CONFLICT/)
  await assert.rejects(()=>resolveSource({adopt:true,price:77,updatedAt:'2020-01-01T00:00:00Z'}),/OWNERSHIP_CONFLICT/)
  await assert.rejects(()=>resolveSource({adopt:true,price:77,updatedAt:issue.target_updated_at,owner:PRODUCT_ID}),/NOT_STORE_OWNER/)
  assert.equal((await db.query('select sync_integration_id from public.store_products')).rows[0].sync_integration_id,null)
})

test('reconcile finds a newly canonical exact GTIN without changing a global product',async()=>{
  await setupStore()
  await db.query('update public.global_products set is_active=false where id=$1',[PRODUCT_ID])
  const item=envelope()
  assert.equal((await ingest(item)).unresolved,1)
  await db.query('update public.global_products set is_active=true where id=$1',[PRODUCT_ID])
  const result=await resolveSource()
  assert.deepEqual(result.issues,[])
  assert.equal((await db.query('select ean from public.global_products where id=$1',[PRODUCT_ID])).rows[0].ean,'5449000000996')
  assert.equal((await db.query("select count(*)::int as n from public.store_products where ean='5449000000996'")).rows[0].n,1)
})

test('adoption releases only a revoked source link after owner confirms current manual state',async()=>{
  await setupStore();await ingest(envelope())
  const oldId=(await db.query('select id from korset_integration.source_items')).rows[0].id
  await db.query('select public.korset_integration_manage($1,$2,$3,$4)',[OWNER_ID,STORE_ID,'revoke',null])
  await db.query('select public.korset_integration_manage($1,$2,$3,$4)',[OWNER_ID,STORE_ID,'create',tokenHash(`krt1_${'b'.repeat(64)}`)])
  await db.exec("update public.store_products set price_kzt=77,updated_at=now()")
  const fresh=envelope(1,{source_instance_id:'new-source'});fresh.items[0].external_id='fresh-id'
  assert.equal((await ingest(fresh,tokenHash(`krt1_${'b'.repeat(64)}`))).conflicts,1)
  const issue=(await db.query('select public.korset_integration_manage($1,$2,$3,$4) as result',[OWNER_ID,STORE_ID,'status',null])).rows[0].result.issues[0]
  await resolveSource({adopt:true,price:77,updatedAt:issue.target_updated_at})
  assert.equal((await db.query('select store_product_id from korset_integration.source_items where id=$1',[oldId])).rows[0].store_product_id,null)
  assert.equal((await db.query('select price_kzt from public.store_products')).rows[0].price_kzt,1234)
})

test('disabled store blocks connector ingest and preview',async()=>{
  await setupStore();await db.query('update public.stores set is_active=false where id=$1',[STORE_ID])
  await assert.rejects(()=>ingest(envelope()),/STORE_INACTIVE/)
  const preview=normalizeEnvelope(envelope(1,{operation:'dry_run'}))
  await assert.rejects(()=>db.query('select public.korset_integration_preview($1,$2::jsonb)',[tokenHash(secret),JSON.stringify(preview)]),/STORE_INACTIVE/)
  await db.query('update public.stores set is_active=true where id=$1',[STORE_ID])
})

test('source quota rejects a batch atomically at 100000 private identities',async()=>{
  await setupStore()
  await db.query(`insert into korset_integration.source_items(integration_id,external_id,variant_id,unit_id,revision,last_sequence,payload)
    select c.id,'LOCAL-QUOTA-'||n,'','unit',1,1,$1::jsonb
    from korset_integration.connections c cross join generate_series(1,99999) n`,[JSON.stringify(envelope().items[0])])
  const batch=envelope();batch.items.push({...batch.items[0],external_id:'second-over-limit'})
  await assert.rejects(()=>ingest(batch),/SOURCE_LIMIT_REACHED/)
  assert.equal((await db.query('select count(*)::int as n from korset_integration.source_items')).rows[0].n,99999)
  assert.equal((await db.query('select count(*)::int as n from public.store_products')).rows[0].n,0)
  assert.equal((await db.query('select last_sequence::int as n from korset_integration.connections')).rows[0].n,0)
  assert.equal((await db.query('select count(*)::int as n from korset_integration.receipts')).rows[0].n,0)
})

test('unsafe source projection rolls back manual ownership and audit',async()=>{
  await setupStore()
  await db.query("insert into public.store_products(store_id,global_product_id,ean,price_kzt) values($1,$2,'5449000000996',77)",[STORE_ID,PRODUCT_ID])
  const invalid=envelope();invalid.items[0].price.regular_minor=123456
  assert.equal((await ingest(invalid)).unresolved,1)
  const issue=(await db.query('select public.korset_integration_manage($1,$2,$3,$4) as result',[OWNER_ID,STORE_ID,'status',null])).rows[0].result.issues[0]
  await assert.rejects(()=>resolveSource({adopt:true,price:77,updatedAt:issue.target_updated_at}),/RESOLUTION_UNSAFE/)
  assert.equal((await db.query('select sync_integration_id,price_kzt from public.store_products')).rows[0].sync_integration_id,null)
  assert.equal((await db.query("select count(*)::int as n from korset_integration.owner_actions where action='adopt'")).rows[0].n,0)
})

test('duplicate source identity cannot claim the same manual product',async()=>{
  await setupStore()
  await db.query("insert into public.store_products(store_id,global_product_id,ean,price_kzt) values($1,$2,'5449000000996',77)",[STORE_ID,PRODUCT_ID])
  await ingest(envelope(1))
  const duplicate=envelope(2);duplicate.items[0].external_id='second-source-product'
  await ingest(duplicate)
  const issue=(await db.query('select public.korset_integration_manage($1,$2,$3,$4) as result',[OWNER_ID,STORE_ID,'status',null])).rows[0].result.issues[0]
  await assert.rejects(()=>db.query('select public.korset_integration_resolve($1,$2,$3,$4,$5,$6,$7)',
    [OWNER_ID,STORE_ID,issue.source_id,issue.revision,true,77,issue.target_updated_at]),/OWNERSHIP_CONFLICT/)
  assert.equal((await db.query('select sync_integration_id from public.store_products')).rows[0].sync_integration_id,null)
})

test('HTTP owner resolve accepts exact review fields and returns sanitized conflict',async()=>{
  await setupStore()
  await db.query("insert into public.store_products(store_id,global_product_id,ean,price_kzt) values($1,$2,'5449000000996',77)",[STORE_ID,PRODUCT_ID])
  await ingest(envelope())
  const issue=(await db.query('select public.korset_integration_manage($1,$2,$3,$4) as result',[OWNER_ID,STORE_ID,'status',null])).rows[0].result.issues[0]
  await withHttpServer(async url=>{
    const valid={action:'resolve',store_id:STORE_ID,source_id:issue.source_id,expected_revision:1,adopt:true,
      expected_manual_price:78,expected_manual_updated_at:issue.target_updated_at}
    const conflict=await post(url,valid,'owner-jwt')
    assert.equal(conflict.status,409)
    assert.deepEqual(await conflict.json(),{error:'OWNERSHIP_CONFLICT'})
    const invalid=await post(url,{...valid,extra:'private'},'owner-jwt')
    assert.equal(invalid.status,400)
    assert.deepEqual(await invalid.json(),{error:'INVALID_ACTION'})
  })
})
