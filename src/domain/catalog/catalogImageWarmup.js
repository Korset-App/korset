import { CATEGORY_SHOWCASE_ORDER, getCategoryShowcase } from '../product/catalogShowcase.js'

const images = new Map()

function loadImage(src) {
  if (images.has(src)) return images.get(src).ready
  const image = new Image()
  image.decoding = 'async'
  image.fetchPriority = 'low'
  const ready = new Promise((resolve) => {
    image.onload = async () => {
      try {
        await image.decode()
      } catch {
        /* Loaded images remain usable without decode(). */
      }
      resolve()
    }
    image.onerror = () => {
      images.delete(src)
      resolve()
    }
  })
  images.set(src, { image, ready })
  image.src = src
  return ready
}

export async function preloadCatalogImages(limit = CATEGORY_SHOWCASE_ORDER.length) {
  if (typeof Image === 'undefined') return
  const sources = CATEGORY_SHOWCASE_ORDER.slice(0, limit).map(
    (key) => getCategoryShowcase(key).image
  )
  for (let index = 0; index < sources.length; index += 3) {
    await Promise.all(sources.slice(index, index + 3).map(loadImage))
  }
}
