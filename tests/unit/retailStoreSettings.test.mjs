import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRetailStoreSettingsPayload } from '../../src/domain/retail/storeSettings.js'

test('buildRetailStoreSettingsPayload trims AI store notes and stores empty notes as null', () => {
  const longNotes = `  Fresh bakery every morning\nUse WhatsApp for delivery\t${'x'.repeat(2100)}`

  const payload = buildRetailStoreSettingsPayload({
    name: 'Mast',
    address: 'Auezov 10',
    phone: '7001112233',
    short_description: 'Local store',
    description: 'Neighborhood minimarket',
    instagram_url: '',
    whatsapp_number: '7012223344',
    twogis_url: '',
    ai_store_notes: longNotes,
  })

  assert.equal(payload.phone, '77001112233')
  assert.equal(payload.whatsapp_number, '77012223344')
  assert.equal(payload.instagram_url, null)
  assert.equal(payload.twogis_url, null)
  assert.equal(payload.ai_store_notes.includes('\n'), false)
  assert.equal(payload.ai_store_notes.includes('\t'), false)
  assert.equal(payload.ai_store_notes.length, 2000)

  assert.equal(buildRetailStoreSettingsPayload({ ai_store_notes: '   ' }).ai_store_notes, null)
})
