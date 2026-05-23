import { setupBot, getBot } from '../src/telegram-bot/bot.js'
import { t } from '../src/telegram-bot/i18n.js'

const bot = setupBot()
const token = process.env.TELEGRAM_SUPPORT_BOT_TOKEN

function mainKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: t(lang, 'menuFaq'), callback_data: 'faq' }, { text: t(lang, 'menuAsk'), callback_data: 'ask' }],
      [{ text: t(lang, 'menuAbout'), callback_data: 'about' }],
    ],
  }
}

function faqKeyboard(lang) {
  const items = t(lang, 'faqItems')
  const rows = items.map((_, i) => [{ text: `${i + 1}`, callback_data: `faq_${i}` }])
  rows.push([{ text: t(lang, 'back'), callback_data: 'main_menu' }])
  return { inline_keyboard: rows }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      bot: !!getBot(),
      env: {
        token: !!process.env.TELEGRAM_SUPPORT_BOT_TOKEN,
        operator: !!process.env.TELEGRAM_OPERATOR_CHAT_ID,
        openai: !!process.env.OPENAI_API_KEY,
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const update = req.body
  if (!update || !update.message) {
    return res.status(200).end()
  }

  const chatId = update.message.chat.id
  const msgText = update.message.text || ''
  const lang = ['ru', 'kz'].includes(update.message.from?.language_code)
    ? update.message.from.language_code
    : 'ru'
  const firstName = update.message.from?.first_name || 'гость'

  // Try grammy first
  if (bot) {
    try {
      await bot.handleUpdate(update)
      return res.status(200).end()
    } catch (err) {
      console.error('[webhook] grammy error:', err?.message || err)
    }
  }

  // Fallback: send manual reply
  const api = bot?.api || null
  const send = async (chatId, text, extra = {}) => {
    if (api) {
      await api.sendMessage(chatId, text, { parse_mode: 'HTML', ...extra })
    }
  }

  if (msgText === '/start') {
    await send(chatId, t(lang, 'start', firstName), { reply_markup: mainKeyboard(lang) })
  } else if (msgText === '/faq') {
    await send(chatId, t(lang, 'faqTitle'), { reply_markup: faqKeyboard(lang) })
  } else if (msgText === '/about') {
    await send(chatId, t(lang, 'about'))
  } else if (msgText === '/support') {
    await send(chatId, t(lang, 'askQuestion'))
  } else {
    await send(chatId, t(lang, 'transferToOperator'))
    const operatorId = process.env.TELEGRAM_OPERATOR_CHAT_ID
    if (operatorId) {
      const username = update.message.from?.username || update.message.from?.first_name || '—'
      await send(operatorId, `🔔 Новое сообщение от ${username} (chat: ${chatId}):\n\n${msgText}`)
    }
  }

  res.status(200).end()
}
