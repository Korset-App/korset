function plain(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function value(text, label) {
  const match = [...text.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
    .map(item => plain(item[1]))
    .find(item => label.test(item))
  const number = match?.match(/\d+(?:[.,]\d+)?/)?.[0]
  return number == null ? null : Number(number.replace(',', '.'))
}

function sectionValue(html, heading) {
  return plain(html.match(new RegExp(`<h4[^>]*>\\s*${heading}:?\\s*<\\/h4>[\\s\\S]*?<span[^>]*>([\\s\\S]*?)<\\/span>`, 'i'))?.[1]) || null
}

function suspectPackage(value) {
  const kg = value?.match(/(\d+(?:[.,]\d+)?)\s*кг/i)?.[1]
  return kg != null && Number(kg.replace(',', '.')) > 10
}

export function parseFoodmasterProduct(html, url) {
  const section = html.match(/<section\s+class="productPage"[^>]*>([\s\S]*?)<\/section>/i)?.[1]
  if (!section) return null
  const name = plain(section.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1])
  if (!name) return null
  const nutritionPart = section.match(/<h2[^>]*>\s*Пищевая ценность[^<]*<\/h2>([\s\S]*?)<h3/i)?.[1] || ''
  const fat = value(nutritionPart, /жир[а-яё]*$/i)
  const protein = value(nutritionPart, /бел[а-яё]*$/i)
  const carbs = value(nutritionPart, /углевод[а-яё]*$/i)
  const kcalText = plain(section.match(/<h3[^>]*>\s*Энергетическая ценность[^<]*<\/h3>\s*<span[^>]*>([\s\S]*?)<\/span>/i)?.[1])
  const kcal = kcalText.match(/\d+(?:[.,]\d+)?(?=\s*ккал)/i)?.[0]
  const energy = kcal == null ? null : Number(kcal.replace(',', '.'))
  const nutriments_json = [energy, protein, fat, carbs].every(Number.isFinite)
    ? { energy_kcal: energy, protein_100g: protein, fat_100g: fat, carbohydrates_100g: carbs }
    : null
  const package_quantity_raw = sectionValue(section, 'Упаковка')
  return {
    source: 'foodmaster_official',
    sourceId: url.split('/').pop(),
    sourceUrl: url,
    name,
    ingredients_raw: null,
    nutriments_json,
    shelf_life_raw: sectionValue(section, 'Срок хранения'),
    storage_temperature_raw: sectionValue(section, 'Температура хранения'),
    package_quantity_raw,
    package_quantity_suspect: suspectPackage(package_quantity_raw),
    image_url: section.match(/<figure>\s*<img[^>]+src="([^"]+)"/i)?.[1] || null,
  }
}
