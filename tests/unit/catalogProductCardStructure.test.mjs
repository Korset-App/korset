import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const CATALOG_SCREEN = new URL('../../src/screens/CatalogScreen.jsx', import.meta.url)
const SCAN_SCREEN = new URL('../../src/screens/ScanScreen.jsx', import.meta.url)
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

test('catalog compare entry points use the shared compare icon', async () => {
  const [screenSource, scanSource, cardSource] = await Promise.all([
    readFile(CATALOG_SCREEN, 'utf8'),
    readFile(SCAN_SCREEN, 'utf8'),
    readFile(CARD_COMPONENT, 'utf8'),
  ])

  assert.match(
    cardSource,
    /import \{ CompareIcon \} from '\.\.\/icons\/CompareIcon\.jsx'/
  )
  assert.match(
    screenSource,
    /import \{ CompareIcon \} from '\.\.\/components\/icons\/CompareIcon\.jsx'/
  )
  assert.match(scanSource, /import \{ CompareIcon \} from '\.\.\/components\/icons\/CompareIcon\.jsx'/)
  assert.match(cardSource, /<CompareIcon/)
  assert.match(screenSource, /<CompareIcon/)
  assert.match(scanSource, /<CompareIcon/)
  assert.doesNotMatch(screenSource, /compareIcon\s*=\s*[^\n]*barcode_scanner/)
})

test('catalog product badges use a distinct visual system', async () => {
  const [cardSource, cardCss] = await Promise.all([
    readFile(CARD_COMPONENT, 'utf8'),
    readFile(CARD_CSS, 'utf8'),
  ])

  assert.match(cardSource, /function VerdictIcon\s*\(/)
  assert.match(cardSource, /function AttributeIcon\s*\(/)
  assert.match(cardSource, /<VerdictIcon verdict=\{verdict\} \/>/)
  assert.match(cardSource, /<AttributeIcon badge=\{badge\} \/>/)
  assert.doesNotMatch(cardSource, /<span className="material-symbols-outlined">\{verdict\.icon\}<\/span>/)
  assert.doesNotMatch(cardSource, /<span className="material-symbols-outlined" aria-hidden="true">\s*\{badge\.icon\}\s*<\/span>/)
  assert.doesNotMatch(cardCss, /\.catalog-product-card__badge\s*\{[\s\S]*?border-radius:\s*999px/)
  assert.match(cardCss, /\.catalog-verdict-badge\.safe/)
  assert.match(cardCss, /\.catalog-product-card__badge--halal/)
})

test('catalog product list card has a narrow-mobile layout guard', async () => {
  const cardCss = await readFile(CARD_CSS, 'utf8')

  assert.match(cardCss, /@media\s*\(max-width:\s*360px\)/)
  assert.match(cardCss, /grid-template-columns:\s*76px minmax\(0, 1fr\)/)
  assert.match(cardCss, /\.catalog-product-card__thumb--list\s*\{[\s\S]*?width:\s*76px/)
  assert.match(cardCss, /\.catalog-product-card--list \.catalog-product-card__badges\[data-badge-count='3'\]/)
})

test('catalog product list card keeps badges on a stable lower baseline', async () => {
  const cardCss = await readFile(CARD_CSS, 'utf8')

  assert.match(cardCss, /\.catalog-product-card--list \.catalog-product-card__body\s*\{[\s\S]*?min-height:\s*80px/)
  assert.match(cardCss, /\.catalog-product-card--list \.catalog-product-card__badges\s*\{[\s\S]*?margin-top:\s*auto/)
  assert.match(cardCss, /@media\s*\(max-width:\s*360px\)\s*\{[\s\S]*?\.catalog-product-card--list \.catalog-product-card__body\s*\{[\s\S]*?min-height:\s*76px/)
})

test('catalog defaults to grid view and shows grid toggle first', async () => {
  const screenSource = await readFile(CATALOG_SCREEN, 'utf8')

  assert.match(screenSource, /sessionStorage\.getItem\('korset_catalog_view'\) \|\| 'grid'/)
  assert.match(
    screenSource,
    /className=\{`catalog-view-btn\$\{viewMode === 'grid'[\s\S]*?aria-label="Сетка"[\s\S]*?className=\{`catalog-view-btn\$\{viewMode === 'list'[\s\S]*?aria-label="Список"/
  )
})
