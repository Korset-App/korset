-- ═══════════════════════════════════════════════════════════════════════════════
-- 051 — superadmin_auth_and_stores: Add is_superadmin support
-- ═══════════════════════════════════════════════════════════════════════════════
-- Adds superadmin role column to public.users, secures it via triggers,
-- syncs it to raw_app_meta_data for JWT propagation, and adds a checker RPC.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. ADD COLUMN
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.is_superadmin IS
  'Superadmin flag. Cannot be self-modified, set only via SQL by service_role.';

-- ──────────────────────────────────────────────────────────────────────────
-- 2. PROTECT COLUMNS
-- ──────────────────────────────────────────────────────────────────────────
-- Update protect_admin_column function to also protect is_superadmin
CREATE OR REPLACE FUNCTION public.protect_admin_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'is_admin can only be modified by service_role';
    END IF;
    IF NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin THEN
      RAISE EXCEPTION 'is_superadmin can only be modified by service_role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. SYNC TO APP_METADATA FOR JWT
-- ──────────────────────────────────────────────────────────────────────────
-- Update sync_admin_to_app_metadata function to handle both is_admin and is_superadmin
CREATE OR REPLACE FUNCTION public.sync_admin_to_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Skip if guest user
  IF NEW.auth_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{is_admin}',
      to_jsonb(COALESCE(NEW.is_admin, false))
    ),
    '{is_superadmin}',
    to_jsonb(COALESCE(NEW.is_superadmin, false))
  )
  WHERE id = NEW.auth_id;

  RETURN NEW;
END;
$$;

-- Drop and recreate update trigger
DROP TRIGGER IF EXISTS sync_users_admin_to_jwt ON public.users;
CREATE TRIGGER sync_users_admin_to_jwt
  AFTER UPDATE OF is_admin, is_superadmin ON public.users
  FOR EACH ROW
  WHEN (NEW.is_admin IS DISTINCT FROM OLD.is_admin OR NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin)
  EXECUTE FUNCTION public.sync_admin_to_app_metadata();

-- Drop and recreate insert trigger
DROP TRIGGER IF EXISTS sync_users_admin_to_jwt_insert ON public.users;
CREATE TRIGGER sync_users_admin_to_jwt_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  WHEN ((NEW.is_admin = true OR NEW.is_superadmin = true) AND NEW.auth_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_admin_to_app_metadata();

-- ──────────────────────────────────────────────────────────────────────────
-- 4. RPC CHECKER
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_superadmin_user(p_auth_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.users WHERE auth_id = p_auth_id LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_superadmin_user(uuid) TO authenticated, service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- 5. RLS POLICIES FOR SUPERADMIN ACCESS
-- ──────────────────────────────────────────────────────────────────────────
-- Allows superadmin to read/write/delete stores directly if needed
DROP POLICY IF EXISTS "stores_superadmin_all" ON public.stores;
CREATE POLICY "stores_superadmin_all" ON public.stores
  FOR ALL TO authenticated
  USING (public.is_superadmin_user(auth.uid()))
  WITH CHECK (public.is_superadmin_user(auth.uid()));

COMMIT;
