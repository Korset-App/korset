import test from 'node:test'
import assert from 'node:assert/strict'
import { createIntegrationHandler } from '../../server/integration/handler.js'
import { envelope, STORE_ID, OWNER_ID } from '../helpers/integrationFixtures.mjs'

function response() {
  return { headers: {}, statusCode: 200, setHeader(k,v) { this.headers[k]=v }, status(v) { this.statusCode=v; return this }, json(v) { this.body=v; return this } }
}
function harness(options={}) {
  const calls=[]
  const client={ auth:{getUser:async()=>({data:{user:{id:OWNER_ID}},error:null})},
    rpc:async(name,args)=>{calls.push({name,args});return {data:{applied:1},error:null}} }
  return {handler:createIntegrationHandler({enabled:true,clientFactory:()=>client,...options}),calls}
}

test('connector auth is hashed and receipt includes the exact request id after successful DB commit', async()=>{
  const {handler,calls}=harness();const res=response()
  const secret=`krt1_${'a'.repeat(64)}`
  await handler({method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/json'},body:envelope()},res)
  assert.equal(res.statusCode,200);assert.equal(res.body.request_id,envelope().request_id)
  assert.equal(calls[0].name,'korset_integration_ingest');assert.notEqual(calls[0].args.p_token_hash,secret)
  assert.equal(JSON.stringify(calls).includes(secret),false)
})

test('disabled deployment never creates a connection or accepts a source batch',async()=>{
  const {handler,calls}=harness({enabled:false});const res=response()
  await handler({method:'POST',headers:{},body:envelope()},res)
  assert.equal(res.statusCode,501);assert.equal(calls.length,0)
})

test('owner operations use verified user id and issue the secret only on create or rotate',async()=>{
  const {handler,calls}=harness();const res=response()
  await handler({method:'POST',headers:{authorization:'Bearer valid-user-jwt','content-type':'application/json'},body:{action:'create',store_id:STORE_ID}},res)
  assert.equal(res.statusCode,200);assert.match(res.body.token,/^krt1_[a-f0-9]{64}$/)
  assert.equal(calls[0].args.p_owner_id,OWNER_ID);assert.equal(calls[0].args.p_store_id,STORE_ID)
  assert.notEqual(calls[0].args.p_token_hash,res.body.token)
})

test('missing bearer, malformed JSON and oversized bodies fail before RPC',async()=>{
  const {handler,calls}=harness()
  for (const req of [{method:'GET',headers:{},query:{store_id:STORE_ID}},
    {method:'POST',headers:{authorization:'Bearer valid-user-jwt','content-type':'application/json'},body:'{'},
    {method:'POST',headers:{authorization:'Bearer valid-user-jwt','content-type':'application/json'},body:'x'.repeat(1024*1024+1)}]) {
    const res=response();await handler(req,res);assert.ok(res.statusCode>=400)
  }
  assert.equal(calls.length,0)
})

test('invalid user token never allows the owner RPC',async()=>{
  const client={auth:{getUser:async()=>({data:{user:null},error:{message:'secret diagnostic'}})},rpc:()=>assert.fail('not authorized')}
  const {handler}=harness({clientFactory:()=>client});const res=response()
  await handler({method:'GET',headers:{authorization:'Bearer invalid'},query:{store_id:STORE_ID}},res)
  assert.equal(res.statusCode,401);assert.equal(JSON.stringify(res.body).includes('secret diagnostic'),false)
})

test('DB conflicts and rate limits are clear sanitized responses and never success acknowledgements',async()=>{
  for(const [message,status] of [['IDEMPOTENCY_CONFLICT',409],['INTEGRATION_PAUSED',403],['RATE_LIMITED',429]]) {
    const {handler}=harness({clientFactory:()=>({rpc:async()=>({error:{message:`${message} extra private details`},data:null})})});const res=response()
    await handler({method:'POST',headers:{authorization:`Bearer krt1_${'a'.repeat(64)}`,'content-type':'application/json'},body:envelope()},res)
    assert.equal(res.statusCode,status);assert.equal(res.body.error,message)
    assert.equal(JSON.stringify(res.body).includes('private'),false)
    if(status===429)assert.equal(res.headers['Retry-After'],'30')
  }
})
