BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE public.store_source_shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  store_source_item_id uuid NOT NULL REFERENCES korset_integration.source_items(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,store_id,store_source_item_id)
);
CREATE INDEX store_source_shopping_items_source_idx ON public.store_source_shopping_items(store_source_item_id);
CREATE INDEX store_source_shopping_items_store_idx ON public.store_source_shopping_items(store_id);
ALTER TABLE public.store_source_shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_source_shopping_own ON public.store_source_shopping_items FOR ALL TO authenticated
  USING(user_id IN(SELECT id FROM public.users WHERE auth_id=(SELECT auth.uid())))
  WITH CHECK(user_id IN(SELECT id FROM public.users WHERE auth_id=(SELECT auth.uid())));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.store_source_shopping_items TO authenticated;
REVOKE ALL ON public.store_source_shopping_items FROM anon;

CREATE FUNCTION public.korset_validate_source_shopping_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM korset_integration.source_items s
    JOIN korset_integration.connections c ON c.id=s.integration_id
    JOIN public.stores st ON st.id=c.store_id
    WHERE s.id=NEW.store_source_item_id AND c.store_id=NEW.store_id AND c.status IN ('active','paused')
      AND st.is_active AND (st.is_published OR st.owner_id=auth.uid()) AND korset_integration.source_card_visible(s)) THEN
    RAISE EXCEPTION 'SOURCE_NOT_AVAILABLE';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.korset_validate_source_shopping_item() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER store_source_shopping_reference BEFORE INSERT OR UPDATE ON public.store_source_shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.korset_validate_source_shopping_item();
COMMIT;
