const { classifyBarcode } = require('./validate-ean.cjs')

function normalizeFallbackEan(fallbackId) {
  return `arbuz_${String(fallbackId || '').trim() || 'unknown'}`
}

function normalizeSourceBarcode(sourceBarcode) {
  if (!sourceBarcode) return null
  const info = classifyBarcode(String(sourceBarcode).trim())
  return info.valid && info.ean13 ? info.ean13 : null
}

function normalizeNpcCodes(npcResult) {
  const rawCodes = [npcResult?.primary, ...(npcResult?.alternates || [])]
  const seen = new Set()
  const codes = []
  for (const raw of rawCodes) {
    if (!raw) continue
    const info = classifyBarcode(String(raw).trim())
    if (!info.valid || !info.ean13 || seen.has(info.ean13)) continue
    seen.add(info.ean13)
    codes.push(info.ean13)
  }
  return codes
}

function buildArbuzImportEanDecision({ sourceBarcode, fallbackId, npcResult } = {}) {
  const sourceEan = normalizeSourceBarcode(sourceBarcode)
  if (sourceEan) {
    return {
      ean: sourceEan,
      alternateEans: [],
      reviewCandidates: [],
      evidenceSource: 'arbuz_barcode',
    }
  }

  const reviewCandidates = normalizeNpcCodes(npcResult).map((ean) => ({
    ean,
    source: 'npc_search',
    status: 'review',
    confidence: 40,
  }))

  return {
    ean: normalizeFallbackEan(fallbackId),
    alternateEans: [],
    reviewCandidates,
    evidenceSource: reviewCandidates.length > 0 ? 'npc_search_review_only' : 'fallback_source_id',
  }
}

module.exports = {
  buildArbuzImportEanDecision,
}
