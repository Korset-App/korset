/* global File */
/**
 * Compresses an image file client-side using HTML5 Canvas API.
 * Resizes the image to fit within maxWidth/maxHeight preserving aspect ratio.
 * Converts the image to JPEG format with the specified quality.
 *
 * @param {File} file - The original file from file input.
 * @param {Object} options
 * @param {number} options.maxWidth - Maximum allowed width (default 1200).
 * @param {number} options.maxHeight - Maximum allowed height (default 1200).
 * @param {number} options.quality - JPEG compression quality, from 0.0 to 1.0 (default 0.8).
 * @returns {Promise<Blob|File>} A promise that resolves to the compressed Blob (or original File on error).
 */
export function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = {}) {
  // If browser doesn't support canvas or file reader APIs, return original file
  if (typeof window === 'undefined' || !window.HTMLCanvasElement || !window.URL) {
    return Promise.resolve(file)
  }

  // Only compress images
  if (!file.type || !file.type.startsWith('image/')) {
    return Promise.resolve(file)
  }

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let width = img.width
      let height = img.height

      // Calculate new dimensions preserving aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file) // Fallback if canvas context is unavailable
        return
      }

      // Fill white background for JPEG transparency handling
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)

      // Draw the image
      ctx.drawImage(img, 0, 0, width, height)

      // Export as compressed JPEG blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Preserve filename and type properties by wrapping the blob in a File object if possible
            try {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } catch {
              resolve(blob) // Fallback to raw Blob if File constructor is unsupported
            }
          } else {
            resolve(file) // Fallback to original file if blob creation failed
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file) // Fallback to original file on image loading error
    }

    img.src = objectUrl
  })
}
