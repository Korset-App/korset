const fs = require('fs');

const products = JSON.parse(fs.readFileSync('./src/data/products.json'));
let sql = '';

for (const p of products) {
  const ean = p.ean.replace(/'/g, "''");
  const name = p.name.replace(/'/g, "''");
  const category = p.category ? p.category.replace(/'/g, "''") : '';
  const group = p.group ? p.group.replace(/'/g, "''") : '';
  const halalStatus = p.halalStatus || 'unknown';
  const score = p.qualityScore || 0;
  
  // Make arrays JSON strings
  const allergens = JSON.stringify(p.allergens || []).replace(/'/g, "''");
  const dietTags = JSON.stringify(p.dietTags || []).replace(/'/g, "''");
  const nutriments = JSON.stringify(p.nutriments || {}).replace(/'/g, "''");
  const ingredientsRaw = p.ingredients_raw ? p.ingredients_raw.replace(/'/g, "''") : '';
  
  // Insert into global_products
  sql += `
    INSERT INTO public.global_products (
      ean, name, category, subcategory, halal_status, 
      data_quality_score, allergens_json, diet_tags_json, 
      nutriments_json, ingredients_raw
    ) VALUES (
      '${ean}', '${name}', '${category}', '${group}', '${halalStatus}',
      ${score}, '${allergens}'::jsonb, '${dietTags}'::jsonb,
      '${nutriments}'::jsonb, '${ingredientsRaw}'
    ) ON CONFLICT (ean) DO UPDATE SET
      name = EXCLUDED.name,
      halal_status = EXCLUDED.halal_status,
      data_quality_score = EXCLUDED.data_quality_score,
      allergens_json = EXCLUDED.allergens_json,
      diet_tags_json = EXCLUDED.diet_tags_json,
      nutriments_json = EXCLUDED.nutriments_json,
      ingredients_raw = EXCLUDED.ingredients_raw;
  `;

  // Insert into store_products mapping, resolving conflicts
  sql += `
    INSERT INTO public.store_products (
      store_id, global_product_id, ean, price_kzt, stock_status
    )
    SELECT 'cebbe5fe-0512-4b24-96c9-3af7c948b3a4', id, '${ean}', ${Math.floor(500 + Math.random() * 2000)}, 'in_stock'
    FROM public.global_products WHERE ean = '${ean}'
    ON CONFLICT (store_id, global_product_id) DO NOTHING;
  `;
}

fs.writeFileSync('insert_products.sql', sql);
console.log('SQL generated to insert_products.sql');
