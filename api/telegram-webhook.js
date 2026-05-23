import { setupBot } from '../src/telegram-bot/bot.js'

const bot = setupBot()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await bot.handleUpdate(req.body)
  } catch (err) {
    console.error('[telegram-webhook] Error handling update:', err)
  }

  res.status(200).end()
}
