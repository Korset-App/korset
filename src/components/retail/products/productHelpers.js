import { getImageUrl } from '../../../utils/imageUrl.js'

export function displayName(p) {
  return p.local_name || p.global_products?.name || p.ean
}

export function displayBrand(p) {
  return p.global_products?.brand ?? null
}

export function displayImage(p) {
  return getImageUrl(p.global_products?.image_url) ?? null
}

export function isInStock(p) {
  return p.stock_status !== 'out_of_stock'
}

export function nextStockStatus(p) {
  return ['in_stock', 'low_stock'].includes(p.stock_status) ? 'out_of_stock' : 'in_stock'
}
