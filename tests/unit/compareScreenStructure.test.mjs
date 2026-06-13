import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('src/screens/CompareScreen.jsx', 'utf8')
const cssSource = readFileSync('src/screens/CompareScreen.css', 'utf8')

test('CompareScreen consumes the shared comparison view model', () => {
  assert.match(
    source,
    /import \{ buildProductComparisonViewModel \} from '\.\.\/domain\/product\/comparisonViewModel\.js'/
  )
  assert.match(source, /const comparisonView = useMemo\(\(\) => \{/)
  assert.match(source, /buildProductComparisonViewModel\(\{ productA, productB, comparison, profile, lang \}\)/)
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

test('CompareScreen exposes state classes and accessible async UI', () => {
  assert.match(source, /import '\.\/CompareScreen\.css'/)
  assert.match(source, /compare-screen--\$\{comparisonView\?\.status/)
  assert.match(source, /compare-screen--\$\{comparisonView\?\.confidence/)
  assert.match(source, /aria-label=\{t\('common\.back'\)\}/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /aria-hidden="true"/)
  assert.equal(source.includes('transition: \'all'), false)
  assert.equal(source.includes('eslint-disable-line'), false)
})

test('CompareScreen uses SVG icons, not Material Symbols ligatures', () => {
  assert.match(source, /import \{ CompareIcon \} from '\.\.\/components\/icons\/CompareIcon\.jsx'/)
  assert.match(source, /<CompareIcon/)
  assert.equal(source.includes('material-symbols-outlined'), false)
  assert.equal(source.includes('compare_arrows'), false)
})

test('CompareScreen exposes clear visual verdict states', () => {
  assert.match(source, /getVerdictStateClass/)
  assert.match(source, /compare-verdict-card--winner-a/)
  assert.match(source, /compare-verdict-card--winner-b/)
  assert.match(source, /compare-verdict-card--draw/)
  assert.match(source, /compare-verdict-card--blocked/)
  assert.match(cssSource, /\.compare-verdict-card--winner-a/)
  assert.match(cssSource, /\.compare-verdict-card--winner-b/)
  assert.match(cssSource, /\.compare-verdict-card--draw/)
  assert.match(cssSource, /\.compare-verdict-card--blocked/)
})

test('CompareScreen always renders factor rows for all states', () => {
  assert.equal(source.includes('visibleFactors'), false)
  assert.match(source, /comparisonView\.topFactors\.map\(\(factor\)/)
})

test('CompareScreen renders concrete data rows before the verdict', () => {
  assert.match(source, /comparisonView\.dataRows\.map\(\(row\)/)
  assert.match(source, /compare-data-grid/)
  assert.match(source, /compare-data-row/)
  assert.ok(source.indexOf('compare-data-section') < source.indexOf('className={`compare-verdict-card'))
})

test('CompareScreen has no AI fallback text rendered on error', () => {
  assert.equal(source.includes("setAiText(t('compare.aiError')"), false)
  assert.equal(source.includes("setAiText(t('compare.aiLoading')"), false)
})

test('CompareScreen CSS has no glassmorphism', () => {
  assert.equal(cssSource.includes('backdrop-filter'), false)
  assert.equal(cssSource.includes('radial-gradient('), false)
})
