/* global FileReader */

export async function compressImage(file, maxDim, quality) {
  if (!file) throw new Error('no_file')

  let imgSource = null
  let width = 0
  let height = 0
  let cleanup = null

  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      imgSource = await window.createImageBitmap(file)
      width = imgSource.width
      height = imgSource.height
      cleanup = () => imgSource?.close?.()
    } catch {
      imgSource = null
    }
  }

  if (!imgSource) {
    const objectUrl = URL.createObjectURL(file)
    cleanup = () => URL.revokeObjectURL(objectUrl)
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = () => {
        width = img.naturalWidth || img.width
        height = img.naturalHeight || img.height
        imgSource = img
        resolve()
      }
      img.onerror = () => reject(new Error('image_load_failed'))
      img.src = objectUrl
    })
  }

  const ratio = Math.min(maxDim / width, maxDim / height, 1)
  const targetW = Math.max(1, Math.round(width * ratio))
  const targetH = Math.max(1, Math.round(height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imgSource, 0, 0, targetW, targetH)
  if (cleanup) cleanup()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('blob_failed'))),
      'image/jpeg',
      quality
    )
  })
}

export function compressAvatar(file) {
  return compressImage(file, 640, 0.86)
}

export function compressBanner(file) {
  return compressImage(file, 1200, 0.85).then(async (blob) => {
    if (blob.type === 'image/jpeg') return blob
    const img = new Image()
    const url = URL.createObjectURL(blob)
    return new Promise((resolve, reject) => {
      img.onload = () => {
        const MAX_W = 1200
        const MAX_H = 540
        let { width, height } = img
        const ratio = Math.min(MAX_W / width, MAX_H / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('blob_failed'))),
          'image/jpeg',
          0.85
        )
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('image_load_failed'))
      }
      img.src = url
    })
  })
}

export function compressSubmissionPhoto(file) {
  return compressImage(file, 1200, 0.78)
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/pjpeg', '']

export function isAllowedImageType(type) {
  if (!type) return true
  return type.startsWith('image/') || ALLOWED_TYPES.includes(type)
}

export function validateImageFile(file) {
  if (!file) return 'no_file'
  if (!isAllowedImageType(file.type)) return 'invalid_type'
  if (file.size > MAX_FILE_BYTES) return 'too_large'
  if (!navigator.onLine) return 'offline'
  return null
}
