-- Hotfix: missing brand aliases
INSERT INTO public.search_brand_aliases (alias, brand, category, subcategory, intent_boost) VALUES
('кока кола','Coca-Cola','water_beverages','soda',600),
('кока-кола','Coca-Cola','water_beverages','soda',600)
ON CONFLICT (alias, brand) DO NOTHING;

-- Hotfix: missing keywords
INSERT INTO public.search_category_keywords (keyword, category, subcategory, intent_boost) VALUES
('топленое молоко','dairy_eggs','milk',400),
('топленное молоко','dairy_eggs','milk',400),
('топлёное молоко','dairy_eggs','milk',400),
('сгущенное молоко','dairy_eggs','condensed_milk',400),
('сгущённое молоко','dairy_eggs','condensed_milk',400)
ON CONFLICT (keyword) DO NOTHING;
