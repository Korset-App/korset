import { webhookCallback } from 'grammy'
import { setupBot, getBot } from '../src/telegram-bot/bot.js'

const bot = setupBot()
const webhookHandler = webhookCallback(bot, 'http', {
  timeoutMilliseconds: 9000,
})

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const hasBot = !!getBot()
    const hasToken = !!process.env.TELEGRAM_SUPPORT_BOT_TOKEN
    const hasOperator = !!process.env.TELEGRAM_OPERATOR_CHAT_ID
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    return res.status(200).json({
      status: 'ok',
      bot: hasBot,
      env: { token: hasToken, operator: hasOperator, openai: hasOpenAI },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await webhookHandler(req, res)
  } catch (err) {
    console.error('[telegram-webhook] Error:', err?.message || err)
    res.status(200).end()
  }
}
