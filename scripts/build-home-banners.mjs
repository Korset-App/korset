import { stat } from 'node:fs/promises'
import sharp from 'sharp'

const TARGET_WIDTH = 1200
const TARGET_HEIGHT = 675 // 16:9

async function generateScanBanner() {
  const input = 'public/banners/scan-barcode-reveal.webp'
  const output = 'public/banners/banner-scan.webp'

  // Resize and optimize to exact 1200x675 with high visual fidelity
  await sharp(input)
    .resize({
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      fit: 'cover',
      position: 'right',
    })
    .webp({ quality: 86, effort: 4 })
    .toFile(output)

  const s = await stat(output)
  console.log(`✓ banner-scan.webp: ${(s.size / 1024).toFixed(1)} KB`)
}

async function featherLeft(imageBuffer, width, height, featherPercent = 35) {
  const maskSvg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#000" stop-opacity="0" />
          <stop offset="${featherPercent}%" stop-color="#000" stop-opacity="1" />
          <stop offset="100%" stop-color="#000" stop-opacity="1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#fade)" />
    </svg>
  `)

  return sharp(imageBuffer)
    .ensureAlpha()
    .composite([
      {
        input: maskSvg,
        blend: 'dest-in',
      },
    ])
    .toBuffer()
}

async function generateFitBanner() {
  const input = 'public/stories/fit.png'
  const output = 'public/banners/banner-fit.webp'

  // Extract apple and pedestal, scale height to 640
  const extractW = 760
  const extractH = 820
  const scaledH = 640
  const scaledW = Math.round((extractW / extractH) * scaledH) // ~593

  const rawExtract = await sharp(input)
    .extract({ left: 130, top: 260, width: extractW, height: extractH })
    .resize({ width: scaledW, height: scaledH, fit: 'fill' })
    .toBuffer()

  const feathered = await featherLeft(rawExtract, scaledW, scaledH, 40)

  // Background matching the soft blue-gray studio gradient of fit.png (#eef4f7 to #d9e7ed)
  const svgBg = Buffer.from(`
    <svg width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f4f8fa" />
          <stop offset="45%" stop-color="#ecf3f6" />
          <stop offset="85%" stop-color="#dfeaef" />
          <stop offset="100%" stop-color="#d6e4ea" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#fitGrad)" />
    </svg>
  `)

  await sharp(svgBg)
    .composite([
      {
        input: feathered,
        top: 20,
        left: TARGET_WIDTH - scaledW - 10,
      },
    ])
    .webp({ quality: 86, effort: 4 })
    .toFile(output)

  const s = await stat(output)
  console.log(`✓ banner-fit.webp: ${(s.size / 1024).toFixed(1)} KB`)
}

async function generateStoreBanner() {
  const input = 'public/stories/store.png'
  const output = 'public/banners/banner-store.webp'

  const extractW = 960
  const extractH = 1140
  const scaledH = 650
  const scaledW = Math.round((extractW / extractH) * scaledH) // ~547

  const rawExtract = await sharp(input)
    .extract({ left: 32, top: 100, width: extractW, height: extractH })
    .resize({ width: scaledW, height: scaledH, fit: 'fill' })
    .toBuffer()

  const feathered = await featherLeft(rawExtract, scaledW, scaledH, 30)

  // Background matching warm off-white studio look (#faf7f2 to #ece5db)
  const svgBg = Buffer.from(`
    <svg width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="storeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fdfbf8" />
          <stop offset="45%" stop-color="#f7f3ec" />
          <stop offset="80%" stop-color="#eee7dc" />
          <stop offset="100%" stop-color="#e7ded0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#storeGrad)" />
    </svg>
  `)

  await sharp(svgBg)
    .composite([
      {
        input: feathered,
        top: 15,
        left: TARGET_WIDTH - scaledW - 15,
      },
    ])
    .webp({ quality: 86, effort: 4 })
    .toFile(output)

  const s = await stat(output)
  console.log(`✓ banner-store.webp: ${(s.size / 1024).toFixed(1)} KB`)
}

async function generateAiBanner() {
  const input = 'public/stories/ai.png'
  const output = 'public/banners/banner-ai.webp'

  const extractW = 920
  const extractH = 1120
  const scaledH = 645
  const scaledW = Math.round((extractW / extractH) * scaledH) // ~530

  const rawExtract = await sharp(input)
    .extract({ left: 52, top: 120, width: extractW, height: extractH })
    .resize({ width: scaledW, height: scaledH, fit: 'fill' })
    .toBuffer()

  const feathered = await featherLeft(rawExtract, scaledW, scaledH, 45)

  // Background matching the lavender-purple studio background
  const svgBg = Buffer.from(`
    <svg width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#9375e7" />
          <stop offset="40%" stop-color="#8e6fe6" />
          <stop offset="80%" stop-color="#8564e4" />
          <stop offset="100%" stop-color="#7a55df" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#aiGrad)" />
    </svg>
  `)

  await sharp(svgBg)
    .composite([
      {
        input: feathered,
        top: 15,
        left: TARGET_WIDTH - scaledW - 15,
      },
    ])
    .webp({ quality: 86, effort: 4 })
    .toFile(output)

  const s = await stat(output)
  console.log(`✓ banner-ai.webp: ${(s.size / 1024).toFixed(1)} KB`)
}

async function main() {
  console.log('Generating high-performance 16:9 banner visuals...')
  await generateScanBanner()
  await generateFitBanner()
  await generateStoreBanner()
  await generateAiBanner()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
