-- 027 — Store AI notes for store-aware buyer AI
-- Adds owner-maintained factual notes used by Körset AI as store facts.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS ai_store_notes text;
