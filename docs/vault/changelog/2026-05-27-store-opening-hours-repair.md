# Store opening hours repair

- Added `supabase/migrations/045_repair_store_opening_hours.sql` to restore `public.stores.opening_hours` in environments where the column is missing.
- Kept the retail settings client tolerant of a missing `opening_hours` field so other store fields can still save while the database is catching up.
- Confirmed the live database was missing `stores.opening_hours` during debugging, which explains the previous save failure.
