-- Apply only after the deployed client submits photos through /api/submit-product.
-- Kept outside migrations so a schema update cannot disable the legacy client early.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
alter policy "Public submissions upload" on storage.objects to service_role;
do $$
begin
  if exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public submissions update'
  ) then
    alter policy "Public submissions update" on storage.objects to service_role;
  end if;
end;
$$;
commit;
