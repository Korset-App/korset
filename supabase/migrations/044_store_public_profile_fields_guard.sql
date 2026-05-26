-- Guard migration for retail store profile fields used by the public home screen.
-- Safe to run after earlier migrations: every column is IF NOT EXISTS.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS twogis_url text,
  ADD COLUMN IF NOT EXISTS ai_store_notes text;
