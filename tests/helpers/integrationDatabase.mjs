import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { STORE_ID, OWNER_ID, PRODUCT_ID } from './integrationFixtures.mjs'

export async function createIntegrationTestDatabase() {
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
    create table public.stores (id uuid primary key, owner_id uuid, is_active boolean default true,is_published boolean default true);
    create table public.global_products (id uuid primary key, ean text unique, is_active boolean default true);
    create table public.product_ean_aliases (ean text,global_product_id uuid references public.global_products, status text, is_active boolean);
    create table public.store_products (id uuid primary key default gen_random_uuid(),store_id uuid references public.stores,
      global_product_id uuid references public.global_products,ean text,local_name text,local_sku text,
      price_kzt integer check(price_kzt>0),old_price_kzt integer,discount_percent integer,
      stock_status text check(stock_status in ('in_stock','low_stock','out_of_stock')),is_active boolean default true,
      shelf_zone text,is_featured boolean default false,updated_at timestamptz default now(),unique(store_id,ean));
  `)
  await db.query('insert into public.stores(id,owner_id) values($1,$2)', [STORE_ID, OWNER_ID])
  await db.query("insert into public.global_products(id,ean) values($1,'5449000000996')", [PRODUCT_ID])
  const sql = await readFile(new URL('../../supabase/migrations/20261001001322_integration_foundation.sql', import.meta.url), 'utf8')
  await db.exec(sql)
  return db
}
