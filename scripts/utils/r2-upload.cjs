const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET || 'korset-images'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://cdn.korset.app'

const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif'
}

let _client = null

function getClient() {
  if (_client) return _client
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    }
  })
  return _client
}

function getExtFromUrl(url) {
  if (!url) return 'jpg'
  const match = url.match(/\.(png|jpe?g|gif|webp|avif)(?:\?|$)/i)
  if (match) return match[1].toLowerCase().replace('jpeg', 'jpg')
  return 'jpg'
}

function buildR2Key(ean, type, ext) {
  return `products/${ean}/${type}.${ext}`
}

function getPublicUrl(r2Key) {
  return `${R2_PUBLIC_URL}/${r2Key}`
}

async function downloadAndUpload(ean, url, type = 'main') {
  if (!url) return null
  if (url.includes('cdn.korset.app')) return { publicUrl: url, r2Key: null, alreadyOnR2: true }

  const client = getClient()
  if (!client) return null

  const ext = getExtFromUrl(url)
  const r2Key = buildR2Key(ean, type, ext)
  const publicUrl = getPublicUrl(r2Key)

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return null

    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/') && !ct.startsWith('application/octet-stream')) return null

    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 100) return null

    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: buf,
      ContentType: CONTENT_TYPES[ext] || 'image/jpeg'
    }))

    return { publicUrl, r2Key, size: buf.length }
  } catch {
    return null
  }
}

function inferSource(url) {
  if (!url) return null
  if (url.includes('openfoodfacts.org')) return 'openfoodfacts'
  if (url.includes('cdn-kaspi.kz')) return 'kaspi'
  if (url.includes('arbuz.kz')) return 'arbuz'
  if (url.includes('ean-db.com')) return 'ean-db'
  if (url.includes('cdn.korset.app')) return 'r2'
  return 'other'
}

function getImageTransformUrl(r2Key, { width = 400, format = 'auto', quality = 80 } = {}) {
  if (!r2Key) return null
  return `https://cdn.korset.app/cdn-cgi/image/width=${width},format=${format},quality=${quality}/${r2Key}`
}

module.exports = {
  getClient,
  downloadAndUpload,
  buildR2Key,
  getPublicUrl,
  getExtFromUrl,
  inferSource,
  getImageTransformUrl,
  R2_PUBLIC_URL
}
