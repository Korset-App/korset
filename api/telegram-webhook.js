import { createClient } from '@supabase/supabase-js'
import { t } from '../src/telegram-bot/i18n.js'

const TELEGRAM_API = 'https://api.telegram.org'
const BOT_TOKEN = process.env.TELEGRAM_SUPPORT_BOT_TOKEN
const OPERATOR_ID = process.env.TELEGRAM_OPERATOR_CHAT_ID

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

function sendMsg(chatId, text, extra = {}) {
  return fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  })
}

function editMsg(chatId, msgId, text, extra = {}) {
  return fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', ...extra }),
  })
}

function answerCb(cbId, text) {
  return fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: cbId, text: text || '' }),
  })
}

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
  const rows = []
  items.forEach((item, i) => {
    const label = item.q.length > 40 ? item.q.slice(0, 38) + '…' : item.q
    rows.push([{ text: label, callback_data: `faq_${i}` }])
  })
  rows.push([{ text: t(lang, 'back'), callback_data: 'main_menu' }])
  return { inline_keyboard: rows }
}

function helpKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: t(lang, 'helpYes'), callback_data: 'resolved' }],
      [{ text: t(lang, 'helpNo'), callback_data: 'transfer' }],
    ],
  }
}

function backKeyboard(lang) {
  return { inline_keyboard: [[{ text: t(lang, 'back'), callback_data: 'main_menu' }]] }
}

function closeKeyboard(ticketId, lang) {
  return {
    inline_keyboard: [[{ text: t(lang, 'closeTicket'), callback_data: `close_${ticketId}` }]],
  }
}

function takeKeyboard(ticketId) {
  return {
    inline_keyboard: [[{ text: '✅ Взять тикет', callback_data: `take_${ticketId}` }]],
  }
}

function getLang(from) {
  const l = from?.language_code || 'ru'
  return l === 'kz' ? 'kz' : 'ru'
}

function userName(from) {
  return from?.first_name || 'гость'
}

async function createTicket(userId, username, firstName, lang) {
  const { data: open } = await sb
    .from('support_tickets')
    .select('id')
    .eq('telegram_user_id', userId)
    .in('status', ['new', 'ai_answered', 'waiting_operator', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (open && open.length > 0) return open[0]

  const { data: ticket } = await sb
    .from('support_tickets')
    .insert({ telegram_user_id: userId, telegram_username: username, telegram_first_name: firstName, telegram_language_code: lang })
    .select('id')
    .single()

  return ticket
}

async function addMsg(ticketId, senderType, text, msgId) {
  await sb.from('support_messages').insert({
    ticket_id: ticketId, sender_type: senderType,
    message_text: text, telegram_message_id: msgId,
  })
}

async function updateStatus(ticketId, status) {
  const updates = { status, updated_at: new Date().toISOString() }
  if (status === 'closed') updates.closed_at = new Date().toISOString()
  await sb.from('support_tickets').update(updates).eq('id', ticketId)
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      env: {
        token: !!BOT_TOKEN,
        operator: !!OPERATOR_ID,
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    })
  }

  if (req.method !== 'POST') return res.status(405).end()
  if (!BOT_TOKEN) return res.status(200).end()

  const body = req.body
  if (!body) return res.status(200).end()

  // === MESSAGE ===
  const msg = body.message
  if (msg) {
    const chatId = msg.chat.id
    const lang = getLang(msg.from)
    const name = userName(msg.from)
    const text = msg.text || ''

    // Operator reply detection
    if (chatId == OPERATOR_ID && msg.reply_to_message) {
      await handleOperatorReply(msg, lang)
      return res.status(200).end()
    }

    // Commands
    if (text === '/start') {
      await sendMsg(chatId, t(lang, 'start', name), { reply_markup: mainKeyboard(lang) })
    } else if (text === '/faq') {
      await sendMsg(chatId, t(lang, 'faqTitle'), { reply_markup: faqKeyboard(lang) })
    } else if (text === '/about') {
      await sendMsg(chatId, t(lang, 'about'), { reply_markup: backKeyboard(lang) })
    } else if (text === '/support') {
      await sendMsg(chatId, t(lang, 'askQuestion'))
    } else {
      await handleUserMessage(body, lang)
    }

    return res.status(200).end()
  }

  // === CALLBACK QUERY ===
  const cb = body.callback_query
  if (cb) {
    const chatId = cb.message.chat.id
    const msgId = cb.message.message_id
    const lang = getLang(cb.from)
    const data = cb.data

    if (data === 'main_menu') {
      await editMsg(chatId, msgId, t(lang, 'start', userName(cb.from)), { reply_markup: mainKeyboard(lang) })
      await answerCb(cb.id)
    } else if (data === 'faq') {
      await editMsg(chatId, msgId, t(lang, 'faqTitle'), { reply_markup: faqKeyboard(lang) })
      await answerCb(cb.id)
    } else if (data === 'ask') {
      await editMsg(chatId, msgId, t(lang, 'askQuestion'))
      await answerCb(cb.id)
    } else if (data === 'about') {
      await editMsg(chatId, msgId, t(lang, 'about'), { reply_markup: backKeyboard(lang) })
      await answerCb(cb.id)
    } else if (data.startsWith('faq_')) {
      const idx = parseInt(data.replace('faq_', ''), 10)
      const items = t(lang, 'faqItems')
      const item = items[idx]
      if (item) {
        await editMsg(chatId, msgId, `<b>${item.q}</b>\n\n${item.a}`, {
          parse_mode: 'HTML',
          reply_markup: helpKeyboard(lang),
        })
      }
      await answerCb(cb.id)
    } else if (data === 'resolved') {
      await editMsg(chatId, msgId, t(lang, 'resolved'), { reply_markup: mainKeyboard(lang) })
      await answerCb(cb.id)
    } else if (data === 'transfer') {
      const userId = cb.from.id
      const ticket = await createTicket(userId, cb.from.username, cb.from.first_name, lang)
      const msgText = cb.message?.text || 'Запрос на оператора'
      await addMsg(ticket.id, 'user', msgText)
      await updateStatus(ticket.id, 'waiting_operator')
      await editMsg(chatId, msgId, t(lang, 'transferToOperator'))
      await notifyOperator(ticket.id, lang, userName(cb.from), msgText, cb.from.username)
      await answerCb(cb.id)
    } else if (data.startsWith('close_')) {
      const ticketId = data.replace('close_', '')
      try { await updateStatus(ticketId, 'closed') } catch (e) { /* ignore */ }
      await editMsg(chatId, msgId, t(lang, 'resolved'), { reply_markup: mainKeyboard(lang) })
      await answerCb(cb.id)
    } else if (data.startsWith('take_')) {
      const ticketId = data.replace('take_', '')
      if (chatId == OPERATOR_ID) {
        try { await updateStatus(ticketId, 'in_progress') } catch (e) { /* ignore */ }
        const { data: messages } = await sb.from('support_messages')
          .select('message_text, sender_type')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: false })
          .limit(5)
        const preview = (messages || []).reverse().map(m =>
          `[${m.sender_type}] ${(m.message_text || '').slice(0, 200)}`
        ).join('\n\n')
        await editMsg(chatId, msgId,
          `✅ Тикет #${ticketId.slice(0, 8)} взят в работу\n\nПоследние сообщения:\n${preview || '—'}`
        )
      }
      await answerCb(cb.id)
    }

    return res.status(200).end()
  }

  res.status(200).end()
}

