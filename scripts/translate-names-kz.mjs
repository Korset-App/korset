import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import https from 'https'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

const BATCH_SIZE = 10
const DELAY_MS = 1500

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function httpPost(urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const url = new URL(urlStr)
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname + url.search, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) },
      timeout: 30000,
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

async function translateBatch(items) {
  const lines = items.map((it, i) => `[${i + 1}] ${it.name}`).join('\n')

  const prompt = `Translate these food/drink product names from Russian to Kazakh. Rules:
- Keep brand names unchanged (Nutella, Coca-Cola, Lays, Ritter Sport, etc.)
- Translate descriptive parts naturally in Kazakh
- Keep weight/volume as-is (500 г, 1 л, 350 мл, etc.)
- Use standard Kazakh food terminology with proper Kazakh-specific letters: ә, ө, ұ, ү, і, ғ, қ, ң, һ
- For example: молоко → сүт, мясо → ет, сыр → ірімшік, хлеб → нан, кефир → қымыздық, шоколад → шоколад, сок → шырын, вода → су, масло → май, конфеты → кәмпит, мороженое → мұздық, чай → шәй, кофе → кофе
- Keep it concise, like a store shelf label
- Use Sentence case for descriptive parts (first word capitalized, rest lowercase)
- Do NOT use ALL CAPS
- Reply ONLY with translated lines in same [number] format, no other text

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
    max_tokens: 2000,
  })

  if (r.status !== 200) throw new Error('OpenAI ' + r.status + ': ' + r.body.substring(0, 200))

  const resp = JSON.parse(r.body)
  const text = resp.choices[0].message.content.trim()

  const results = []
  const re = /^\[(\d+)\]\s*(.+)$/gm
  let m
  while ((m = re.exec(text)) !== null) {
    const idx = parseInt(m[1], 10) - 1
    if (idx >= 0 && idx < items.length) {
      results.push({ id: items[idx].id, name_kz: m[2].trim() })
    }
  }
  return results
}

async function main() {
  const live = process.argv.includes('--live')
  const fixBad = process.argv.includes('--fix-bad')
  const limitArg = process.argv.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0

  if (!OPENAI_KEY) { console.error('OPENAI_API_KEY not set'); process.exit(1) }
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase keys not set'); process.exit(1) }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`\n${live ? '[LIVE]' : '[DRY RUN]'} Translate product names → Kazakh${fixBad ? ' (fix bad translations)' : ''}\n`)

  const allProducts = []
  let page = 0
  while (true) {
    const { data, error } = await sb
      .from('global_products')
      .select('id, name, name_kz')
      .eq('is_active', true)
      .range(page * 1000, (page + 1) * 1000 - 1)
      .order('id')

    if (error) { console.error('DB error:', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    allProducts.push(...data)
    page++
  }

  let toProcess
  if (fixBad) {
    const kzRe = /[әөұүіғқңһ]/
    const ruCatWords = ['сырок','напиток','сметана','кефир','молоко','мороженое','конфеты','шоколад','сок','чай','кофе','макароны','соус','пирожное','вареники','паста','масло','хлопья','сироп','лечо','горчица','маринад','шпроты','скумбрия','драже','сухарики','пломбир','коктейль','клетчатка','вафли','чиабатта','нектар','вода','чипсы','пряник','баранки','сушки','зефир','мармелад','халва','мёд','варенье','джем','повидло','желе','мюсли','каша','крупа','мука','майонез','уксус','кетчуп','томат','огурцы','помидоры','грибы','кукуруза','горошек','фасоль','оливки','капуста','морковь','свёкла','картофель','лук','чеснок','перец','баклажаны','кабачки','тыква','рис','гречка','овсянка','пшено','перловка','ячка','булгур','кускус','чечевица','горох','нут','семечки','орехи','изюм','курага','чернослив','финики','инжир','цукаты']

    const bad = allProducts.filter(p => {
      if (!p.name_kz || p.name_kz.trim() === '') return true
      if (p.name === p.name_kz) return true
      if (!kzRe.test(p.name_kz)) {
        const kzLower = p.name_kz.toLowerCase()
        if (ruCatWords.some(w => kzLower.includes(w))) return true
      }
      return false
    })

    console.log(`Bad translations to fix: ${bad.length}`)
    toProcess = limit > 0 ? bad.slice(0, limit) : bad
  } else {
    const missingKz = allProducts.filter(p => !p.name_kz || p.name_kz.trim() === '')
    toProcess = limit > 0 ? missingKz.slice(0, limit) : missingKz
    console.log(`Missing name_kz: ${missingKz.length}`)
  }

  console.log(`Total active products: ${allProducts.length}`)
  console.log(`Already have name_kz: ${allProducts.length - (fixBad ? 0 : allProducts.filter(p => !p.name_kz || p.name_kz.trim() === '').length)}`)
  console.log(`Will process: ${toProcess.length}\n`)

  if (toProcess.length === 0) {
    console.log('Nothing to translate!')
    return
  }

  if (!live) {
    console.log('Sample names to translate:')
    for (const p of toProcess.slice(0, 5)) {
      console.log(`  ${p.name}`)
    }
    console.log('\nRun with --live to apply translations.')
    return
  }

  let translated = 0
  let updated = 0
  let errors = 0
  const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE)

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const items = batch.map(p => ({ id: p.id, name: p.name }))

    process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} items): `)

    try {
      const results = await translateBatch(items)
      process.stdout.write(`${results.length} translated → `)

      if (results.length > 0) {
        const updateBatch = results.filter(r => r.name_kz && r.name_kz.length >= 2)
        for (const r of updateBatch) {
          const { error: updErr } = await sb
            .from('global_products')
            .update({ name_kz: r.name_kz })
            .eq('id', r.id)

          if (updErr) {
            errors++
          } else {
            updated++
          }
        }
        translated += results.length
        console.log(`${updateBatch.length} saved`)
      } else {
        errors += batch.length
        console.log('0 results (parse error)')
      }
    } catch (e) {
      errors += batch.length
      console.log(`ERROR: ${e.message}`)
    }

    if (batchNum % 50 === 0) {
      console.log(`  --- Progress: ${updated} saved, ${errors} errors ---`)
    }

    await sleep(DELAY_MS)
  }

  console.log(`\nTranslation complete:`)
  console.log(`  Translated by OpenAI: ${translated}`)
  console.log(`  Saved to DB:          ${updated}`)
  console.log(`  Errors:               ${errors}`)

  const { count: nowHaveKz } = await sb
    .from('global_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('name_kz', 'is', null)
    .neq('name_kz', '')

  console.log(`  Total with name_kz:   ${nowHaveKz} / ${allProducts.length}`)
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1) })
