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

-- Owner-facing aggregate for the Retail Dashboard. SECURITY INVOKER keeps
-- compare_events RLS in force, so an owner only ever aggregates their own store.
CREATE OR REPLACE FUNCTION public.fn_get_compare_events_summary(
  p_store_id uuid,
  p_days_back integer DEFAULT 7
)
RETURNS TABLE (
  total_count integer,
  winner_count integer,
  draw_count integer,
  blocked_count integer,
  top_ean_a text,
  top_ean_b text,
  top_pair_count integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO public, pg_temp
AS $$
  WITH params AS (
    SELECT
      p_store_id AS store_id,
      GREATEST(1, LEAST(COALESCE(p_days_back, 7), 365)) AS days_back
  ),
  filtered AS (
    SELECT ce.ean_a, ce.ean_b, ce.status
    FROM public.compare_events ce
    JOIN params p ON p.store_id = ce.store_id
    WHERE ce.created_at >= now() - (p.days_back || ' days')::interval
  ),
  totals AS (
    SELECT
      COUNT(*)::integer AS total_count,
      COUNT(*) FILTER (WHERE status = 'winner')::integer AS winner_count,
      COUNT(*) FILTER (WHERE status = 'draw')::integer AS draw_count,
      COUNT(*) FILTER (WHERE status = 'blocked')::integer AS blocked_count
    FROM filtered
  ),
  -- A↔B and B↔A are the same comparison, so normalise the pair before grouping.
  pair_counts AS (
    SELECT
      LEAST(ean_a, ean_b) AS ean_lo,
      GREATEST(ean_a, ean_b) AS ean_hi,
      COUNT(*)::integer AS event_count
    FROM filtered
    GROUP BY 1, 2
    ORDER BY event_count DESC, ean_lo ASC, ean_hi ASC
    LIMIT 1
  )
  SELECT
    totals.total_count,
    totals.winner_count,
    totals.draw_count,
    totals.blocked_count,
    pair_counts.ean_lo AS top_ean_a,
    pair_counts.ean_hi AS top_ean_b,
    COALESCE(pair_counts.event_count, 0) AS top_pair_count
  FROM totals
  LEFT JOIN pair_counts ON true;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_compare_events_summary(uuid, integer)
  TO authenticated;

COMMIT;