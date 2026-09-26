-- 063_store_features_and_logo_policies.sql
-- Add features (amenities & payments) to stores, fix store-logos storage policies for admins & owners

-- 1. Add features column to stores if not exists
alter table public.stores
add column if not exists features jsonb default '[]'::jsonb;

-- 2. Ensure store-logos bucket exists and is public
insert into storage.buckets (id, name, public)
values ('store-logos', 'store-logos', true)
on conflict (id) do update set public = true;

-- 3. Fix policies on storage.objects for store-logos bucket
drop policy if exists "Store owners can upload logo" on storage.objects;
drop policy if exists "Store owners can update logo" on storage.objects;
drop policy if exists "Store owners can delete logo" on storage.objects;
drop policy if exists "Public logo read" on storage.objects;
drop policy if exists "Store owners and admins can upload logo" on storage.objects;
drop policy if exists "Store owners and admins can update logo" on storage.objects;
drop policy if exists "Store owners and admins can delete logo" on storage.objects;

-- Allow public read of logos
create policy "Public logo read"
on storage.objects for select to public
using (bucket_id = 'store-logos');

-- Allow store owners, admins and superadmins to upload logos
create policy "Store owners and admins can upload logo"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'store-logos'
  and (
    (auth.jwt()->'app_metadata'->>'is_admin')::boolean = true
    or (auth.jwt()->'app_metadata'->>'is_superadmin')::boolean = true
    or split_part(name, '/', 1) in (
      select id::text from public.stores where owner_id = auth.uid()
    )
  )
);

-- Allow store owners, admins and superadmins to update logos
create policy "Store owners and admins can update logo"
on storage.objects for update to authenticated
using (
  bucket_id = 'store-logos'
  and (
    (auth.jwt()->'app_metadata'->>'is_admin')::boolean = true
    or (auth.jwt()->'app_metadata'->>'is_superadmin')::boolean = true
    or split_part(name, '/', 1) in (
      select id::text from public.stores where owner_id = auth.uid()
    )
  )
);

-- Allow store owners, admins and superadmins to delete logos
create policy "Store owners and admins can delete logo"
on storage.objects for delete to authenticated
using (
  bucket_id = 'store-logos'
  and (
    (auth.jwt()->'app_metadata'->>'is_admin')::boolean = true
    or (auth.jwt()->'app_metadata'->>'is_superadmin')::boolean = true
    or split_part(name, '/', 1) in (
      select id::text from public.stores where owner_id = auth.uid()
    )
  )
);

-- 4. Seed common default features for pilot stores (Mars, Nurly, Kalina, Bereke)
update public.stores
set features = jsonb_build_object(
  'payments', jsonb_build_array('kaspi_qr', 'kaspi_alaqan', 'halyk', 'card', 'cash'),
  'amenities', jsonb_build_array('halal', 'bakery', 'cookery', 'coffee', 'self_checkout', 'atm', 'parking', 'carts')
)
where features is null or features = '[]'::jsonb or features = '{}'::jsonb;
