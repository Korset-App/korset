CREATE TABLE IF NOT EXISTS public.store_shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  ean text NOT NULL,
  global_product_id uuid REFERENCES public.global_products(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_shopping_items_user_store_ean_unique UNIQUE (user_id, store_id, ean)
);

CREATE INDEX IF NOT EXISTS idx_store_shopping_items_user_store_added
  ON public.store_shopping_items (user_id, store_id, added_at DESC);

ALTER TABLE public.store_shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_shopping_items_select_own ON public.store_shopping_items
  FOR SELECT TO authenticated USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = (SELECT auth.uid()))
  );

CREATE POLICY store_shopping_items_insert_own ON public.store_shopping_items
  FOR INSERT TO authenticated WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = (SELECT auth.uid()))
  );

CREATE POLICY store_shopping_items_update_own ON public.store_shopping_items
  FOR UPDATE TO authenticated USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = (SELECT auth.uid()))
  ) WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = (SELECT auth.uid()))
  );

CREATE POLICY store_shopping_items_delete_own ON public.store_shopping_items
  FOR DELETE TO authenticated USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = (SELECT auth.uid()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_shopping_items TO authenticated;
