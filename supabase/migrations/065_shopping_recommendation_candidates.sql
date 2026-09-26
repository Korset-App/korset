ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS is_shopping_recommended boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_store_products_shopping_recommended
  ON public.store_products (store_id, id)
  WHERE is_shopping_recommended = true;

CREATE OR REPLACE FUNCTION public.enforce_shopping_recommendation_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_new_selection boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    is_new_selection := NEW.is_shopping_recommended;
  ELSE
    is_new_selection := NEW.is_shopping_recommended AND (
      OLD.is_shopping_recommended IS DISTINCT FROM true
      OR OLD.store_id IS DISTINCT FROM NEW.store_id
    );
  END IF;
  IF is_new_selection THEN
    PERFORM 1 FROM public.stores WHERE id = NEW.store_id FOR UPDATE;
    IF (
      SELECT count(*) FROM public.store_products
      WHERE store_id = NEW.store_id AND is_shopping_recommended = true
    ) >= 10 THEN
      RAISE EXCEPTION 'Maximum 10 shopping recommendation candidates per store';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shopping_recommendation_limit ON public.store_products;
CREATE TRIGGER trg_shopping_recommendation_limit
  BEFORE INSERT OR UPDATE OF is_shopping_recommended, store_id
  ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_shopping_recommendation_limit();
