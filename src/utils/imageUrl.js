const CDN_HOST = 'cdn.korset.app'

export function getImageUrl(url, { width, format = 'auto', quality = 80 } = {}) {
  if (!url) return null
  if (!width) return url
  if (!url.includes(CDN_HOST)) return url
  const path = url.replace(`https://${CDN_HOST}/`, '')
  return `https://${CDN_HOST}/cdn-cgi/image/width=${width},format=${format},quality=${quality}/${path}`
}

export function getThumbUrl(url) {
  return getImageUrl(url, { width: 200, quality: 60 })
}

export function getPreviewUrl(url) {
  return getImageUrl(url, { width: 400, quality: 80 })
}

export function getFullUrl(url) {
  return getImageUrl(url, { width: 800, quality: 85 })
}
