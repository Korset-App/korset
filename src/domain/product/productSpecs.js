import { getSubcategoryLabel } from './categoryMap.js'

function cleanText(value) {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed || null
}

function isCodeLike(value) {
  return /^[a-z0-9_/-]+$/i.test(value) && /[_/-]/.test(value)
}

function getManufacturerName(product) {
  const manufacturer = product?.manufacturer
  if (!manufacturer) return null
  if (typeof manufacturer === 'object') return cleanText(manufacturer.name)
  return cleanText(String(manufacturer).replace(/\s*[-—]\s*демо\s*$/i, ''))
}

function getCountry(product) {
  if (product?.manufacturer && typeof product.manufacturer === 'object') {
    return cleanText(product.manufacturer.country)
  }
  return cleanText(product?.country || product?.countryOfOrigin || product?.country_of_origin)
}

function formatPercent(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return `${Number.isInteger(num) ? num : num.toString()}%`
}

function getCleanSubcategory(product, lang) {
  const raw = cleanText(product?.subcategory)
  if (!raw) return null
  const label = cleanText(getSubcategoryLabel(product?.category, raw, lang))
  if (!label) return null
  if (label === raw && isCodeLike(raw)) return null
  return label
}

export function buildProductCharacteristicSpecs(product, { lang = 'ru' } = {}) {
  if (!product) return []
  const specs = product.specs || {}
  const rows = []

  const storage = cleanText(specs.storage)
  if (storage) rows.push({ key: 'storage', labelKey: 'product.storage', value: storage })

  const bestBefore = cleanText(specs.bestBefore)
  if (bestBefore) rows.push({ key: 'bestBefore', labelKey: 'product.expiry', value: bestBefore })

  const fatPercent = formatPercent(product.fatPercent ?? product.fat_percent)
  if (fatPercent)
    rows.push({ key: 'fatPercent', labelKey: 'product.fatPercent', value: fatPercent })

  const flavor = cleanText(product.flavor || specs.flavor)
  if (flavor) rows.push({ key: 'flavor', labelKey: 'product.flavor', value: flavor })

  const subcategory = getCleanSubcategory(product, lang)
  if (subcategory)
    rows.push({ key: 'subcategory', labelKey: 'product.subcategory', value: subcategory })

  const manufacturer = getManufacturerName(product)
  if (manufacturer) {
    rows.push({ key: 'manufacturer', labelKey: 'product.manufacturerLabel', value: manufacturer })
  }

  const country = getCountry(product)
  if (country) rows.push({ key: 'country', labelKey: 'product.countryOfOrigin', value: country })

  return rows
}
