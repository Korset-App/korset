import test from 'node:test'
import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import path from 'node:path'

import { BANNER_PRESETS, resolveBannerSrc } from '../../src/constants/bannerPresets.js'

async function assertPublicAssetExists(assetPath) {
  assert.match(assetPath, /^\//, `${assetPath} must be an absolute public asset path`)
  const filePath = path.join(process.cwd(), 'public', assetPath.slice(1))
  await access(filePath)
}

test('banner presets reference existing public image assets', async () => {
  for (const preset of BANNER_PRESETS) {
    await assertPublicAssetExists(preset.src)
    if (preset.thumb) await assertPublicAssetExists(preset.thumb)
  }
})

test('banner presets do not reference generated thumbnails ignored from deployment', () => {
  for (const preset of BANNER_PRESETS) {
    assert.equal(preset.thumb, undefined, `${preset.id} must use the tracked full-size asset`)
  }
})

test('resolveBannerSrc keeps preset banners on existing full-size assets', async () => {
  for (const preset of BANNER_PRESETS) {
    const resolved = resolveBannerSrc(`preset:${preset.id}`)
    assert.equal(resolved, preset.src)
    await assertPublicAssetExists(resolved)
  }
})
