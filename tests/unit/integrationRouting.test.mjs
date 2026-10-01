import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import handler from '../../api/admin-stores.js'

function response() {
  return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},
    status(v){this.statusCode=v;return this},
    json(v){this.body=v;return this},send(v){this.body=v;return this}}
}

test('integration rewrite fits the existing twelve-function deployment budget',async()=>{
  const config=JSON.parse(await readFile(new URL('../../vercel.json',import.meta.url),'utf8'))
  assert.deepEqual(config.rewrites.find(rule=>rule.source==='/api/integration'),
    {source:'/api/integration',destination:'/api/admin-stores?route=integration'})
  assert.ok((await readdir(new URL('../../api/',import.meta.url))).filter(name=>name.endsWith('.js')).length<=12)
})

test('shared integration dispatch preserves the activation and authentication gates',async()=>{
  const previous=process.env.KORSET_INTEGRATION_ENABLED
  try {
    process.env.KORSET_INTEGRATION_ENABLED='false'
    const disabled=response()
    await handler({method:'POST',query:{route:'integration'},headers:{}},disabled)
    assert.equal(disabled.statusCode,501);assert.deepEqual(disabled.body,{error:'NOT_INSTALLED'})
    process.env.KORSET_INTEGRATION_ENABLED='true'
    const unauthenticated=response()
    await handler({method:'GET',query:{route:'integration'},headers:{}},unauthenticated)
    assert.equal(unauthenticated.statusCode,401);assert.deepEqual(unauthenticated.body,{error:'AUTH_REQUIRED'})
    const admin=response()
    await handler({method:'POST',query:{},headers:{}},admin)
    assert.equal(admin.statusCode,401);assert.deepEqual(admin.body,{error:'Unauthorized'})
    assert.equal(admin.headers['Access-Control-Allow-Origin'],'https://korset.app')
  } finally {
    if(previous===undefined)delete process.env.KORSET_INTEGRATION_ENABLED
    else process.env.KORSET_INTEGRATION_ENABLED=previous
  }
})

test('legacy method checks and preflight use the Vercel response headers API',async()=>{
  const get=response()
  await handler({method:'GET',query:{},headers:{origin:'https://korset.app'}},get)
  assert.equal(get.statusCode,405)
  assert.equal(get.headers['Access-Control-Allow-Origin'],'https://korset.app')
  const options=response()
  await handler({method:'OPTIONS',query:{},headers:{origin:'https://www.korset.app'}},options)
  assert.equal(options.statusCode,200)
  assert.equal(options.headers['Access-Control-Allow-Origin'],'https://www.korset.app')
  assert.equal(options.headers['Access-Control-Allow-Methods'],'POST, OPTIONS')
})
