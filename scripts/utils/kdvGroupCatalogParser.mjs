function plain(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function numeric(text) {
  const value = plain(text.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)?.[1] || text).match(/^\d+(?:[.,]\d+)?$/)?.[0]
  return value ? Number(value.replace(',', '.')) : null
}

export function parseKdvGroupCatalog(html, url) {
  const starts = [...String(html).matchAll(/<li\s+data-offerid="(\d+)"[^>]*>/g)]
  const products = []
  for (let i = 0; i < starts.length; i++) {
    const block = html.slice(starts[i].index, starts[i + 1]?.index ?? html.length)
    const sourceId = starts[i][1]
    const category = plain(block.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1])
    const title = plain(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1])
    if (!title) continue
    const rawIngredients = plain(block.match(/<div\s+class="composition__content"[^>]*>([\s\S]*?)<\/div>/i)?.[1])
    const ingredients_raw = rawIngredients.replace(/^Состав\s*:\s*/i, '') || null
    const package_quantity_raw = plain(block.match(/<th>Вес<br\s*\/?\s*>товара<\/th>[\s\S]*?<tr>\s*<td[^>]*>([\s\S]*?)<\/td>/i)?.[1]) || null
    const nutritionPart = block.match(/<th>\s*Белки\s*<\/th>[\s\S]*?<th>\s*Калорий(?:ность)?\s+на\s+100(?:&nbsp;|\s)*г\s*<\/th>([\s\S]*?)(?:<\/table>|<\/li>)/i)?.[1]
    const cells = nutritionPart ? [...nutritionPart.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(match => numeric(match[1])) : []
    const nutriments_json = cells.length >= 4 && cells.slice(0, 4).every(Number.isFinite)
      ? { energy_kcal: cells[3], protein_100g: cells[0], fat_100g: cells[1], carbohydrates_100g: cells[2] }
      : null
    const description = plain(block.match(/<div\s+class="description-content"[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]) || null
    const image_url = block.match(/<div\s+class="photo j-photo"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i)?.[1] || null
    products.push({ source: 'kdv_group', sourceId, sourceUrl: url, name: [category, title].filter(Boolean).join(' '), category_raw: category || null, package_quantity_raw, ingredients_raw, nutriments_json, description, image_url })
  }
  return products
}
