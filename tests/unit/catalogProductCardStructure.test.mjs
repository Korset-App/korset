import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const CATALOG_SCREEN = new URL('../../src/screens/CatalogScreen.jsx', import.meta.url)
const CARD_COMPONENT = new URL('../../src/components/catalog/CatalogProductCard.jsx', import.meta.url)
const CARD_CSS = new URL('../../src/components/catalog/CatalogProductCard.css', import.meta.url)

test('CatalogScreen delegates catalog product cards to a dedicated component', async () => {
  const [screenSource, cardSource, cardCss] = await Promise.all([
    readFile(CATALOG_SCREEN, 'utf8'),
    readFile(CARD_COMPONENT, 'utf8'),
    readFile(CARD_CSS, 'utf8'),
  ])

  assert.match(
    screenSource,
    /import CatalogProductCard from '\.\.\/components\/catalog\/CatalogProductCard\.jsx'/
  )
  assert.doesNotMatch(screenSource, /function ProductThumb\s*\(/)
  assert.match(screenSource, /<CatalogProductCard\s+mode="grid"/)
  assert.match(screenSource, /<CatalogProductCard\s+mode="list"/)
  assert.match(cardSource, /export default function CatalogProductCard/)
  assert.match(cardSource, /function ProductThumb\s*\(/)
  assert.match(cardSource, /mode === 'grid'/)
  assert.match(cardCss, /\.catalog-product-card/)
})
