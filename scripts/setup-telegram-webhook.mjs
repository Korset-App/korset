import 'dotenv/config'

const DEFAULT_URL = 'https://korset.vercel.app/api/telegram-webhook'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const urlArg = args.find((a) => a.startsWith('--url='))
const webhookUrl = urlArg ? urlArg.split('=')[1] : DEFAULT_URL

const token = process.env.TELEGRAM_SUPPORT_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET

if (!token) {
  console.error('TELEGRAM_SUPPORT_BOT_TOKEN is not set')
  process.exit(1)
}
if (!secret) {
  console.error('TELEGRAM_WEBHOOK_SECRET is not set — generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  process.exit(1)
}

const payload = { url: webhookUrl, secret_token: secret }

if (dryRun) {
  console.log('[dry-run] Would register webhook:')
  console.log('  URL:           ', webhookUrl)
  console.log('  secret_token:  ', secret.slice(0, 8) + '…' + secret.slice(-4))
  console.log('  payload:       ', JSON.stringify(payload, null, 2))
  process.exit(0)
}

console.log('Registering Telegram webhook...')
console.log('  URL:           ', webhookUrl)
console.log('  secret_token:  ', secret.slice(0, 8) + '…' + secret.slice(-4))

try {
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()

  if (!res.ok || !data.ok) {
    console.error('setWebhook failed:', JSON.stringify(data, null, 2))
    process.exit(1)
  }

  console.log('Webhook registered successfully.')
  console.log('  description:   ', data.description)
  console.log('  url:           ', data.result?.url)
  console.log('  has_custom_certificate:', data.result?.has_custom_certificate)
  console.log('  pending_update_count:  ', data.result?.pending_update_count)

  if (data.result?.pending_update_count > 0) {
    console.log('  Note: %d pending updates will be delivered.', data.result.pending_update_count)
  }
} catch (err) {
  console.error('Network error:', err.message)
  process.exit(1)
}
