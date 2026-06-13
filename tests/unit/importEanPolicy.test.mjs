import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { buildArbuzImportEanDecision } = require('../../scripts/import-ean-policy.cjs')

test('Arbuz exact barcode can become primary EAN', () => {
  const decision = buildArbuzImportEanDecision({
    sourceBarcode: '4870035005035',
    fallbackId: '12345',
    npcResult: {
      primary: '4870000000001',
      alternates: ['4870000000002'],
    },
  })

  assert.equal(decision.ean, '4870035005035')
  assert.deepEqual(decision.alternateEans, [])
  assert.deepEqual(decision.reviewCandidates, [])
  assert.equal(decision.evidenceSource, 'arbuz_barcode')
})

test('NPC name search cannot become primary or alternate EAN', () => {
  const decision = buildArbuzImportEanDecision({
    sourceBarcode: null,
    fallbackId: '12345',
    npcResult: {
      primary: '4870035005035',
      alternates: ['4870000000001', '4870000000002'],
    },
  })

  assert.equal(decision.ean, 'arbuz_12345')
  assert.deepEqual(decision.alternateEans, [])
  assert.deepEqual(decision.reviewCandidates.map((candidate) => candidate.ean), [
    '4870035005035',
    '4870000000001',
    '4870000000002',
  ])
  assert.ok(decision.reviewCandidates.every((candidate) => candidate.source === 'npc_search'))
  assert.ok(decision.reviewCandidates.every((candidate) => candidate.status === 'review'))
})

test('invalid source barcode falls back without writing unsafe alternates', () => {
  const decision = buildArbuzImportEanDecision({
    sourceBarcode: 'not-a-barcode',
    fallbackId: '12345',
    npcResult: {
      primary: '4870035005035',
      alternates: ['bad-code'],
    },
  })

  assert.equal(decision.ean, 'arbuz_12345')
  assert.deepEqual(decision.alternateEans, [])
  assert.deepEqual(decision.reviewCandidates.map((candidate) => candidate.ean), ['4870035005035'])
})
