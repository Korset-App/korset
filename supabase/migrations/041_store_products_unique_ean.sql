CREATE UNIQUE INDEX IF NOT EXISTS store_products_store_ean_key
  ON public.store_products (store_id, ean);
