import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = 'public/profile-bgs'
const THUMB_DIR = 'public/profile-bgs/thumbs'

const banners = [
  {
    id: 'neutral-slate',
    name: 'Royal Sapphire (Королевский Сапфир)',
    // Deep navy/cobalt base with electric cyan and sapphire mesh. Zero pink!
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450">
        <defs>
          <filter id="meshBlur1" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="80" />
          </filter>
          <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#060c1d" />
            <stop offset="50%" stop-color="#0a1530" />
            <stop offset="100%" stop-color="#040814" />
          </linearGradient>
        </defs>
        <rect width="1200" height="450" fill="url(#bg1)" />
        <g filter="url(#meshBlur1)" opacity="0.92">
          <circle cx="280" cy="160" r="280" fill="#00d2ff" />
          <circle cx="860" cy="180" r="320" fill="#2563eb" />
          <circle cx="560" cy="100" r="240" fill="#38bdf8" />
          <circle cx="1020" cy="320" r="260" fill="#1d4ed8" />
          <circle cx="140" cy="340" r="240" fill="#4f46e5" />
          <ellipse cx="620" cy="370" rx="360" ry="180" fill="#0284c7" />
        </g>
      </svg>
    `,
  },
  {
    id: 'neutral-indigo',
    name: 'Northern Mint & Emerald (Северная Мята и Изумруд)',
    // Emerald, turquoise, cyan on deep forest night.
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450">
        <defs>
          <filter id="meshBlur2" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="80" />
          </filter>
          <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#021217" />
            <stop offset="50%" stop-color="#041e26" />
            <stop offset="100%" stop-color="#010a0e" />
          </linearGradient>
        </defs>
        <rect width="1200" height="450" fill="url(#bg2)" />
        <g filter="url(#meshBlur2)" opacity="0.92">
          <circle cx="260" cy="150" r="270" fill="#00f2fe" />
          <circle cx="870" cy="170" r="300" fill="#10b981" />
          <circle cx="560" cy="90" r="240" fill="#059669" />
          <circle cx="1040" cy="310" r="260" fill="#0d9488" />
          <circle cx="120" cy="350" r="230" fill="#0284c7" />
          <ellipse cx="620" cy="370" rx="360" ry="180" fill="#14b8a6" />
        </g>
      </svg>
    `,
  },
  {
    id: 'neutral-warm',
    name: 'Titanium & Champagne Gold (Титан и Золото)',
    // Deep obsidian with warm champagne/gold studio ambient glow. Ultra luxury.
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450">
        <defs>
          <filter id="meshBlur3" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="85" />
          </filter>
          <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0d0f14" />
            <stop offset="50%" stop-color="#141822" />
            <stop offset="100%" stop-color="#090a0e" />
          </linearGradient>
        </defs>
        <rect width="1200" height="450" fill="url(#bg3)" />
        <g filter="url(#meshBlur3)" opacity="0.88">
          <circle cx="300" cy="150" r="260" fill="#d97706" />
          <circle cx="860" cy="170" r="290" fill="#b45309" />
          <circle cx="580" cy="90" r="230" fill="#f59e0b" />
          <circle cx="1020" cy="320" r="240" fill="#78350f" />
          <circle cx="150" cy="350" r="230" fill="#334155" />
          <ellipse cx="600" cy="370" rx="350" ry="170" fill="#64748b" />
        </g>
      </svg>
    `,
  },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  await mkdir(THUMB_DIR, { recursive: true })

  for (const b of banners) {
    const svgBuffer = Buffer.from(b.svg)
    const outPath = join(OUT_DIR, `${b.id}.webp`)
    const thumbPath = join(THUMB_DIR, `${b.id}.webp`)

    await sharp(svgBuffer)
      .resize(1200, 450)
      .webp({ quality: 92, effort: 4 })
      .toFile(outPath)

    await sharp(svgBuffer)
      .resize(200, 75)
      .webp({ quality: 85, effort: 3 })
      .toFile(thumbPath)

    console.log(`✓ Generated ${b.id}.webp (${b.name})`)
  }
}

main().catch(console.error)
