-- Repair migration for store opening hours.
-- The retail settings screen and home screen both depend on this field.
-- Safe to run multiple times.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS opening_hours text;
