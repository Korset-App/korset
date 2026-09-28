import fs from 'node:fs'
import readline from 'node:readline'
import { extractNormalizedWeight, extractFatPercent } from './utils/retail-tokenizer.mjs'

// 1. Load all manufacturer sources
const officialSources = []

// KDV
const kdvPath = 'scratch/kdv-group-night/food-products-derived.jsonl'
if (fs.existsSync(kdvPath)) {
  for (const line of fs.readFileSync(kdvPath, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const r = JSON.parse(line)
    officialSources.push({
      source: 'kdv_group',
      sourceId: r.sourceId,
      name: `${r.name} ${r.package_quantity_raw || ''}`.trim(),
      brand: r.brand || null,
      ingredients: r.ingredients_raw || null,
      nutrition: r.nutriments_json || null,
      sourceUrl: r.sourceUrl
    })
  }
}

// FoodMaster
const fmPath = 'scratch/foodmaster-night/products-derived.jsonl'
if (fs.existsSync(fmPath)) {
  for (const line of fs.readFileSync(fmPath, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const r = JSON.parse(line)
    officialSources.push({
      source: 'foodmaster_official',
      sourceId: r.sourceId,
      name: r.name,
      brand: r.brand || 'FoodMaster',
      ingredients: r.ingredients_raw || null,
      nutrition: r.nutriments_json || null,
      sourceUrl: r.sourceUrl
    })
  }
}

// Rakhat
const rakhatPath = 'scratch/rakhat-night/products-derived.jsonl'
if (fs.existsSync(rakhatPath)) {
  for (const line of fs.readFileSync(rakhatPath, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const r = JSON.parse(line)
    officialSources.push({
      source: 'rakhat_official',
      sourceId: r.sourceId,
      name: `Рахат ${r.name}`,
      brand: 'Рахат',
      ingredients: r.ingredients_raw || null,
      nutrition: r.nutriments_json || null,
      sourceUrl: r.sourceUrl
    })
  }
}

// Bayan Sulu
const bsPath = 'data/bayansulu_official_catalog.json'
if (fs.existsSync(bsPath)) {
  const bs = JSON.parse(fs.readFileSync(bsPath, 'utf8'))
  for (const r of bs) {
    officialSources.push({
      source: 'bayansulu_official',
      sourceId: r.url,
      name: `Баян Сулу ${r.title}`,
      brand: 'Баян Сулу',
      ingredients: null,
      nutrition: r.nutriments || null,
      sourceUrl: r.url
    })
  }
}

// Sultan
const sultanPath = 'data/sultan_official_catalog.json'
if (fs.existsSync(sultanPath)) {
  const s = JSON.parse(fs.readFileSync(sultanPath, 'utf8'))
  for (const r of s) {
    const nutr = (r.protein != null && r.fat != null) ? {
      energy_kcal: Number(r.calories) || null,
      protein_100g: Number(r.protein) || 0,
      fat_100g: Number(r.fat) || 0,
      carbohydrates_100g: Number(r.carbs) || 0
    } : null
    officialSources.push({
      source: 'sultan_official',
      sourceId: r.modalId || r.title,
      name: `Султан ${r.title} ${r.weight || ''}`.trim(),
      brand: 'Султан',
      ingredients: r.composition || null,
      nutrition: nutr,
      sourceUrl: r.source_url
    })
  }
}

// Savushkin
const savushkinPath = 'data/savushkin_official_catalog.json'
if (fs.existsSync(savushkinPath)) {
  const sav = JSON.parse(fs.readFileSync(savushkinPath, 'utf8'))
  for (const r of sav) {
    const nutr = (r.protein != null && r.fat != null) ? {
      energy_kcal: Number(r.calories) || null,
      protein_100g: Number(r.protein) || 0,
      fat_100g: Number(r.fat) || 0,
      carbohydrates_100g: Number(r.carbs) || 0
    } : null
    officialSources.push({
      source: 'savushkin_official',
      sourceId: r.source_url,
      name: `Савушкин ${r.title}`.trim(),
      brand: r.brand || 'Савушкин',
      ingredients: null,
      nutrition: nutr,
      sourceUrl: r.source_url
    })
  }
}

// Agusha
const agushaPath = 'data/agusha_official_catalog.json'
if (fs.existsSync(agushaPath)) {
  const ag = JSON.parse(fs.readFileSync(agushaPath, 'utf8'))
  for (const r of ag) {
    officialSources.push({
      source: 'agusha_official',
      sourceId: r.url,
      name: r.name || r.originalTitle,
      brand: 'Агуша',
      ingredients: r.composition || null,
      nutrition: r.nutriments || null,
      sourceUrl: r.url
    })
  }
}

// FrutoNyanya
const fnPath = 'data/frutonyanya_official_catalog.json'
if (fs.existsSync(fnPath)) {
  const fn = JSON.parse(fs.readFileSync(fnPath, 'utf8'))
  for (const r of fn) {
    const nutr = (r.protein != null && r.fat != null) ? {
      energy_kcal: Number(r.calories) || null,
      protein_100g: Number(r.protein) || 0,
      fat_100g: Number(r.fat) || 0,
      carbohydrates_100g: Number(r.carbs) || 0
    } : null
    officialSources.push({
      source: 'frutonyanya_official',
      sourceId: r.source_url,
      name: r.title || `ФрутоНяня ${r.product_name}`.trim(),
      brand: 'ФрутоНяня',
      ingredients: r.composition || null,
      nutrition: nutr,
      sourceUrl: r.source_url
    })
  }
}

// Makfa
const makfaPath = 'data/makfa_official_catalog.json'
if (fs.existsSync(makfaPath)) {
  const mf = JSON.parse(fs.readFileSync(makfaPath, 'utf8'))
  for (const r of mf) {
    officialSources.push({
      source: 'makfa_official',
      sourceId: r.url,
      name: r.name || r.originalTitle,
      brand: 'Makfa',
      ingredients: r.composition || null,
      nutrition: r.nutriments || null,
      sourceUrl: r.url
    })
  }
}

// Uvelka
const uvelkaPath = 'data/uvelka_official_catalog.json'
if (fs.existsSync(uvelkaPath)) {
  const uv = JSON.parse(fs.readFileSync(uvelkaPath, 'utf8'))
  for (const r of uv) {
    const nutr = (r.protein != null && r.fat != null) ? {
      energy_kcal: Number(r.calories) || null,
      protein_100g: Number(r.protein) || 0,
      fat_100g: Number(r.fat) || 0,
      carbohydrates_100g: Number(r.carbs) || 0
    } : null
    officialSources.push({
      source: 'uvelka_official',
      sourceId: r.source_url,
      name: r.title,
      brand: 'Увелка',
      ingredients: r.composition || null,
      nutrition: nutr,
      sourceUrl: r.source_url
    })
  }
}

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[«»""''.,/\\()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const flavors = [
  'чеснок', 'чесноком', 'гриб', 'грибами', 'зелен', 'зеленью', 'томат', 'томатами', 'паприк', 'паприкой',
  'бекон', 'беконом', 'сыр', 'сыром', 'малин', 'малиной', 'вишн', 'вишней', 'клубник', 'клубникой',
  'яблок', 'яблоком', 'лимон', 'лимоном', 'апельсин', 'апельсином', 'шоколад', 'шоколадом', 'ваниль', 'ванилью',
  'халв', 'халвой', 'орех', 'орехом', 'арахис', 'арахисом', 'миндал', 'миндалем', 'фундук', 'фундуком',
  'кокос', 'кокосом', 'клюкв', 'клюквой', 'смородин', 'смородиной', 'черник', 'черникой', 'земляник', 'земляникой',
  'персик', 'персиком', 'абрикос', 'абрикосом', 'банан', 'бананом', 'карамел', 'карамелью', 'сгущен', 'сгущенкой',
  'кориц', 'корицей', 'имбир', 'имбирем', 'мята', 'мятн', 'мятные'
]

const cereals = [
  'гречн', 'гречка', 'рис', 'рисов', 'перлов', 'овсян', 'манн', 'пшен', 'кукуруз', 'пшеничн',
  'спагетти', 'спирал', 'перья', 'рожки', 'вермишель', 'лапша', 'ракушки', 'гнезда'
]

const meats = [
  'говядин', 'свинин', 'куриц', 'индейк', 'гусин', 'печен', 'индейк', 'цыпленок', 'шпрот', 'сардин', 'тунец', 'сайра'
]

const specialModifiers = [
  'безлактозн', 'детск', 'диетическ', 'обезжиренн', 'цельнозернов', 'отрубн', 'био', 'эко'
]

function getConflict(tNorm, sNorm) {
  for (const f of flavors) {
    if (tNorm.includes(f) !== sNorm.includes(f)) {
      const opposing = flavors.filter(x => x !== f && (tNorm.includes(x) || sNorm.includes(x)))
      if (opposing.length > 0) return `flavor_mismatch_${f}`
    }
  }
  for (const c of cereals) {
    if (tNorm.includes(c) !== sNorm.includes(c)) {
      const opposing = cereals.filter(x => x !== c && (tNorm.includes(x) || sNorm.includes(x)))
      if (opposing.length > 0) return `cereal_mismatch_${c}`
    }
  }
  for (const m of meats) {
    if (tNorm.includes(m) !== sNorm.includes(m)) {
      const opposing = meats.filter(x => x !== m && (tNorm.includes(x) || sNorm.includes(x)))
      if (opposing.length > 0) return `meat_mismatch_${m}`
    }
  }
  for (const mod of specialModifiers) {
    if (tNorm.includes(mod) !== sNorm.includes(mod)) {
      return `modifier_mismatch_${mod}`
    }
  }
  return null
}

// Build inverted index on tokens
const donorIndex = new Map()
for (let i = 0; i < officialSources.length; i++) {
  const d = officialSources[i]
  d.normName = normalize(d.name)
  d.weight = extractNormalizedWeight(d.name)
  d.fat = extractFatPercent(d.name)
  d.tokens = d.normName.split(' ').filter(w => w.length > 2)
  for (const token of d.tokens) {
    if (!donorIndex.has(token)) donorIndex.set(token, [])
    donorIndex.get(token).push(i)
  }
}

const masterPath = 'data/korset_master_catalog_v4_final.jsonl'
const stream = fs.createReadStream(masterPath, 'utf8')
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

let totalTargets = 0
let verifiedCandidates = []

for await (const line of rl) {
  if (!line.trim()) continue
  const target = JSON.parse(line)
  if (!target.image_url || /empty_photo\.svg/i.test(target.image_url) || ['household', 'personal_care'].includes(target.category)) continue
  totalTargets++

  const tNorm = normalize(target.name)
  const tWeight = extractNormalizedWeight(target.name)
  const tFat = extractFatPercent(target.name)
  const tTokens = tNorm.split(' ').filter(w => w.length > 2)

  const donorCounts = new Map()
  for (const token of tTokens) {
    const list = donorIndex.get(token)
    if (list) {
      for (const idx of list) {
        donorCounts.set(idx, (donorCounts.get(idx) || 0) + 1)
      }
    }
  }

  let bestCandidate = null
  let bestRatio = 0

  for (const [donorIdx, sharedCount] of donorCounts) {
    if (sharedCount < 2) continue
    const donor = officialSources[donorIdx]

    // Brand match
    if (donor.brand) {
      const bNorm = normalize(donor.brand)
      if (!tNorm.includes(bNorm)) continue
    }

    // Weight match
    if (tWeight?.grams != null && donor.weight?.grams != null && Math.abs(tWeight.grams - donor.weight.grams) > 2) continue
    if (tWeight?.ml != null && donor.weight?.ml != null && Math.abs(tWeight.ml - donor.weight.ml) > 2) continue

    // Fat match
    if (tFat != null && donor.fat != null && Math.abs(tFat - donor.fat) > 0.1) continue

    // Conflict check
    if (getConflict(tNorm, donor.normName)) continue

    const matches = tTokens.filter(w => donor.tokens.includes(w))
    const ratio = matches.length / Math.max(tTokens.length, 1)

    // Strict ratio threshold
    if (ratio >= 0.70 && ratio > bestRatio) {
      bestRatio = ratio
      bestCandidate = {
        ean: String(target.ean),
        targetName: target.name,
        donorSource: donor.source,
        donorName: donor.name,
        donorUrl: donor.sourceUrl,
        ingredients: donor.ingredients,
        nutrition: donor.nutrition,
        ratio: Number(ratio.toFixed(2))
      }
    }
  }

  if (bestCandidate) {
    verifiedCandidates.push(bestCandidate)
  }
}

console.log(`\n=== STRICT MATCHING RESULTS ===`)
console.log(`Target Food with Photo: ${totalTargets}`)
console.log(`Verified Strict Manufacturer Matches: ${verifiedCandidates.length}`)

const bySource = {}
for (const c of verifiedCandidates) bySource[c.donorSource] = (bySource[c.donorSource] || 0) + 1
console.log('Matches by Source:', JSON.stringify(bySource, null, 2))

fs.writeFileSync('scratch/all-manufacturers-verified-matches.jsonl', verifiedCandidates.map(JSON.stringify).join('\n') + '\n')
console.log('Saved to scratch/all-manufacturers-verified-matches.jsonl')
