const fs = require('fs')
const path = require('path')
const https = require('https')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

const BATCH_SIZE = 15
const DELAY_MS = 2000

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function httpPost(urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const url = new URL(urlStr)
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname + url.search, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) },
      timeout: 60000,
    }, res => {
      let d = ''
      res.on('data', c => { d += c })
      res.on('end', () => resolve({ status: res.statusCode, body: d }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(data)
    req.end()
  })
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { dryRun: false, limit: 0 }
  for (const arg of args) {
    if (arg === '--dry-run') result.dryRun = true
    else if (arg.startsWith('--limit=')) result.limit = parseInt(arg.split('=')[1], 10)
  }
  return result
}

async function translateBatch(items) {
  const lines = items.map((it, i) => `[${i + 1}] ${it.text}`).join('\n')
  const prompt = `Translate these food ingredient lists to Russian. Keep the same format (comma-separated). Translate ALL terms. Use standard Russian food terminology. Reply ONLY with translated lines in same [number] format, no other text.

${lines}`

  const openAiBaseUrl = process.env.OPENAI_API_BASE_URL
  const base = openAiBaseUrl || 'https://api.openai.com/v1'
  const fetchUrl = `${base.replace(/\/+$/, '')}/chat/completions`
  const headers = {
    'Authorization': 'Bearer ' + OPENAI_KEY,
    'Content-Type': 'application/json',
  }
  if (fetchUrl.includes('.azure.com') || fetchUrl.includes('.services.ai.azure.com')) {
    headers['api-key'] = OPENAI_KEY
  }

  const r = await httpPost(fetchUrl, headers, {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 4000,
  })

  if (r.status !== 200) throw new Error('OpenAI error: ' + r.status + ' ' + r.body.substring(0, 200))

  const resp = JSON.parse(r.body)
  const text = resp.choices[0].message.content.trim()

  const results = []
  const re = /^\[(\d+)\]\s*(.+)$/gm
  let m
  while ((m = re.exec(text)) !== null) {
    const idx = parseInt(m[1], 10) - 1
    if (idx >= 0 && idx < items.length) {
      results.push({ id: items[idx].id, translated: m[2].trim() })
    }
  }
  return results
}

async function main() {
  const opts = parseArgs()
  if (!OPENAI_KEY) { console.error('OPENAI_API_KEY not set'); process.exit(1) }
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase keys not set'); process.exit(1) }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const allProducts = []
  let page = 0
  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select('id, name, ingredients_raw, source_primary')
      .eq('is_active', true)
      .range(page * 500, (page + 1) * 500 - 1)
      .order('id')
    if (error) { console.error('DB error:', error); process.exit(1) }
    if (!data || data.length === 0) break
    allProducts.push(...data)
    page++
  }

  const withComp = allProducts.filter(p => p.ingredients_raw && p.ingredients_raw.trim())
  const nonRussian = withComp.filter(p => !/[а-яА-ЯёЁ]/.test(p.ingredients_raw))
  const toProcess = opts.limit > 0 ? nonRussian.slice(0, opts.limit) : nonRussian

  console.log(`Total with non-Russian composition: ${nonRussian.length}`)
  console.log(`Will process: ${toProcess.length}`)
  if (opts.dryRun) console.log('DRY RUN - no DB updates')

  let translated = 0, errors = 0

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE)
    const items = batch.map(p => ({
      id: p.id,
      text: p.ingredients_raw.substring(0, 500),
      name: p.name,
    }))

    process.stdout.write(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items): `)

    try {
      const results = await translateBatch(items)
      console.log(`${results.length} translated`)

      for (const r of results) {
        if (!r.translated || r.translated.length < 5) {
          errors++
          continue
        }
        if (!opts.dryRun) {
          const { error: updErr } = await sb.from('global_products')
            .update({ ingredients_raw: r.translated, updated_at: new Date().toISOString() })
            .eq('id', r.id)
          if (updErr) { errors++; console.log('    DB error:', updErr.message) }
          else translated++
        } else {
          translated++
        }
      }
    } catch (e) {
      errors += batch.length
      console.log(`ERROR: ${e.message}`)
    }

    await sleep(DELAY_MS)
  }

  console.log(`\nTranslated: ${translated}, Errors: ${errors}`)
}

main().catch(e => { console.error(e); process.exit(1) })
