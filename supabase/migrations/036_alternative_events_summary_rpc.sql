-- 036 — Alternative events summary RPC
-- Owner-facing aggregate analytics for the alternatives flow.
-- SECURITY INVOKER keeps alternative_events RLS in force.

CREATE OR REPLACE FUNCTION public.fn_get_alternative_events_summary(
  p_store_id uuid,
  p_days_back integer DEFAULT 7
)
RETURNS TABLE (
  total_count integer,
  compare_count integer,
  ai_help_count integer,
  open_count integer,
  scenario_select_count integer,
  top_scenario text,
  top_scenario_count integer,
  top_source_ean text,
  top_source_count integer
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
    SELECT ae.event_type, ae.scenario, ae.source_ean
    FROM public.alternative_events ae
    JOIN params p ON p.store_id = ae.store_id
    WHERE ae.created_at >= now() - (p.days_back || ' days')::interval
  ),
  totals AS (
    SELECT
      COUNT(*)::integer AS total_count,
      COUNT(*) FILTER (WHERE event_type = 'alternatives_compare_clicked')::integer AS compare_count,
      COUNT(*) FILTER (WHERE event_type = 'alternatives_ai_help_clicked')::integer AS ai_help_count,
      COUNT(*) FILTER (WHERE event_type = 'alternatives_product_opened')::integer AS open_count,
      COUNT(*) FILTER (WHERE event_type = 'alternatives_scenario_selected')::integer AS scenario_select_count
    FROM filtered
  ),
  scenario_counts AS (
    SELECT scenario, COUNT(*)::integer AS event_count
    FROM filtered
    WHERE scenario IS NOT NULL
    GROUP BY scenario
    ORDER BY event_count DESC, scenario ASC
    LIMIT 1
  ),
  source_counts AS (
    SELECT source_ean, COUNT(*)::integer AS event_count
    FROM filtered
    WHERE source_ean IS NOT NULL
    GROUP BY source_ean
    ORDER BY event_count DESC, source_ean ASC
    LIMIT 1
  )
  SELECT
    totals.total_count,
    totals.compare_count,
    totals.ai_help_count,
    totals.open_count,
    totals.scenario_select_count,
    scenario_counts.scenario AS top_scenario,
    COALESCE(scenario_counts.event_count, 0) AS top_scenario_count,
    source_counts.source_ean AS top_source_ean,
    COALESCE(source_counts.event_count, 0) AS top_source_count
  FROM totals
  LEFT JOIN scenario_counts ON true
  LEFT JOIN source_counts ON true;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_alternative_events_summary(uuid, integer)
  TO authenticated;
