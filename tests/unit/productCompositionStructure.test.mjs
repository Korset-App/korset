import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const APP = new URL('../../src/App.jsx', import.meta.url)
const ROUTES = new URL('../../src/utils/routes.js', import.meta.url)
const PRODUCT_SCREEN = new URL('../../src/screens/ProductScreen.jsx', import.meta.url)
const COMPOSITION_SCREEN = new URL('../../src/screens/ProductCompositionScreen.jsx', import.meta.url)
const PREVIEW_COMPONENT = new URL('../../src/components/product/IngredientsPreview.jsx', import.meta.url)
const SHEET_COMPONENT = new URL('../../src/components/product/IngredientInfoSheet.jsx', import.meta.url)

test('product screen delegates ingredients preview to the composition components', async () => {
  const [screenSource, previewSource, sheetSource] = await Promise.all([
    readFile(PRODUCT_SCREEN, 'utf8'),
    readFile(PREVIEW_COMPONENT, 'utf8'),
    readFile(SHEET_COMPONENT, 'utf8'),
  ])

  assert.match(
    screenSource,
    /import IngredientsPreview from '\.\.\/components\/product\/IngredientsPreview\.jsx'/
  )
  assert.doesNotMatch(screenSource, /import IngredientsBlock/)
  assert.match(screenSource, /<IngredientsPreview/)
  assert.match(previewSource, /analyzeProductIngredients/)
  assert.match(sheetSource, /export default function IngredientInfoSheet/)
})

test('composition screen has a store-scoped route and route helper', async () => {
  const [appSource, routesSource, compositionSource] = await Promise.all([
    readFile(APP, 'utf8'),
    readFile(ROUTES, 'utf8'),
    readFile(COMPOSITION_SCREEN, 'utf8'),
  ])

  assert.match(appSource, /ProductCompositionScreen/)
  assert.match(appSource, /\/s\/:storeSlug\/product\/:ean\/composition/)
  assert.match(routesSource, /export function buildProductCompositionPath/)
  assert.match(compositionSource, /export default function ProductCompositionScreen/)
  assert.match(compositionSource, /IngredientsPreview/)
})
