import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapAlternativeEventsSummaryRpcRow,
  summarizeAlternativeEvents,
} from '../../src/utils/retailAnalytics.js'

test('summarizeAlternativeEvents returns owner-safe aggregate counts', () => {
  const summary = summarizeAlternativeEvents([
    {
      event_type: 'alternatives_scenario_selected',
      scenario: 'fits_me',
      source_ean: '4601751002907',
      candidate_ean: null,
    },
    {
      event_type: 'alternatives_compare_clicked',
      scenario: 'fits_me',
      source_ean: '4601751002907',
      candidate_ean: '4870209471118',
    },
    {
      event_type: 'alternatives_ai_help_clicked',
      scenario: 'cheaper',
      source_ean: '4870209471118',
      candidate_ean: null,
    },
    {
      event_type: 'alternatives_product_opened',
      scenario: 'fits_me',
      source_ean: '4601751002907',
      candidate_ean: '4870209471118',
    },
  ])

  assert.equal(summary.total, 4)
  assert.equal(summary.compareCount, 1)
  assert.equal(summary.aiHelpCount, 1)
  assert.equal(summary.openCount, 1)
  assert.equal(summary.scenarioSelectCount, 1)
  assert.deepEqual(summary.topScenario, { scenario: 'fits_me', count: 3 })
  assert.deepEqual(summary.topSource, { ean: '4601751002907', count: 3 })
  assert.equal(Object.hasOwn(summary, 'userId'), false)
  assert.equal(Object.hasOwn(summary, 'allergens'), false)
})

test('summarizeAlternativeEvents handles empty data', () => {
  assert.deepEqual(summarizeAlternativeEvents([]), {
    total: 0,
    compareCount: 0,
    aiHelpCount: 0,
    openCount: 0,
    scenarioSelectCount: 0,
    topScenario: null,
    topSource: null,
  })
})

test('mapAlternativeEventsSummaryRpcRow maps RPC aggregate contract', () => {
  assert.deepEqual(
    mapAlternativeEventsSummaryRpcRow({
      total_count: 12,
      compare_count: 4,
      ai_help_count: 3,
      open_count: 2,
      scenario_select_count: 3,
      top_scenario: 'better_composition',
      top_scenario_count: 6,
      top_source_ean: '4601751002907',
      top_source_count: 5,
    }),
    {
      total: 12,
      compareCount: 4,
      aiHelpCount: 3,
      openCount: 2,
      scenarioSelectCount: 3,
      topScenario: { scenario: 'better_composition', count: 6 },
      topSource: { ean: '4601751002907', count: 5 },
    }
  )
})
