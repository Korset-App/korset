import fs from 'fs'
import readline from 'readline'

async function enrichHalal() {
  console.log('Loading Arbuz Halal products...')
  const arbuzHalal = new Map()
  const rlArbuz = readline.createInterface({
    input: fs.createReadStream('data/arbuz_full_catalog.jsonl'),
    crlfDelay: Infinity,
  })
  for await (const line of rlArbuz) {
    if (!line.trim()) continue
    const item = JSON.parse(line)
    const isHalal = (item.characteristics || []).some(
      (c) => c.id === '6' || (c.name && c.name.toLowerCase().includes('халал'))
    )
    if (isHalal) {
      arbuzHalal.set(item.name.toLowerCase().trim(), true)
    }
  }

  console.log('Loading verified matches...')
  const rlMatches = readline.createInterface({
    input: fs.createReadStream('data/enrichment_matches.jsonl'),
    crlfDelay: Infinity,
  })
  const eansToHalal = new Set()
  for await (const line of rlMatches) {
    if (!line.trim()) continue
    const match = JSON.parse(line)
    if (match.donor_source === 'arbuz') {
      if (arbuzHalal.has(match.donor_name.toLowerCase().trim())) {
        eansToHalal.add(match.ean)
      }
    }
  }

  console.log(`Found ${eansToHalal.size} verified EANs with Arbuz Halal badge. Updating master catalog...`)

  const inputPath = 'data/korset_master_catalog_v4_final.jsonl'
  const tempPath = 'data/korset_master_catalog_v4_final.jsonl.tmp'

  const rlMaster = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity,
  })

  const outStream = fs.createWriteStream(tempPath, { flags: 'w' })

  let totalLines = 0
  let enrichedCount = 0

  for await (const line of rlMaster) {
    if (!line.trim()) continue
    totalLines++
    const item = JSON.parse(line)
    if (eansToHalal.has(item.ean)) {
      if (!item.halal_status || item.halal_status === 'unknown') {
        item.halal_status = 'yes'
        item.specs_json = {
          ...(item.specs_json || {}),
          halal_source: 'arbuz_store_badge',
        }
        enrichedCount++
      }
    }
    outStream.write(JSON.stringify(item) + '\n')
  }

  await new Promise((resolve) => outStream.end(resolve))

  if (totalLines !== 58643) {
    throw new Error(`Catalog line count mismatch: expected 58643, got ${totalLines}`)
  }

  fs.renameSync(tempPath, inputPath)
  console.log(`Successfully enriched ${enrichedCount} products with halal_status='yes'! Total items: ${totalLines}`)
}

enrichHalal().catch((err) => {
  console.error('Error enriching halal:', err)
  process.exit(1)
})
