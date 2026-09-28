function plain(html) {
  return String(html || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/?p(?:\s+[^>]*)?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function number(text, label) {
  const raw = text.match(new RegExp(`${label}\\s*[-–—:]?\\s*(\\d+(?:[.,]\\d+)?)`, 'i'))?.[1]
  return raw == null ? null : Number(raw.replace(',', '.'))
}

export function parseRakhatProduct(html, url) {
  const section = html.match(/<section\s+class=section-product[^>]*>([\s\S]*?)(?:<section\s+class=similar-products|<\/section>)/i)?.[1]
  if (!section) return null
  const name = plain(section.match(/<h1\s+class="page-title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1])
  if (!name) return null
  const factsHtml = section.match(/<div\s+class="tab-pane fade"\s+id=2[^>]*>([\s\S]*?)<\/div>/i)?.[1] || ''
  const factsText = plain(factsHtml)
  const energyRaw = factsText.match(/(\d+(?:[.,]\d+)?)\s*ккал/i)?.[1]
    || factsText.match(/кДж\s*\/\s*ккал\s+(\d{3,4})\s*\/\s*(\d{2,3})/i)?.[2]
    || factsText.match(/Калорийность\s*,?\s*ккал\s*\/\s*(\d+(?:[.,]\d+)?)/i)?.[1]
  const energy = energyRaw == null ? null : Number(energyRaw.replace(',', '.'))
  const protein = number(factsText, 'Бел(?:ков|ки)')
  const fat = number(factsText, 'Жир(?:ов|ы)')
  const carbs = number(factsText, '(?:Углевод(?:ов|ы)|Улеводов)')
  const nutriments_json = [energy, protein, fat, carbs].every(Number.isFinite)
    ? { energy_kcal: energy, protein_100g: protein, fat_100g: fat, carbohydrates_100g: carbs }
    : null
  const ingredients_raw = factsText.match(/(?:^|\n)\s*Состав:\s*([^\n]+)/i)?.[1]?.trim() || null
  const manufacturer_sku = section.match(/class=product-sku>\s*№\s*(\d+)/i)?.[1] || null
  const sourceId = new URL(url).pathname
  return {
    source: 'rakhat_official', sourceId, sourceUrl: url, manufacturer_sku, name,
    ingredients_raw, nutriments_json,
    storage_conditions_raw: factsText.match(/(?:^|\n)\s*(Хранить[^\n]+)/i)?.[1]?.trim() || null,
    shelf_life_raw: factsText.match(/(?:^|\n)\s*Срок хранения:\s*([^\n]+)/i)?.[1]?.trim() || null,
    image_url: section.match(/<img\s+class=image-container\s+src=([^ >]+)/i)?.[1] || null,
  }
}