async function handleUserMessage(body, lang) {
  const chatId = body.message.chat.id
  const userId = body.message.from.id
  const text = body.message.text || ''
  const name = userName(body.message.from)

  const ticket = await createTicket(userId, body.message.from.username, body.message.from.first_name, lang)
  await addMsg(ticket.id, 'user', text)

  await sendMsg(chatId, t(lang, 'transferToOperator'))
  await notifyOperator(ticket.id, lang, name, text, body.message.from.username)
}

async function notifyOperator(ticketId, lang, name, text, username) {
  if (!OPERATOR_ID) return
  const notification = `🔔 Новый вопрос от ${username || name} (chat: ${OPERATOR_ID})\n\n${text}`
  const msgRes = await sendMsg(OPERATOR_ID, notification, { reply_markup: takeKeyboard(ticketId) })
  const msgData = await msgRes.json()
  if (msgData.ok) {
    await addMsg(ticketId, 'operator', 'Нотификация оператору', msgData.result.message_id)
  }
}

async function handleOperatorReply(msg, lang) {
  const replyToId = msg.reply_to_message.message_id
  const replyText = msg.text || ''
  const chatId = msg.chat.id

  const { data: tickets } = await sb
    .from('support_messages')
    .select('ticket_id')
    .eq('telegram_message_id', replyToId)
    .limit(1)

  if (!tickets || tickets.length === 0) {
    await sendMsg(chatId, 'Не удалось найти тикет для этого ответа.')
    return
  }

  const ticketId = tickets[0].ticket_id
  const { data: ticket } = await sb.from('support_tickets').select('*').eq('id', ticketId).single()

  await addMsg(ticketId, 'operator', replyText)
  await updateStatus(ticketId, 'in_progress')

  const userLang = ticket?.telegram_language_code || 'ru'
  const formatted = `<b>${t(userLang, 'operatorReplied')}</b>\n\n${replyText}`

  await sendMsg(ticket.telegram_user_id, formatted, { parse_mode: 'HTML', reply_markup: closeKeyboard(ticketId, userLang) })
  await updateStatus(ticketId, 'closed')
  await sendMsg(chatId, t(userLang, 'operatorReplySent'))
}
