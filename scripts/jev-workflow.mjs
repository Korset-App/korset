import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const endpoint = 'https://api.typesafe.ai/v1/systemone'
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const hasKeys = (value, required) => isObject(value) && Object.keys(value).length === required.length && required.every((key) => Object.hasOwn(value, key))
const validText = (value) => typeof value === 'string' && value.trim().length > 0
const validId = (value) => /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value)

export function validateInput(input) {
  if (!hasKeys(input, ['state', 'questions']) || !validText(input.state) || JSON.stringify(input).length > 16000) throw Error('Invalid Jev input')
  const questions = input.questions
  if (!isObject(questions) || Object.keys(questions).length < 1 || Object.keys(questions).length > 20) throw Error('Invalid Jev input')
  for (const [id, question] of Object.entries(questions)) {
    if (!validId(id) || !hasKeys(question, ['type', 'instructions', 'criteria']) || question.type !== 'choice' || !validText(question.instructions)) throw Error('Invalid Jev input')
    const criteria = question.criteria
    if (!isObject(criteria) || Object.keys(criteria).length < 2 || !Object.entries(criteria).every(([key, value]) => validId(key) && validText(value))) throw Error('Invalid Jev input')
  }
  return { model: 'jev-latest', state: input.state, questions }
}

export async function runWorkflow(input, { execute = false, apiKey, fetchImpl = fetch } = {}) {
  const payload = validateInput(input)
  if (!execute) return { mode: 'dry-run', payload }
  if (!validText(apiKey)) throw Error('TYPESAFE_API_KEY is required for --execute')
  let response
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
  } catch { throw Error('Jev request failed') }
  if (!response.ok) throw Error(`Jev request failed (HTTP ${Number.isInteger(response.status) ? response.status : 'unknown'})`)
  let data
  try { data = await response.json() } catch { throw Error('Invalid Jev response') }
  if (!isObject(data) || !isObject(data.answers)) throw Error('Invalid Jev response')
  const answers = {}
  for (const [id, question] of Object.entries(payload.questions)) {
    const answer = data.answers[id]
    if (!isObject(answer) || answer.type !== 'choice' || typeof answer.choice !== 'string' || !Object.hasOwn(question.criteria, answer.choice) || typeof answer.confidence !== 'number' || !Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) throw Error('Invalid Jev response')
    answers[id] = { choice: answer.choice, confidence: answer.confidence, needs_review: answer.confidence < 0.8 }
  }
  const usage = {}
  if (isObject(data.usage)) for (const [key, value] of Object.entries(data.usage)) {
    if (validId(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0) usage[key] = value
  }
  return { mode: 'execute', answers, usage }
}

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true }
  let inputFile, execute = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && !inputFile && args[i + 1] && !args[i + 1].startsWith('--')) inputFile = args[++i]
    else if (args[i] === '--execute' && !execute) execute = true
    else throw Error('Usage: node scripts/jev-workflow.mjs --input file.json [--execute]')
  }
  if (!inputFile) throw Error('Usage: node scripts/jev-workflow.mjs --input file.json [--execute]')
  return { inputFile, execute }
}

function readKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY
  try { return dotenv.parse(readFileSync('.env.local')).TYPESAFE_API_KEY } catch { return undefined }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { help, inputFile, execute } = parseArgs(process.argv.slice(2))
    if (help) console.log('Usage: node scripts/jev-workflow.mjs --input file.json [--execute]')
    else {
      const raw = readFileSync(inputFile, 'utf8')
      if (raw.length > 16000) throw Error('Invalid Jev input')
      const result = await runWorkflow(JSON.parse(raw), { execute, apiKey: execute ? readKey() : undefined })
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (error) {
    const allowed = ['Invalid Jev input', 'Invalid Jev response', 'Jev request failed', 'TYPESAFE_API_KEY is required for --execute']
    const message = allowed.includes(error.message) || /^Jev request failed \(HTTP (?:\d+|unknown)\)$/.test(error.message) || error.message.startsWith('Usage:') ? error.message : 'Unable to run Jev workflow'
    console.error(message)
    process.exitCode = 1
  }
}
