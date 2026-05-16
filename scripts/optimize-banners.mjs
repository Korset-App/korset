#!/usr/bin/env node
/**
 * Banner image optimizer for Korset.
 *
 * Usage:
 *   1. Drop source images (JPG/PNG/WebP) into public/profile-bgs/raw/
 *   2. Rename them to match the ids in bannerPresets.js, e.g.
 *      samurai-sunset.jpg, stargazer-night.png, etc.
 *   3. Run: npm run optimize:banners
 *
 * What it does:
 *   • Resizes to max 1200px width (keeps aspect ratio, enough for 2× mobile
 *     retina and banner crop).
 *   • Converts to WebP with quality 85 — ~30% smaller than JPEG at same
 *     visual fidelity.
 *   • Generates a 200×75px thumbnail preview for the banner picker UI.
 *   • Prints size reduction stats so you can verify the trade-off.
 */

import { mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const RAW_DIR = 'public/profile-bgs/raw'
const OUT_DIR = 'public/profile-bgs'
const THUMB_DIR = 'public/profile-bgs/thumbs'

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true })
  } catch { /* noop */ }
}

async function optimizeFile(filename) {
  const inputPath = join(RAW_DIR, filename)
  const base = filename.replace(/\.(jpe?g|png|webp|gif)$/i, '')
  const outputPath = join(OUT_DIR, `${base}.webp`)
  const thumbPath = join(THUMB_DIR, `${base}.webp`)

  const img = sharp(inputPath, { animated: false })
  const meta = await img.metadata()

  // Main banner: max 1200px wide, WebP q85, progressive.
  // For portrait-ish source images we still cap width because the profile
  // banner card is roughly 16:5 landscape.
  await img
    .resize({
      width: 1200,
      height: 450,
      fit: 'cover',
      position: 'centre',
    })
    .webp({
      quality: 85,
      effort: 4,        // 0-6, 4 is a good CPU/size sweet spot
      smartSubsample: true,
    })
    .toFile(outputPath)

  // Thumbnail for banner picker (small grid preview)
  await sharp(inputPath)
    .resize({
      width: 200,
      height: 75,
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 80, effort: 3 })
    .toFile(thumbPath)

  const inStat = await stat(inputPath)
  const outStat = await stat(outputPath)
  const saved = inStat.size - outStat.size
  const pct = ((saved / inStat.size) * 100).toFixed(1)

  console.log(
    `  ✓ ${base}: ${(inStat.size / 1024).toFixed(0)}kB → ` +
    `${(outStat.size / 1024).toFixed(0)}kB WebP (${pct}% saved)`
  )
}

async function main() {
  await ensureDir(RAW_DIR)
  await ensureDir(OUT_DIR)
  await ensureDir(THUMB_DIR)

  const files = (await readdir(RAW_DIR)).filter((f) =>
    /\.(jpe?g|png|webp|gif)$/i.test(f)
  )

  if (files.length === 0) {
    console.log(`No images found in ${RAW_DIR}`)
    console.log('Drop your banner source images there and run again.')
    process.exit(0)
  }

  console.log(`Optimizing ${files.length} banner(s)…`)
  for (const file of files) {
    try {
      await optimizeFile(file)
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`)
    }
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
