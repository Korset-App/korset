import fs from 'node:fs'
import readline from 'node:readline'

const inputPath = 'scratch/unfilled-candidates.jsonl'
const stream = fs.createReadStream(inputPath, 'utf8')
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

function parseNum(str) {
  if (!str) return null
  const clean = str.replace(',', '.').trim()
  const num = parseFloat(clean)
  return Number.isFinite(num) ? num : null
}

function extractFromText(text) {
  if (!text || typeof text !== 'string') return null
  const lower = text.toLowerCase()

  if (!lower.includes('белк') || !lower.includes('жир') || !lower.includes('углевод')) {
    return null
  }

  // Protein
  const pMatch = lower.match(/(?:белк(?:и|ов|а)?)(?:\s*\([^)]*\))?[\s:\-—–]*(\d+(?:[.,]\d+)?)\s*г/i)
  if (!pMatch) return null
  const protein_100g = parseNum(pMatch[1])

  // Fat
  const fMatch = lower.match(/(?:жир(?:ы|ов|а)?)(?:\s*\([^)]*\))?[\s:\-—–]*(\d+(?:[.,]\d+)?)\s*г/i)
  if (!fMatch) return null
  const fat_100g = parseNum(fMatch[1])

  // Carbs
  const cMatch = lower.match(/(?:углевод(?:ы|ов|а)?)(?:\s*\([^)]*\))?[\s:\-—–]*(\d+(?:[.,]\d+)?)\s*г/i)
  if (!cMatch) return null
  const carbohydrates_100g = parseNum(cMatch[1])

  // Energy
  let energy_kcal = null
  const kcalMatch = lower.match(/(?:(\d+(?:[.,]\d+)?)\s*(?:ккал|kcal)|(?:ккал|kcal)[\s:\-—–]*(\d+(?:[.,]\d+)?))/i)
  if (kcalMatch) {
    energy_kcal = parseNum(kcalMatch[1] || kcalMatch[2])
  } else {
    const kjMatch = lower.match(/(?:(\d+(?:[.,]\d+)?)\s*(?:кдж|kj)|(?:кдж|kj)[\s:\-—–]*(\d+(?:[.,]\d+)?))/i)
    if (kjMatch) {
      const kj = parseNum(kjMatch[1] || kjMatch[2])
      if (kj) energy_kcal = Math.round(kj / 4.184)
    }
  }

  if (protein_100g == null || fat_100g == null || carbohydrates_100g == null) return null

  // If energy missing, calculate it
  if (energy_kcal == null) {
    energy_kcal = Math.round(protein_100g * 4 + fat_100g * 9 + carbohydrates_100g * 4)
  }

  // Plausibility
  if (protein_100g < 0 || protein_100g > 100) return null
  if (fat_100g < 0 || fat_100g > 100) return null
  if (carbohydrates_100g < 0 || carbohydrates_100g > 100) return null
  if (protein_100g + fat_100g + carbohydrates_100g > 106) return null
  if (energy_kcal < 0 || energy_kcal > 950) return null

  // Macro check
  const calculatedEnergy = protein_100g * 4 + fat_100g * 9 + carbohydrates_100g * 4
  if (Math.abs(calculatedEnergy - energy_kcal) > Math.max(75, energy_kcal * 0.35)) {
    return null
  }

  return {
    energy_kcal: Math.round(energy_kcal),
    protein_100g: Number(protein_100g.toFixed(1)),
    fat_100g: Number(fat_100g.toFixed(1)),
    carbohydrates_100g: Number(carbohydrates_100g.toFixed(1))
  }
}

function cleanIngredients(text) {
  if (!text) return null
  const markers = [
    /пищевая\s+ценность/i,
    /средние\s+значения\s+пищевой\s+ценности/i,
    /энергетическая\s+ценность/i,
    /\*?\s*кондитерская\s+фабрика/i,
    /\*?\s*тоо\s+[«"']?мпк/i,
    /условия\s+хранения/i,
    /хранить\s+при/i,
    /срок\s+годности/i
  ]
  let cutIdx = text.length
  for (const m of markers) {
    const idx = text.search(m)
    if (idx !== -1 && idx < cutIdx && idx > 20) {
      cutIdx = idx
    }
  }
  const cleaned = text.slice(0, cutIdx).trim().replace(/[,.:;*—–\-]+$/, '').trim()
  return cleaned.length >= 10 ? cleaned : text
}

const extracted = []
let total = 0

for await (const line of rl) {
  if (!line.trim()) continue
  total++
  const row = JSON.parse(line)

  let nutr = extractFromText(row.ingredients_raw)
  let sourceField = 'ingredients_raw'

  if (!nutr) {
    nutr = extractFromText(row.description)
    sourceField = 'description'
  }

  if (nutr) {
    const cleaned = cleanIngredients(row.ingredients_raw)
    extracted.push({
      ean: row.ean,
      name: row.name,
      category: row.category,
      sourceField,
      nutrition: nutr,
      cleanedIngredients: (cleaned && cleaned !== row.ingredients_raw) ? cleaned : null
    })
  }
}

console.log(`\n=== TEXT PARSER SUMMARY ===`)
console.log(`Total scanned candidates: ${total}`)
console.log(`Successfully extracted plausible 4-number KBJU: ${extracted.length}`)

const byCategory = {}
for (const item of extracted) {
  byCategory[item.category] = (byCategory[item.category] || 0) + 1
}
console.log('Extracted by category:', JSON.stringify(byCategory, null, 2))

console.log('\nSample 15 items:')
extracted.slice(0, 15).forEach((x, i) => {
  console.log(`${i + 1}. [${x.ean}] ${x.name}`);
  console.log(`   KBJU: ${JSON.stringify(x.nutrition)} (source: ${x.sourceField})`);
  if (x.cleanedIngredients) {
    console.log(`   Cleaned ingredients: "${x.cleanedIngredients.slice(0, 80)}..."`);
  }
})

fs.writeFileSync('scratch/text-extracted-nutrition-proposal.jsonl', extracted.map(JSON.stringify).join('\n') + '\n')
console.log('\nSaved to scratch/text-extracted-nutrition-proposal.jsonl')
