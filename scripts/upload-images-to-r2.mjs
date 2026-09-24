import fs from 'node:fs'
import readline from 'node:readline'
import dotenv from 'dotenv'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

dotenv.config({ path: '.env.local' })

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
} = process.env

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('Missing Cloudflare R2 credentials in .env.local')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const PLAN_PATH = 'data/r2_upload_plan.jsonl'
const CHECKPOINT_PATH = 'data/r2_images_checkpoint.json'
const CONCURRENCY = 25
const MAX_RETRIES = 3

// Load Checkpoint
let completedKeys = new Set()
if (fs.existsSync(CHECKPOINT_PATH)) {
  try {
    const raw = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'))
    completedKeys = new Set(raw)
    console.log(`Loaded checkpoint: ${completedKeys.size} images already uploaded.`)
  } catch (err) {
    console.warn('Failed to parse checkpoint, starting fresh:', err.message)
  }
}

function saveCheckpoint() {
  const tmpPath = `${CHECKPOINT_PATH}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(Array.from(completedKeys)), 'utf-8')
  fs.renameSync(tmpPath, CHECKPOINT_PATH)
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
      })

      if (res.status === 404 || res.status === 410) {
        return null // Not found on source, do not retry
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const arrayBuf = await res.arrayBuffer()
      return Buffer.from(arrayBuf)
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, attempt * 500))
    }
  }
  return null
}

async function processImageTask(task) {
  const { r2Key, url } = task
  if (completedKeys.has(r2Key)) return { status: 'skipped' }

  try {
    const inputBuf = await fetchWithRetry(url)
    if (!inputBuf) {
      completedKeys.add(r2Key) // mark done so we don't re-attempt 404s
      return { status: 'not_found' }
    }

    const webpBuf = await sharp(inputBuf)
      .webp({ quality: 85, effort: 3 })
      .toBuffer()

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: webpBuf,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    completedKeys.add(r2Key)
    return { status: 'uploaded' }
  } catch (err) {
    return { status: 'error', error: err.message }
  }
}

async function main() {
  console.log('=== Starting Cloudflare R2 Media Upload Pipeline ===')

  // Step 1: Read all tasks from upload plan
  console.log('Reading upload plan...')
  const rl = readline.createInterface({
    input: fs.createReadStream(PLAN_PATH),
    crlfDelay: Infinity,
  })

  const tasks = []
  for await (const line of rl) {
    if (!line.trim()) continue
    const item = JSON.parse(line)
    if (item.front?.r2_key && item.front?.original_url) {
      tasks.push({ r2Key: item.front.r2_key, url: item.front.original_url })
    }
    if (item.back?.r2_key && item.back?.original_url) {
      tasks.push({ r2Key: item.back.r2_key, url: item.back.original_url })
    }
  }

  const totalTasks = tasks.length
  const pendingTasks = tasks.filter((t) => !completedKeys.has(t.r2Key))
  console.log(`Total images in plan: ${totalTasks}`)
  console.log(`Already uploaded: ${completedKeys.size}`)
  console.log(`Pending uploads: ${pendingTasks.length}`)

  if (pendingTasks.length === 0) {
    console.log('All images are already uploaded to Cloudflare R2!')
    return
  }

  console.log(`Starting worker pool with concurrency ${CONCURRENCY}...`)
  const startTime = Date.now()
  let processed = 0
  let uploaded = 0
  let errors = 0
  let lastCheckpointTime = Date.now()

  let taskIndex = 0
  async function worker() {
    while (taskIndex < pendingTasks.length) {
      const idx = taskIndex++
      const task = pendingTasks[idx]
      const result = await processImageTask(task)

      processed++
      if (result.status === 'uploaded') uploaded++
      if (result.status === 'error') errors++

      // Periodic logging & checkpointing
      if (processed % 250 === 0 || Date.now() - lastCheckpointTime > 10000) {
        saveCheckpoint()
        lastCheckpointTime = Date.now()
        const elapsedSec = (Date.now() - startTime) / 1000
        const rate = (processed / elapsedSec).toFixed(1)
        const remaining = pendingTasks.length - processed
        const etaMin = (remaining / (processed / elapsedSec) / 60).toFixed(1)
        const percent = ((completedKeys.size / totalTasks) * 100).toFixed(1)

        console.log(
          `[R2 Upload] ${completedKeys.size} / ${totalTasks} (${percent}%) | Speed: ${rate} img/s | ETA: ${etaMin}m | Errors: ${errors}`
        )
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker())
  await Promise.all(workers)

  saveCheckpoint()
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n=== R2 Media Upload Complete in ${totalElapsed}s! ===`)
  console.log(`Uploaded: ${uploaded}, Errors: ${errors}, Total in R2: ${completedKeys.size}`)
}

main().catch((err) => {
  console.error('Fatal error in R2 uploader:', err)
  process.exit(1)
})
