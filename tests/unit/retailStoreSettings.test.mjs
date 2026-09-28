import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildRetailStoreSettingsPayload,
  getMissingStoreSettingsColumn,
  omitStoreSettingsColumn,
} from '../../src/domain/retail/storeSettings.js'

test('buildRetailStoreSettingsPayload trims AI store notes and stores empty notes as null', () => {
  const longNotes = `  Fresh bakery every morning\nUse WhatsApp for delivery\t${'x'.repeat(2100)}`

  const payload = buildRetailStoreSettingsPayload({
    name: 'Mast',
    address: 'Auezov 10',
    phone: '7001112233',
    short_description: 'Local store',
    description: 'Neighborhood minimarket',
    opening_hours: '  Mon-Sun 09:00-23:00\nNo breaks ',
    instagram_url: '',
    whatsapp_number: '7012223344',
    twogis_url: '',
    ai_store_notes: longNotes,
  })

  assert.equal(payload.phone, '77001112233')
  assert.equal(payload.whatsapp_number, '77012223344')
  assert.equal(payload.instagram_url, null)
  assert.equal(payload.twogis_url, null)
  assert.equal(payload.opening_hours, 'Mon-Sun 09:00-23:00 No breaks')
  assert.equal(payload.ai_store_notes.includes('\n'), false)
  assert.equal(payload.ai_store_notes.includes('\t'), false)
  assert.equal(payload.ai_store_notes.length, 500)

  assert.equal(buildRetailStoreSettingsPayload({ ai_store_notes: '   ' }).ai_store_notes, null)
})

test('getMissingStoreSettingsColumn detects Supabase schema-cache and Postgres missing-column errors', () => {
  assert.equal(
    getMissingStoreSettingsColumn({
      code: 'PGRST204',
      message: "Could not find the 'opening_hours' column of 'stores' in the schema cache",
    }),
    'opening_hours'
  )
  assert.equal(
    getMissingStoreSettingsColumn({
      code: '42703',
      message: 'column stores.opening_hours does not exist',
    }),
    'opening_hours'
  )
  assert.equal(getMissingStoreSettingsColumn({ message: 'permission denied' }), null)
})

test('omitStoreSettingsColumn drops only one unsupported field from the settings payload', () => {
  const payload = {
    name: 'Coffee',
    address: 'Abay 10',
    opening_hours: '09:00-23:00',
  }

  assert.deepEqual(omitStoreSettingsColumn(payload, 'opening_hours'), {
    name: 'Coffee',
    address: 'Abay 10',
  })
  assert.deepEqual(omitStoreSettingsColumn(payload, 'unknown'), payload)
})

test('buildRetailStoreSettingsPayload normalizes multiple contacts in features and keeps primary phone in sync', () => {
  const payload = buildRetailStoreSettingsPayload({
    name: 'Bereke',
    features: {
      payments: ['cash', 'kaspi_qr'],
      contacts: {
        phones: [
          { number: '+7 (701) 111-22-33', role: 'main' },
          { number: '87023334455', role: 'admin' },
          { number: '7056667788', role: 'custom', customLabel: 'Склад' },
          { number: 'invalid', role: 'sales' },
        ],
        whatsapps: [
          { number: '+7 777 999 88 77', role: 'delivery' },
        ],
      },
    },
  })

  assert.equal(payload.phone, '77011112233')
  assert.equal(payload.whatsapp_number, '77779998877')
  assert.equal(payload.features.contacts.phones.length, 3)
  assert.equal(payload.features.contacts.phones[0].number, '77011112233')
  assert.equal(payload.features.contacts.phones[0].role, 'main')
  assert.equal(payload.features.contacts.phones[2].label, 'Склад')
  assert.equal(payload.features.contacts.whatsapps[0].number, '77779998877')
  assert.deepEqual(payload.features.payments, ['cash', 'kaspi_qr'])
})
