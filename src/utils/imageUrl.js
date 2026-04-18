const CDN_HOST = 'cdn.korset.app'

export function getImageUrl(url, options = {}) {
  if (!url) return null
  if (!url.includes(CDN_HOST)) return url
  return url
}

export function getThumbUrl(url) {
  return getImageUrl(url)
}

export function getPreviewUrl(url) {
  return getImageUrl(url)
}

export function getFullUrl(url) {
  return getImageUrl(url)
}
