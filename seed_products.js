// Загрузка товаров в Supabase — запускать один раз: node seed_products.js
import { readFileSync } from 'fs'

const SUPABASE_URL  = 'https://tcvuffoxwavqdexrzwjj.supabase.co'
const SUPABASE_ANON = 'ВСТАВЬ_ANON_KEY' // ← замени на свой ключ

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON,
  'Authorization': `Bearer ${SUPABASE_ANON}`,
  'Prefer': 'resolution=merge-duplicates',
}

const raw = JSON.parse(readFileSync('./src/data/products.json', 'utf8'))

const rows = raw.map(p => ({
  id:            p.id,
  ean:           p.ean || null,
  name:          p.name,
  brand:         p.manufacturer || null,
  category:      p.category,
  shelf:         p.shelf || null,
  price_kzt:     p.priceKzt || null,
  images:        p.images || [],
  ingredients:   p.ingredients || null,
  allergens:     p.allergens || [],
  diet_tags:     p.dietTags || [],
  nutrition:     p.nutritionPer100 || null,
  specs:         p.specs || null,
  halal:         p.halal === true || p.halal === 'yes',
  quality_score: p.qualityScore || 50,
  source:        'manual',
  is_active:     true,
}))

console.log(`Загружаем ${rows.length} товаров...`)

const res = await fetch(`${SUPABASE_URL}/rest/v1/products?on_conflict=id`, {
  method: 'POST',
  headers,
  body: JSON.stringify(rows),
})

if (!res.ok) {
  const err = await res.text()
  console.error('❌ Ошибка:', err)
  process.exit(1)
}

console.log('✅ Готово! Все товары загружены в Supabase.')
