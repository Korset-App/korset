import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('migration refuses unsupported base schema before installing any integration objects', async () => {
  const db = new PGlite()
  try {
    await db.exec('create table public.stores(id uuid primary key, owner_id text)')
    const sql = await readFile(new URL('../../supabase/migrations/20261001001322_integration_foundation.sql', import.meta.url), 'utf8')
    await assert.rejects(db.exec(sql), /INTEGRATION_BASE_SCHEMA_UNSUPPORTED/)
    await db.exec('rollback')
    const result = await db.query("select to_regnamespace('korset_integration') as integration, atttypid::regtype::text as owner_type from pg_attribute where attrelid='public.stores'::regclass and attname='owner_id'")
    assert.equal(result.rows[0].integration, null)
    assert.equal(result.rows[0].owner_type, 'text')
  } finally { await db.close() }
})
