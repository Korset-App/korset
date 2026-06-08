import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('src/screens/CompareScreen.jsx', 'utf8')

test('CompareScreen consumes the shared comparison view model', () => {
  assert.match(
    source,
    /import \{ buildProductComparisonViewModel \} from '\.\.\/domain\/product\/comparisonViewModel\.js'/
  )
  assert.match(source, /const comparisonView = useMemo\(\(\) => \{/)
  assert.match(source, /buildProductComparisonViewModel\(\{ productA, productB, comparison, profile \}\)/)
  assert.match(source, /comparisonView\.topFactors\.map\(\(factor\)/)
  assert.match(source, /t\(comparisonView\.verdictKey\)/)
  assert.match(source, /comparisonView\.profileNote/)
  assert.match(source, /comparisonView\.dataNote/)
})

test('CompareScreen no longer carries stale non-grocery comparison branches', () => {
  assert.equal(source.includes('FLAVOR_KEYWORDS'), false)
  assert.equal(source.includes("cat === 'electronics'"), false)
  assert.equal(source.includes("cat === 'diy'"), false)
  assert.equal(source.includes('function buildRows'), false)
  assert.equal(source.includes('function isBetter'), false)
})

test('CompareScreen exposes Stage 5 state classes and accessible async UI', () => {
  assert.match(source, /import '\.\/CompareScreen\.css'/)
  assert.match(source, /compare-screen--\$\{comparisonView\?\.status/)
  assert.match(source, /compare-screen--\$\{comparisonView\?\.confidence/)
  assert.match(source, /aria-label=\{t\('common\.back'\)\}/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /aria-hidden="true"/)
  assert.equal(source.includes('transition: \'all'), false)
  assert.equal(source.includes('eslint-disable-line'), false)
})
