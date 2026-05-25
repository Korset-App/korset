const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || '0')
const PROGRESS_FILE = path.join(__dirname, '..', 'data', `mustakshif-progress.json`)

const CONCURRENCY = 3
const TIMEOUT_MS = 6000

let progress = { checked: 0, yes: [], errors: [], checkedEans: [], startTime: Date.now() }
let running = true

const RESUME = process.argv.includes('--resume')

process.on('SIGINT', () => { running = false; saveProgress(); console.log('\n⚠️  Stopped by user. Progress saved.'); process.exit(0) })
process.on('SIGHUP', () => { running = false; saveProgress(); console.log('\n⚠️  HUP received. Progress saved.') })

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'))
      progress.checked = saved.checked || 0
      progress.yes = saved.yes || []
      progress.errors = saved.errors || []
      progress.checkedEans = saved.checkedEans || []
      progress.startTime = saved.startTime || Date.now()
      return saved
    } catch (e) { /* ignore */ }
  }
  return null
}

async function checkBarcode(ean) {
  const url = 'https://www.mustakshif.com/product/detail/' + ean
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      const html = await res.text()
      const m = html.match(/<title>([^<]*)<\/title>/i)
      const title = m ? m[1].trim() : ''
      if (title.includes('List of Products')) return null
      if (/is\s+Halal/i.test(title)) return 'yes'
      if (/is\s+not\s+Halal/i.test(title)) return 'no'
      return null
    } catch (e) {
      if (attempt === 1) { progress.errors.push(ean); return null }
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  return null
}

async function fetchAllProducts(skipEans) {
  const PAGE_SIZE = 1000
  let products = []
  let offset = 0
  let hasMore = true

  while (hasMore && running) {
    let q = sb
      .from('global_products')
      .select('ean, name')
      .eq('halal_status', 'unknown')
      .not('ean', 'like', 'arbuz_%')
      .not('ean', 'like', 'kaspi_%')
      .not('ean', 'like', 'korzinavdom_%')
      .not('ean', 'is', null)
      .gt('ean', '')
      .order('ean', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (BATCH_SIZE > 0) { q = q.limit(BATCH_SIZE); hasMore = false }

    const { data: page, error } = await q
    if (error) { console.error('DB error:', error); return null }

    if (page && page.length > 0) {
      if (skipEans && skipEans.size > 0) {
        const filtered = page.filter(p => !skipEans.has(p.ean))
        products = products.concat(filtered)
      } else {
        products = products.concat(page)
      }
      offset += PAGE_SIZE
      if (BATCH_SIZE > 0 && products.length >= BATCH_SIZE) { products = products.slice(0, BATCH_SIZE); hasMore = false }
    } else { hasMore = false }
  }
  return products
}

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║  Mustakshif Halal Batch Check           ║')
  console.log('║  Only YES results will be saved to DB   ║')
  console.log('║  Concurrency: ' + CONCURRENCY + ' | Timeout: ' + TIMEOUT_MS + 'ms           ║')
  console.log('╚══════════════════════════════════════════╝')
  if (DRY_RUN) console.log('  DRY RUN — no DB updates\n')

  let checkedEans = new Set()
  if (RESUME) {
    const saved = loadProgress()
    if (saved && saved.checkedEans && saved.checkedEans.length > 0) {
      checkedEans = new Set(saved.checkedEans)
      console.log(`Resume mode: ${saved.checkedEans.length} already checked, ${saved.yes.length} YES found, ${saved.errors.length} errors`)
    }
  }

  const products = await fetchAllProducts(checkedEans)
  if (!products) return
  const total = products.length
  console.log(`\nProducts to check: ${total}\n`)

  let queue = [...products]
  const cumulativeChecked = progress.checked || 0
  let checked = 0
  let batchYes = []

  const startTime = Date.now()

  while (queue.length > 0 && running) {
    const batch = queue.splice(0, CONCURRENCY)
    const results = await Promise.all(batch.map(p => checkBarcode(p.ean)))

    for (let i = 0; i < batch.length; i++) {
      const p = batch[i]
      checked++
      progress.checked = cumulativeChecked + checked
      progress.checkedEans.push(p.ean)

      if (results[i] === 'yes') {
        progress.yes.push(p.ean)
        batchYes.push(p.ean)
        console.log(`[${cumulativeChecked + checked}/${total + cumulativeChecked}] YES  ${p.ean}  ${(p.name || '').slice(0, 55)}`)
      }
    }

    const elapsed = (Date.now() - startTime) / 1000
    const rate = checked / elapsed
    const remaining = (total - checked) / rate
    const eta = remaining > 0 ? `${Math.round(remaining / 60)}m` : '?'

    if (checked % 10 === 0) {
      const ts = new Date().toLocaleTimeString()
      process.stdout.write(`\r  [${ts}] batch ${checked}/${total} (total ${cumulativeChecked + checked}) | YES: ${progress.yes.length} | ${rate.toFixed(1)}/s | ETA: ${eta}     \n`)
      saveProgress()
    }
  }

  console.log(`\n  Final: ${checked}/${total} checked | YES found: ${progress.yes.length}`)
  console.log(`  Errors: ${progress.errors.length}`)

  if (batchYes.length > 0 && !DRY_RUN) {
    console.log(`\nUpdating ${batchYes.length} products to halal_status = yes ...`)
    const { error } = await sb
      .from('global_products')
      .update({ halal_status: 'yes' })
      .in('ean', batchYes)
    if (error) console.error('DB update error:', error.message)
    else console.log('✅ Update complete.')
  } else if (batchYes.length > 0 && DRY_RUN) {
    console.log(`\nWould update ${batchYes.length} products (dry run).`)
    batchYes.slice(0, 10).forEach(e => console.log('  ' + e))
    if (batchYes.length > 10) console.log(`  ... and ${batchYes.length - 10} more`)
  }

  console.log(`\nTotal time: ${Math.round((Date.now() - startTime) / 60000)}m`)
  saveProgress()
}

main().catch(e => { console.error('Fatal:', e); saveProgress() })
