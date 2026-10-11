import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

let db
before(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema storage;
    create function storage.foldername(text) returns text[] language sql immutable as $$
      select string_to_array($1, '/')
    $$;
    create table storage.objects (bucket_id text, name text);
    grant usage on schema storage to anon, authenticated, service_role;
    grant insert, select, update on storage.objects to anon, authenticated, service_role;
    alter table storage.objects enable row level security;
    create policy "Public submissions upload" on storage.objects
      for insert to anon, authenticated, service_role with check (
        bucket_id = 'public-assets' and
        (name like 'submissions/%' or (storage.foldername(name))[1] = 'submissions')
      );
    create policy "Public submissions update" on storage.objects
      for update to anon, authenticated, service_role
      using (bucket_id = 'public-assets' and name like 'submissions/%')
      with check (bucket_id = 'public-assets' and name like 'submissions/%');
    create policy "Avatar fixture upload" on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and name like 'owner/%');
    create policy "Public fixture read" on storage.objects for select to anon, authenticated
      using (bucket_id = 'public-assets');
    insert into storage.objects values ('public-assets', 'submissions/existing.jpg');
  `)
  if (process.env.SUBMISSION_POLICY_BASELINE !== '1') {
    await db.exec(await readFile(new URL('../../supabase/release-gates/2026-10-11-submissions-server-only.sql', import.meta.url), 'utf8'))
  }
})
after(async () => { await db?.close() })

async function asRole(role, operation) {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role))
  await db.exec('begin')
  try {
    await db.exec(`set local role ${role}`)
    return await operation()
  } finally {
    await db.exec('rollback')
  }
}

for (const role of ['anon', 'authenticated']) {
  test(`${role} cannot bypass the submission handler with a direct storage upload`, async () => {
    await assert.rejects(asRole(role, () => db.query('insert into storage.objects values ($1, $2)', ['public-assets', 'submissions/new.jpg'])), /row-level security/)
  })
  test(`${role} can still read existing public submission photos`, async () => {
    const result = await asRole(role, () => db.query("select * from storage.objects where bucket_id = 'public-assets'"))
    assert.equal(result.rows.length, 1)
  })
  test(`${role} cannot replace an existing submission photo`, async () => {
    const result = await asRole(role, () => db.query("update storage.objects set name = 'submissions/replaced.jpg' where name = 'submissions/existing.jpg' returning name"))
    assert.equal(result.rows.length, 0)
  })
}

test('server service role can upload a submission after client access is removed', async () => {
  await asRole('service_role', () => db.query('insert into storage.objects values ($1, $2)', ['public-assets', 'submissions/new.jpg']))
})
test('unrelated owner avatar uploads keep their existing policy', async () => {
  await asRole('authenticated', () => db.query('insert into storage.objects values ($1, $2)', ['avatars', 'owner/avatar.jpg']))
})

test('release gate also supports current schemas without the legacy update policy', async () => {
  await db.exec('drop policy "Public submissions update" on storage.objects')
  await db.exec(await readFile(new URL('../../supabase/release-gates/2026-10-11-submissions-server-only.sql', import.meta.url), 'utf8'))
  await assert.rejects(asRole('anon', () => db.query('insert into storage.objects values ($1, $2)', ['public-assets', 'submissions/new.jpg'])), /row-level security/)
})
