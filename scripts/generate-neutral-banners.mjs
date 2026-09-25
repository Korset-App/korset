import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = 'public/profile-bgs'
const THUMB_DIR = 'public/profile-bgs/thumbs'

const banners = [
  {
    id: 'neutral-slate',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f141c" />
            <stop offset="35%" stop-color="#18202c" />
            <stop offset="70%" stop-color="#243042" />
            <stop offset="100%" stop-color="#121822" />
          </linearGradient>
          <radialGradient id="sheen" cx="50%" cy="15%" r="65%">
            <stop offset="0%" stop-color="#3b4b63" stop-opacity="0.5" />
            <stop offset="50%" stop-color="#243042" stop-opacity="0.15" />
            <stop offset="100%" stop-color="#0f141c" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="subtleGlow" cx="85%" cy="85%" r="50%">
            <stop offset="0%" stop-color="#2c3a50" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#0f141c" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="lineAccent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#475569" stop-opacity="0" />
            <stop offset="50%" stop-color="#94a3b8" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#475569" stop-opacity="0" />
          </linearGradient>
        </defs>
        <rect width="1200" height="450" fill="url(#bgGrad)" />
        <rect width="1200" height="450" fill="url(#sheen)" />
        <rect width="1200" height="450" fill="url(#subtleGlow)" />
        <line x1="150" y1="1" x2="1050" y2="1" stroke="url(#lineAccent)" stroke-width="1.5" />
      </svg>
    `,
  },
  {
    id: 'neutral-indigo',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0a0d1a" />
            <stop offset="40%" stop-color="#121830" />
            <stop offset="75%" stop-color="#1c2347" />
            <stop offset="100%" stop-color="#0f1326" />
          </linearGradient>
          <radialGradient id="violetMist" cx="65%" cy="20%" r="60%">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35" />
            <stop offset="45%" stop-color="#4338ca" stop-opacity="0.12" />
            <stop offset="100%" stop-color="#0a0d1a" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="skyMist" cx="15%" cy="75%" r="50%">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.22" />
            <stop offset="50%" stop-color="#0284c7" stop-opacity="0.06" />
            <stop offset="100%" stop-color="#0a0d1a" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="topBorder" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0" />
            <stop offset="50%" stop-color="#a5b4fc" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
          </linearGradient>
        </defs>
        <rect width="1200" height="450" fill="url(#bgGrad)" />
        <rect width="1200" height="450" fill="url(#violetMist)" />
        <rect width="1200" height="450" fill="url(#skyMist)" />
        <line x1="150" y1="1" x2="1050" y2="1" stroke="url(#topBorder)" stroke-width="1.5" />
      </svg>
    `,
  },
  {
    id: 'neutral-warm',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#141010" />
            <stop offset="35%" stop-color="#211a17" />
            <stop offset="70%" stop-color="#322722" />
            <stop offset="100%" stop-color="#181311" />
          </linearGradient>
          <radialGradient id="warmGlow" cx="45%" cy="20%" r="65%">
            <stop offset="0%" stop-color="#d97706" stop-opacity="0.3" />
            <stop offset="45%" stop-color="#92400e" stop-opacity="0.1" />
            <stop offset="100%" stop-color="#141010" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="bronzeTouch" cx="80%" cy="80%" r="50%">
            <stop offset="0%" stop-color="#78350f" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#141010" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="topBorder" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#b45309" stop-opacity="0" />
            <stop offset="50%" stop-color="#fcd34d" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#b45309" stop-opacity="0" />
          </linearGradient>
        </defs>
        <rect width="1200" height="450" fill="url(#bgGrad)" />
        <rect width="1200" height="450" fill="url(#warmGlow)" />
        <rect width="1200" height="450" fill="url(#bronzeTouch)" />
        <line x1="150" y1="1" x2="1050" y2="1" stroke="url(#topBorder)" stroke-width="1.5" />
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
      .webp({ quality: 90, effort: 4 })
      .toFile(outPath)

    await sharp(svgBuffer)
      .resize(200, 75)
      .webp({ quality: 85, effort: 3 })
      .toFile(thumbPath)

    console.log(`✓ Generated ${b.id}.webp and thumb`)
  }
}

main().catch(console.error)
