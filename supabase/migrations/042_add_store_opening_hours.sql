ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS opening_hours text;
