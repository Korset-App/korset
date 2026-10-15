import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import process from 'node:process'
import { URL } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { STORE_ID, OWNER_ID, PRODUCT_ID, envelope } from '../helpers/integrationFixtures.mjs'

const EAN = envelope().items[0].barcodes[0].value
// Reuse an existing test EAN; the alias relationship exists only in this fixture.
const ALIAS = '4870035005035'
const OTHER_USER = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const SUPERADMIN = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const UNKNOWN_STORE = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const migrations = new URL('../../supabase/migrations/', import.meta.url)
let db

before(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role; create role unrelated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table public.users (auth_id uuid primary key, is_superadmin boolean default false);
    create function public.is_superadmin_user(p_auth_id uuid) returns boolean
      language sql stable security definer set search_path = '' as $$
      select coalesce((select is_superadmin from public.users where auth_id = p_auth_id), false)
    $$;
    create table public.stores (id uuid primary key, owner_id uuid, is_active boolean, is_published boolean);
    create table public.global_products (id uuid primary key, ean text unique, is_active boolean, name text);
    create table public.store_products (
      id uuid primary key default gen_random_uuid(), store_id uuid references public.stores,
      global_product_id uuid references public.global_products, ean text, is_active boolean,
      price_kzt integer, shelf_zone text, shelf_position text, stock_status text
    );
    create table public.product_ean_aliases (
      id uuid primary key default gen_random_uuid(), ean text, global_product_id uuid references public.global_products,
      status text, confidence integer, is_active boolean
    );
    alter table public.stores enable row level security;
    alter table public.store_products enable row level security;
  `)
  await db.query('insert into public.users values ($1, false), ($2, false), ($3, true)', [OWNER_ID, OTHER_USER, SUPERADMIN])
  await db.query('insert into public.stores values ($1, $2, true, true)', [STORE_ID, OWNER_ID])
  await db.query("insert into public.global_products values ($1, $2, true, 'Fixture global facts')", [PRODUCT_ID, EAN])
  await db.query("insert into public.store_products (store_id, global_product_id, ean, is_active, price_kzt, shelf_zone, shelf_position, stock_status) values ($1, $2, $3, true, 1234, 'A', '2', 'low_stock')", [STORE_ID, PRODUCT_ID, EAN])
  await db.query("insert into public.product_ean_aliases (ean, global_product_id, status, confidence, is_active) values ($1, $2, 'trusted', 80, true)", [ALIAS, PRODUCT_ID])
  await db.exec(await readFile(new URL('060_optimize_resolver_rpc.sql', migrations), 'utf8'))
  if (process.env.RESOLVER_BASELINE !== '1') {
    const files = (await readdir(migrations)).filter(name => name.endsWith('_resolver_store_visibility.sql'))
    assert.equal(files.length, 1, 'Exactly one resolver visibility migration must exist')
    await db.exec(await readFile(new URL(files[0], migrations), 'utf8'))
  }
})

after(async () => { await db?.close() })

async function resolve(ean, { role = 'anon', user = '', store = STORE_ID } = {}) {
  assert.ok(['anon', 'authenticated', 'service_role', 'unrelated'].includes(role))
  await db.exec('begin')
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user])
    await db.exec(`set local role ${role}`)
    return (await db.query('select public.fn_resolve_product_by_ean($1, $2) as result', [ean, store])).rows[0].result
  } finally {
    await db.exec('rollback')
  }
}

function assertGlobalOnly(result, ean) {
  assert.equal(result.id, PRODUCT_ID)
  assert.equal(result.ean, EAN)
  assert.equal(result.name, 'Fixture global facts')
  assert.deepEqual(Object.keys(result).filter(key => key.startsWith('_sp_')), [])
  if (ean === ALIAS) {
    assert.equal(result._ean_alias_ean, ALIAS)
    assert.equal(result._ean_alias_status, 'trusted')
    assert.equal(result._ean_alias_confidence, 80)
    assert.ok(result._ean_alias_id)
  }
}

for (const [lookup, ean] of [['direct EAN', EAN], ['trusted alias', ALIAS]]) {
  for (const scenario of [
    { name: 'published store for guest', active: true, published: true, visible: true },
    { name: 'draft store for guest', active: true, published: false, visible: false },
    { name: 'draft store for unrelated user', active: true, published: false, role: 'authenticated', user: OTHER_USER, visible: false },
    { name: 'draft store for owner', active: true, published: false, role: 'authenticated', user: OWNER_ID, visible: true },
    { name: 'draft store for superadmin', active: true, published: false, role: 'authenticated', user: SUPERADMIN, visible: true },
    { name: 'inactive published store for guest', active: false, published: true, visible: false },
    { name: 'inactive draft store for owner', active: false, published: false, role: 'authenticated', user: OWNER_ID, visible: false },
    { name: 'inactive store for superadmin', active: false, published: true, role: 'authenticated', user: SUPERADMIN, visible: false },
    { name: 'unknown store', active: true, published: true, store: UNKNOWN_STORE, visible: false },
    { name: 'no store context', active: true, published: true, store: null, visible: false },
    { name: 'published store for service role', active: true, published: true, role: 'service_role', visible: true },
  ]) {
    test(`${lookup}: ${scenario.name}`, async () => {
      await db.query('update public.stores set is_active = $1, is_published = $2', [scenario.active, scenario.published])
      const result = await resolve(ean, scenario)
      if (!scenario.visible) return assertGlobalOnly(result, ean)
      assert.equal(result.id, PRODUCT_ID)
      assert.equal(result.ean, EAN)
      assert.ok(result._sp_id)
      assert.equal(result._sp_price_kzt, 1234)
      assert.equal(result._sp_shelf_zone, 'A')
      assert.equal(result._sp_shelf_position, '2')
      assert.equal(result._sp_stock_status, 'low_stock')
      if (ean === ALIAS) assert.equal(result._ean_alias_ean, ALIAS)
    })
  }
}

test('inactive store product falls back to global facts for both lookup paths', async () => {
  await db.exec('update public.stores set is_active = true, is_published = true; update public.store_products set is_active = false;')
  try {
    for (const ean of [EAN, ALIAS]) assertGlobalOnly(await resolve(ean), ean)
  } finally {
    await db.exec('update public.store_products set is_active = true')
  }
})

test('inactive global product never resolves through store or alias', async () => {
  await db.exec('update public.global_products set is_active = false')
  try {
    for (const ean of [EAN, ALIAS]) assert.equal(await resolve(ean), null)
  } finally {
    await db.exec('update public.global_products set is_active = true')
  }
})

test('alias trust, confidence and activity requirements remain enforced', async () => {
  try {
    for (const [status, confidence, active] of [['review', 100, true], ['trusted', 79, true], ['trusted', 100, false]]) {
      await db.query('update public.product_ean_aliases set status = $1, confidence = $2, is_active = $3', [status, confidence, active])
      for (const store of [STORE_ID, null]) assert.equal(await resolve(ALIAS, { store }), null)
    }
  } finally {
    await db.exec("update public.product_ean_aliases set status = 'trusted', confidence = 80, is_active = true")
  }
})

test('EAN lookup stays exact and unknown EAN returns null', async () => {
  for (const ean of ['', ` ${EAN}`, `${EAN} `, EAN.slice(1)]) assert.equal(await resolve(ean), null)
})

test('PUBLIC execution is revoked while supported API roles retain execution', async () => {
  for (const role of ['anon', 'authenticated', 'service_role', 'unrelated']) {
    const { rows } = await db.query("select has_function_privilege($1, 'public.fn_resolve_product_by_ean(text,uuid)', 'EXECUTE') as allowed", [role])
    assert.equal(rows[0].allowed, role !== 'unrelated')
  }
  await assert.rejects(() => resolve(EAN, { role: 'unrelated' }), /permission denied for function fn_resolve_product_by_ean/)
})
