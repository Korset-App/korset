-- 058_compare_events.sql
-- Capture every meaningful comparison opened by a shopper so the store owner
-- can measure the scenario's value. The screen fires a single insert when a
-- real verdict is reached (winner/draw/blocked); "same_product" and "not
-- found" states are intentionally skipped to keep the signal clean.
--
-- Apply via the standard flow: commit → GitHub → Supabase migration runner.
-- Do NOT run from the client; this file only declares schema and RLS.

BEGIN;

create table if not exists public.compare_events (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid null,
  ean_a text not null,
  ean_b text not null,
  status text null check (status in ('winner', 'draw', 'blocked')),
  winner_side text null check (winner_side in ('A', 'B')),
  primary_reason text null,
  lang text null check (lang in ('ru', 'kz')),
  created_at timestamptz not null default now()
);

create index if not exists idx_compare_events_store_created
  on public.compare_events (store_id, created_at desc);

create index if not exists idx_compare_events_pair
  on public.compare_events (store_id, ean_a, ean_b);

alter table public.compare_events enable row level security;

-- A shopper (signed-in or guest) may record that they opened a comparison,
-- but only for a published store they could actually see.
create policy "compare_events_insert_public"
  on public.compare_events for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.stores
      where id = store_id and is_active = true and is_published = true
    )
  );

-- Store owners and superadmins can read events for their store. Other
-- authenticated users get nothing. Anon cannot select.
create policy "compare_events_select_owner_or_admin"
  on public.compare_events for select
  to authenticated
  using (
    exists (
      select 1 from public.stores
      where id = store_id and owner_id = auth.uid()
    )
    or exists (
      select 1 from public.users
      where auth_id = auth.uid() and is_superadmin = true
    )
  );

-- No update / delete from non-service roles: events are immutable history.

COMMIT;