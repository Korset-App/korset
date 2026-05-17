#!/usr/bin/env node

import {
  buildGeneralPrompt,
  buildProductPrompt,
  getOpenAICompletionLimits,
  selectOpenAIModel,
} from '../api/ai.js'
import { evaluateAIResponseQuality } from '../src/domain/ai/qualityEvaluator.js'
import {
  getLiveQAScenarios,
  summarizeLiveQAResults,
} from '../src/domain/ai/liveQualityGate.js'

const STORE_CONTEXT = {
  slug: 'store-one',
  name: 'Demo Market',
  address: 'Almaty',
  aiStoreNotes: 'Ассортимент и рекомендации должны оставаться внутри текущего магазина.',
}

const CATALOG_CONTEXT = [
  {
    ean: '4870000000011',
    name: 'Рис длиннозерный',
    category: 'grocery',
    subcategory: 'rice',
    priceKzt: 820,
    stockStatus: 'in_stock',
  },
  {
    ean: '4870000000022',
    name: 'Морковь',
    category: 'vegetables',
    subcategory: 'vegetables',
    priceKzt: 390,
    stockStatus: 'in_stock',
  },
  {
    ean: '4870000000033',
    name: 'Вода питьевая',
    category: 'water_beverages',
    subcategory: 'water',
    priceKzt: 260,
    stockStatus: 'in_stock',
  },
  {
    ean: '4870000000044',
    name: 'Печенье halal',
    category: 'sweets',
    subcategory: 'cookies',
    halalStatus: 'yes',
    priceKzt: 950,
    stockStatus: 'in_stock',
  },
  {
    ean: '4870000000055',
    name: 'Яблочное пюре',
    category: 'sweets',
    subcategory: 'fruit_snack',
    priceKzt: 540,
    stockStatus: 'in_stock',
  },
  {
    ean: '4870000000066',
    name: 'Печенье без молока',
    category: 'sweets',
    subcategory: 'cookies',
    ingredients: 'мука, сахар, растительное масло',
    allergens: [],
    priceKzt: 810,
    stockStatus: 'in_stock',
  },
]

const PRODUCT_FIXTURES = {
  simpleUnknownHalal: {
    ean: '4870000000077',
    name: 'Шоколад молочный',
    brand: 'Demo',
    ingredients: 'сахар, какао-масло, молоко',
    halalStatus: 'unknown',
    allergens: ['milk'],
    priceKzt: 990,
    stockStatus: 'in_stock',
  },
  milkAllergen: {
    ean: '4870000000088',
    name: 'Печенье с молоком',
    brand: 'Demo',
    ingredients: 'мука, сахар, сухое молоко',
    halalStatus: 'unknown',
    allergens: ['milk'],
    priceKzt: 890,
    stockStatus: 'in_stock',
    alternatives: [{ ean: '4870000000066', name: 'Печенье без молока', priceKzt: 810 }],
  },
  missingComposition: {
    ean: '4870000000099',
    name: 'Конфеты ассорти',
    brand: 'Demo',
    ingredients: '',
    halalStatus: 'unknown',
    allergens: [],
    priceKzt: 1290,
    stockStatus: 'in_stock',
  },
}

const PROFILE = {
  allergens: ['milk'],
  halalOnly: true,
  halalStrict: true,
}

function parseArgs(argv) {
  const args = {
    live: false,
    ids: null,
    limit: null,
    save: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--live') args.live = true
    else if (item === '--ids') args.ids = argv[++index] || ''
    else if (item === '--limit') args.limit = argv[++index] || ''
    else if (item === '--save') args.save = argv[++index] || ''
  }

  return args
}

function getScenarioPrompt(scenario) {
  if (scenario.mode === 'product') {
    const product = PRODUCT_FIXTURES[scenario.productKey] || PRODUCT_FIXTURES.missingComposition
    return buildProductPrompt(product, PROFILE, scenario.lang, null, STORE_CONTEXT)
  }
  return buildGeneralPrompt(scenario.lang, STORE_CONTEXT, CATALOG_CONTEXT)
}

function getScenarioMessages(scenario) {
  return [
    { role: 'system', content: getScenarioPrompt(scenario) },
    { role: 'user', content: scenario.prompt },
  ]
}

function printDryRun(scenarios) {
  console.log('[live-ai-quality-gate] DRY RUN. No OpenAI calls will be made.')
  console.log(`[live-ai-quality-gate] scenarios=${scenarios.length}`)
  for (const scenario of scenarios) {
    console.log(
      `[live-ai-quality-gate] PLAN ${scenario.id} ${scenario.mode}/${scenario.lang}/${scenario.intent}: ${scenario.prompt}`
    )
  }
}

async function callOpenAI({ apiKey, scenario }) {
  const modelSelection = selectOpenAIModel({ mode: scenario.mode })
  const limits = getOpenAICompletionLimits(scenario.mode)
  const startedAt = Date.now()
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelSelection.model,
      messages: getScenarioMessages(scenario),
      ...limits,
    }),
  })

  const latencyMs = Date.now() - startedAt
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      reply: '',
      latencyMs,
      error: data?.error || data,
    }
  }

  return {
    reply: data.choices?.[0]?.message?.content?.trim() || '',
    latencyMs,
    usage: data.usage || null,
    model: modelSelection.model,
  }
}

async function runLive(scenarios, args) {
  const { config: loadEnv } = await import('dotenv')
  loadEnv({ path: '.env.local', quiet: true })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Add it to .env.local before --live.')
  }

  const results = []
  for (const scenario of scenarios) {
    console.log(`[live-ai-quality-gate] CALL ${scenario.id} ${scenario.mode}/${scenario.lang}`)
    const response = await callOpenAI({ apiKey, scenario })
    const evaluation = evaluateAIResponseQuality({
      reply: response.reply,
      allowExternalData: false,
    })
    results.push({
      id: scenario.id,
      mode: scenario.mode,
      lang: scenario.lang,
      intent: scenario.intent,
      prompt: scenario.prompt,
      reply: response.reply,
      latencyMs: response.latencyMs,
      usage: response.usage,
      error: response.error || null,
      evaluation,
    })
    console.log(
      `[live-ai-quality-gate] ${evaluation.status.toUpperCase()} ${scenario.id} score=${evaluation.score} latencyMs=${response.latencyMs}`
    )
  }

  const summary = summarizeLiveQAResults(results)
  const payload = {
    date: new Date().toISOString(),
    dryRun: false,
    summary,
    results,
  }

  console.log(
    `[live-ai-quality-gate] total=${summary.total} pass=${summary.pass} review=${summary.review} fail=${summary.fail}`
  )
  if (Object.keys(summary.issueTags).length > 0) {
    console.log(`[live-ai-quality-gate] issueTags=${JSON.stringify(summary.issueTags)}`)
  }

  if (args.save) {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(args.save, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    console.log(`[live-ai-quality-gate] saved=${args.save}`)
  }

  if (summary.fail > 0) process.exitCode = 1
}

const args = parseArgs(process.argv.slice(2))
const scenarios = getLiveQAScenarios({ ids: args.ids, limit: args.limit })

if (!args.live) {
  printDryRun(scenarios)
} else {
  await runLive(scenarios, args)
}
