-- QA Script: Stage 9 RPC v2 Search Ranking Verification
-- Run this in Supabase Dashboard SQL Editor against your pilot store.
-- Replace 'YOUR_STORE_UUID' with a real store_id.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Basic connectivity + function exists
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT proname, prorettype::regtype
FROM pg_proc
WHERE proname = 'fn_search_store_products';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Dairy queries
-- ═══════════════════════════════════════════════════════════════════════════════
-- milk should rank actual milk products above milk chocolate
SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'молоко', 10);

-- milk 1L should boost exact quantity match
SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'молоко 1л', 10);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Sweets / snacks
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'шоколад', 10);

SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'сникерс', 10);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Beverages
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'сок', 10);

SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'вода', 10);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Attribute / ingredient queries
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'без сахара', 10);

SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'халал', 10);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Brand + product combo
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'Эмиль топленое', 10);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. Quantity normalization
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', '1000 мл молоко', 10);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. Typo tolerance
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'молокы', 10);

SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'сникерс', 10);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. Empty / edge cases
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', '', 10);

SELECT local_name, search_rank, match_type
FROM fn_search_store_products('YOUR_STORE_UUID', 'а', 10);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. Performance check
-- ═══════════════════════════════════════════════════════════════════════════════
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM fn_search_store_products('YOUR_STORE_UUID', 'молоко', 30);
