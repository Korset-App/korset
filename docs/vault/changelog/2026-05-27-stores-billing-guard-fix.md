# Stores billing guard fix

- Added `supabase/migrations/046_fix_stores_billing_guard.sql` to replace the stale `NEW.expires_at` reference with `NEW.plan_expires_at`.
- The old trigger could block any `UPDATE` on `public.stores`, including ordinary address and profile edits.
- This repair is separate from the `opening_hours` column fix and needs to be applied in live Supabase as well.
