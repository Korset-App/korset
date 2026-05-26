-- Fix legacy billing guard to use the real stores column name.
-- The table uses `plan_expires_at`, not `expires_at`.

CREATE OR REPLACE FUNCTION public.protect_stores_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
    THEN
      RAISE EXCEPTION 'stores.plan/plan_expires_at/is_active can only be modified by service_role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_stores_billing_trigger ON public.stores;
CREATE TRIGGER protect_stores_billing_trigger
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.protect_stores_billing();
