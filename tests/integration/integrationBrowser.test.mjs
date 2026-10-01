import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { chromium } from '@playwright/test'
import { createIntegrationHandler } from '../../server/integration/handler.js'
import { STORE_ID, OWNER_ID, PRODUCT_ID, envelope } from '../helpers/integrationFixtures.mjs'
import { createIntegrationTestDatabase } from '../helpers/integrationDatabase.mjs'

test('browser onboarding confirms ownership through real HTTP and PostgreSQL', {
  skip: process.env.KORSET_BROWSER_TEST !== 'true', timeout: 60000,
}, async () => {
  const root = process.env.KORSET_TEST_UI_URL || 'http://127.0.0.1:5173'
  const db = await createIntegrationTestDatabase()
  const user = { id: OWNER_ID, email: 'test@example.invalid', aud: 'authenticated', role: 'authenticated', user_metadata: {} }
  const tokenPayload = Buffer.from(JSON.stringify({ sub: OWNER_ID, exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })).toString('base64url')
  const ownerToken = `eyJhbGciOiJIUzI1NiJ9.${tokenPayload}.test-signature`
  const events = []
  const client = {
    auth: { getUser: async token => token === ownerToken ? { data: { user }, error: null } : { data: null, error: { message: 'invalid fixture' } } },
    rpc: async (name, args) => {
      const argumentsByName = {
        korset_integration_manage: [args.p_owner_id,args.p_store_id,args.p_action,args.p_token_hash],
        korset_integration_ingest: [args.p_token_hash,JSON.stringify(args.p_envelope),args.p_payload_hash],
        korset_integration_preview: [args.p_token_hash,JSON.stringify(args.p_envelope)],
        korset_integration_resolve: [args.p_owner_id,args.p_store_id,args.p_source_id,args.p_expected_revision,args.p_adopt,args.p_expected_manual_price,args.p_expected_manual_updated_at],
      }
      const values = argumentsByName[name]
      assert.ok(values, 'only fixture-approved RPCs may run')
      try {
        const parameters = values.map((_, index) => `$${index+1}`).join(',')
        return { data: (await db.query(`select public.${name}(${parameters}) as result`,values)).rows[0].result, error: null }
      } catch (error) { return { data: null, error: { code: error.code, message: error.message } } }
    },
  }
  const handler = createIntegrationHandler({ enabled: true, clientFactory: () => client, eventLogger: event => events.push(event) })
  const server = createServer((req,res) => {
    req.query = Object.fromEntries(new URL(req.url,'http://localhost').searchParams)
    res.status = function(code) { this.statusCode=code; return this }
    res.json = function(value) { this.setHeader('Content-Type','application/json'); this.end(JSON.stringify(value)); return this }
    void handler(req,res)
  })
  let browser
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve))
  const api = `http://127.0.0.1:${server.address().port}/api/integration`
  const post = (value, token=ownerToken) => fetch(api,{ method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(value) })
  try {
    await db.query("insert into public.store_products(store_id,global_product_id,ean,price_kzt) values($1,$2,'5449000000996',77)",[STORE_ID,PRODUCT_ID])
    const created = await post({action:'create',store_id:STORE_ID})
    assert.equal(created.status,200)
    const connectorToken = (await created.json()).token
    const preview = await post(envelope(1,{operation:'dry_run'}),connectorToken)
    assert.equal((await preview.json()).result.conflicts,1)
    const delivery = await post(envelope(),connectorToken)
    assert.equal((await delivery.json()).result.conflicts,1)
    browser = await chromium.launch({headless:true})
    const context = await browser.newContext({viewport:{width:390,height:900}})
    const store = {id:STORE_ID,owner_id:OWNER_ID,code:'integration-test',name:'Тестовый магазин',is_active:true,is_published:true,images:[]}
    await context.addInitScript(({store,user,ownerToken}) => {
      localStorage.setItem('korset_lang','ru'); localStorage.setItem('korset_theme','light')
      localStorage.setItem('korset_store_slug',store.code)
      localStorage.setItem(`korset_store_data_${store.code}`,JSON.stringify(store))
      localStorage.setItem('sb-tcvuffoxwavqdexrzwjj-auth-token',JSON.stringify({access_token:ownerToken,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}))
    },{store,user,ownerToken})
    await context.route('**/*',async route => {
      const url = new URL(route.request().url())
      if (url.origin===root) {
        if (url.pathname==='/api/integration') {
          const response = await route.fetch({url:api+url.search})
          return route.fulfill({response})
        }
        return route.continue()
      }
      if (url.hostname.endsWith('.supabase.co')) {
        const data = url.pathname.includes('/auth/v1/') ? user : url.pathname.endsWith('/stores') ? store : url.pathname.endsWith('/users') ? {id:OWNER_ID,auth_id:OWNER_ID,role:'user'} : []
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)})
      }
      return route.abort()
    })
    const page = await context.newPage()
    const errors=[]; page.on('pageerror',error=>errors.push(error.message))
    await page.goto(`${root}/retail/integration-test/integration`,{waitUntil:'networkidle'})
    try { await page.getByRole('button',{name:'Передать управление в 1С',exact:true}).click({timeout:10000}) }
    catch(error) { throw new Error(`Onboarding page unavailable: ${page.url()} | ${(await page.locator('body').innerText()).slice(-1400)} | ${errors.join('; ')}`,{cause:error}) }
    await page.getByRole('button',{name:'Подтвердить',exact:true}).click()
    await page.waitForFunction(()=>!document.querySelector('.retail-integration__issues'))
    assert.deepEqual(errors,[])
    const target=(await db.query('select price_kzt,sync_integration_id from public.store_products')).rows[0]
    assert.equal(target.price_kzt,1234); assert.ok(target.sync_integration_id)
    assert.equal((await db.query("select count(*)::int as n from korset_integration.owner_actions where action='adopt'")).rows[0].n,1)
    assert.equal(events.filter(event=>event.operation==='resolve'&&event.status===200).length,1)
    const weighted=envelope(2);weighted.items[0].stock.unit='kg'
    assert.equal((await (await post(weighted,connectorToken)).json()).result.unresolved,1)
    await page.reload({waitUntil:'networkidle'})
    await page.getByRole('button',{name:'Повторить сопоставление',exact:true}).click()
    const resolved=page.waitForResponse(response=>response.url().includes('/api/integration')&&response.request().method()==='POST')
    await page.getByRole('button',{name:'Подтвердить',exact:true}).click()
    assert.equal((await resolved).status(),200)
    await page.waitForFunction(()=>!document.querySelector('.retail-integration__confirm'))
    assert.equal(events.filter(event=>event.operation==='resolve'&&event.status===200).length,2)
    assert.equal((await db.query('select is_active from public.store_products')).rows[0].is_active,false)
    assert.equal(JSON.stringify(events).includes(connectorToken),false)
  } finally {
    await browser?.close()
    server.closeAllConnections(); await new Promise(resolve=>server.close(resolve))
    await db.close()
  }
})
