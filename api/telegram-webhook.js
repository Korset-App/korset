import { createClient } from '@supabase/supabase-js'
import { t } from '../src/telegram-bot/i18n.js'
import { getAIResponse } from '../src/telegram-bot/ai.js'
import { verifyWebhookSecret } from '../src/telegram-bot/verifyWebhook.js'

const API = 'https://api.telegram.org'
const TOKEN = process.env.TELEGRAM_SUPPORT_BOT_TOKEN
const OPERATOR = process.env.TELEGRAM_OPERATOR_CHAT_ID
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

function fetchTg(method, payload) {
  return fetch(`${API}/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json())
}

function send(chatId, text, extra = {}) {
  return fetchTg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra })
}

function edit(chatId, msgId, text, extra = {}) {
  return fetchTg('editMessageText', { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', ...extra })
}

function action(chatId, act) {
  return fetchTg('sendChatAction', { chat_id: chatId, action: act })
}

function answer(cbId, text) {
  return fetchTg('answerCallbackQuery', { callback_query_id: cbId, text: text || '' })
}

function mainKB(lang) {
  return {
    inline_keyboard: [
      [{ text: t(lang, 'menuFaq'), callback_data: 'faq' }, { text: t(lang, 'menuAsk'), callback_data: 'ask' }],
      [{ text: t(lang, 'menuAbout'), callback_data: 'about' }],
    ],
  }
}

function faqKB(lang) {
  const items = t(lang, 'faqItems')
  const rows = items.map((item, i) => {
    const label = item.q.length > 42 ? item.q.slice(0, 40) + '…' : item.q
    return [{ text: label, callback_data: `faq_${i}` }]
  })
  rows.push([{ text: t(lang, 'back'), callback_data: 'main_menu' }])
  return { inline_keyboard: rows }
}

function helpKB(lang) {
  return {
    inline_keyboard: [
      [{ text: t(lang, 'helpYes'), callback_data: 'resolved' }],
      [{ text: t(lang, 'helpNo'), callback_data: 'transfer' }],
    ],
  }
}

function backKB(lang) {
  return { inline_keyboard: [[{ text: t(lang, 'back'), callback_data: 'main_menu' }]] }
}

function closeKB(ticketId, lang) {
  return { inline_keyboard: [[{ text: t(lang, 'closeTicket'), callback_data: `close_${ticketId}` }]] }
}

function takeKB(ticketId) {
  return { inline_keyboard: [[{ text: '✅ Взять тикет', callback_data: `take_${ticketId}` }]] }
}

function ratingKB(ticketId) {
  return {
    inline_keyboard: [[
      { text: '😡', callback_data: `rate_${ticketId}_1` },
      { text: '😐', callback_data: `rate_${ticketId}_2` },
      { text: '😊', callback_data: `rate_${ticketId}_3` },
      { text: '🤩', callback_data: `rate_${ticketId}_4` },
      { text: '💎', callback_data: `rate_${ticketId}_5` },
    ]],
  }
}

function langOf(from) {
  return from?.language_code === 'kz' ? 'kz' : 'ru'
}

function nameOf(from) {
  return from?.first_name || 'гость'
}

async function getTicket(userId, username, firstName, lang) {
  const { data: open } = await sb
    .from('support_tickets')
    .select('id, status')
    .eq('telegram_user_id', userId)
    .in('status', ['new', 'ai_answered', 'waiting_operator', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
  if (open?.length) return open[0]
  const { data } = await sb.from('support_tickets').insert({
    telegram_user_id: userId, telegram_username: username,
    telegram_first_name: firstName, telegram_language_code: lang,
  }).select('id, status').single()
  return data
}

async function logMsg(ticketId, sender, text, tgMsgId) {
  const row = { ticket_id: ticketId, sender_type: sender, message_text: text }
  if (tgMsgId) row.telegram_message_id = tgMsgId
  await sb.from('support_messages').insert(row)
}

async function setStatus(ticketId, status) {
  const upd = { status, updated_at: new Date().toISOString() }
  if (status === 'closed') upd.closed_at = new Date().toISOString()
  await sb.from('support_tickets').update(upd).eq('id', ticketId)
}

async function fetchMessages(ticketId) {
  const { data } = await sb.from('support_messages')
    .select('sender_type, message_text, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })
    .limit(10)
  return data || []
}

async function notifyOperator(ticketId, lang, fromName, text, username, history) {
  if (!OPERATOR) return
  const header = `🔔 <b>Новый вопрос</b>\nОт: ${username || fromName}\n`
  const preview = text ? `\n\n<code>${text.slice(0, 500)}</code>` : ''
  const histBlock = history?.length
    ? `\n\n📋 <b>История:</b>\n${history.slice(-3).map(m => `[${m.sender_type}] ${(m.message_text || '').slice(0, 200)}`).join('\n')}`
    : ''
  const msg = await send(OPERATOR, header + preview + histBlock, { reply_markup: takeKB(ticketId) })
  if (msg?.ok && msg?.result?.message_id) {
    await logMsg(ticketId, 'operator', 'notified', msg.result.message_id)
  }
}

async function forwardToOperator(chatId, from, lang, text, ticketId) {
  const ticket = ticketId ? { id: ticketId } : await getTicket(from.id, from.username, from.first_name, lang)
  if (!ticketId) await logMsg(ticket.id, 'user', text || 'Запрос на оператора')
  await setStatus(ticket.id, 'waiting_operator')
  const history = await fetchMessages(ticket.id)
  await notifyOperator(ticket.id, lang, nameOf(from), text || '', from.username, history)
  return ticket
}

// ─── Handlers ───────────────────────────────────────────────

async function onStart(chatId, from) {
  const lang = langOf(from)
  const name = nameOf(from)
  await send(chatId, t(lang, 'start', name), { reply_markup: mainKB(lang) })
}

async function onFaq(chatId, from) {
  const lang = langOf(from)
  await send(chatId, t(lang, 'faqTitle'), { reply_markup: faqKB(lang) })
}

async function onAbout(chatId, from) {
  const lang = langOf(from)
  await send(chatId, t(lang, 'about'), { reply_markup: backKB(lang) })
}

async function onSupport(chatId, from) {
  const lang = langOf(from)
  await send(chatId, t(lang, 'askQuestion'))
}

async function onUserMessage(chatId, from, text) {
  const lang = langOf(from)
  const ticket = await getTicket(from.id, from.username, from.first_name, lang)
  await logMsg(ticket.id, 'user', text)

  if (!text || text.trim().length === 0) {
    await send(chatId, 'Пожалуйста, напишите ваш вопрос текстом.')
    return
  }

  await action(chatId, 'typing')

  const faqItems = t(lang, 'faqItems')
  const ai = await getAIResponse(text, lang, faqItems)

  if (ai.text && !ai.needsOperator) {
    await logMsg(ticket.id, 'ai', ai.text)
    await send(chatId, ai.text, { reply_markup: helpKB(lang) })
    await setStatus(ticket.id, 'ai_answered')
  } else {
    await logMsg(ticket.id, 'ai', `[AI skipped — ${ai.category}] ${text}`)
    await send(chatId, t(lang, 'transferToOperator'))
    const history = await fetchMessages(ticket.id)
    await notifyOperator(ticket.id, lang, nameOf(from), text, from.username, history)
    await setStatus(ticket.id, 'waiting_operator')
  }
}

async function onPhoto(chatId, from, photo, caption) {
  const lang = langOf(from)
  const ticket = await getTicket(from.id, from.username, from.first_name, lang)
  const text = caption || '[Фото]'
  await logMsg(ticket.id, 'user', text)
  await send(chatId, t(lang, 'transferToOperator'))
  const history = await fetchMessages(ticket.id)
  await notifyOperator(ticket.id, lang, nameOf(from), text, from.username, history)
  await setStatus(ticket.id, 'waiting_operator')
}

async function onOperatorReply(msg) {
  const replyTo = msg.reply_to_message
  const chatId = msg.chat.id
  const replyText = msg.text || ''
  if (!replyTo) {
    await send(chatId, 'Ответьте на сообщение с уведомлением, чтобы отправить ответ.')
    return
  }
  const { data: tickets } = await sb.from('support_messages')
    .select('ticket_id').eq('telegram_message_id', replyTo.message_id).limit(1)
  if (!tickets?.length) {
    await send(chatId, 'Не удалось найти тикет для этого ответа.')
    return
  }
  const ticketId = tickets[0].ticket_id
  const { data: ticket } = await sb.from('support_tickets').select('*').eq('id', ticketId).single()
  if (!ticket) {
    await send(chatId, 'Тикет не найден.')
    return
  }
  await logMsg(ticketId, 'operator', replyText)
  await setStatus(ticketId, 'in_progress')
  const ulang = ticket.telegram_language_code || 'ru'
  const formatted = `<b>✉️ Оператор ответил:</b>\n\n${replyText}`
  await send(ticket.telegram_user_id, formatted, { reply_markup: ratingKB(ticketId) })
  await send(chatId, `✅ Ответ отправлен пользователю. Тикет #${ticketId.slice(0, 8)}`)
}

// ─── Callbacks ──────────────────────────────────────────────

async function onCallback(cb) {
  const data = cb.data
  const msg = cb.message
  const chatId = msg.chat.id
  const msgId = msg.message_id
  const lang = langOf(cb.from)

  if (data === 'main_menu') {
    const name = nameOf(cb.from)
    await edit(chatId, msgId, t(lang, 'start', name), { reply_markup: mainKB(lang) })
    return answer(cb.id)
  }

  if (data === 'faq') {
    await edit(chatId, msgId, t(lang, 'faqTitle'), { reply_markup: faqKB(lang) })
    return answer(cb.id)
  }

  if (data === 'ask') {
    await edit(chatId, msgId, t(lang, 'askQuestion'))
    return answer(cb.id)
  }

  if (data === 'about') {
    await edit(chatId, msgId, t(lang, 'about'), { reply_markup: backKB(lang) })
    return answer(cb.id)
  }

  if (data.startsWith('faq_')) {
    const idx = parseInt(data.replace('faq_', ''), 10)
    const items = t(lang, 'faqItems')
    const item = items[idx]
    if (item) {
      await edit(chatId, msgId, `<b>${item.q}</b>\n\n${item.a}`, {
        parse_mode: 'HTML',
        reply_markup: helpKB(lang),
      })
    }
    return answer(cb.id)
  }

  if (data === 'resolved') {
    await edit(chatId, msgId, t(lang, 'resolved'), { reply_markup: mainKB(lang) })
    return answer(cb.id)
  }

  if (data === 'transfer') {
    await edit(chatId, msgId, t(lang, 'transferToOperator'))
    const from = cb.from
    const ticket = await forwardToOperator(chatId, from, lang, cb.message?.text || '', null)
    if (ticket?.id) {
      await logMsg(ticket.id, 'user', cb.message?.text || 'Запрос на оператора')
    }
    return answer(cb.id)
  }

  if (data.startsWith('close_')) {
    const ticketId = data.replace('close_', '')
    try { await setStatus(ticketId, 'closed') } catch {}
    await edit(chatId, msgId, t(lang, 'resolved'), { reply_markup: mainKB(lang) })
    return answer(cb.id)
  }

  if (data.startsWith('rate_')) {
    const parts = data.split('_')
    const ticketId = parts[1]
    const rating = parseInt(parts[2], 10)
    try {
      await sb.from('support_tickets').update({ rating, updated_at: new Date().toISOString() }).eq('id', ticketId)
    } catch {}
    const thanks = rating >= 4 ? '🙌 Спасибо за высокую оценку!' : 'Спасибо за ваш отзыв!'
    await edit(chatId, msgId, thanks + '\n\n' + t(lang, 'resolved'), { reply_markup: mainKB(lang) })
    return answer(cb.id)
  }

  if (data.startsWith('take_')) {
    const ticketId = data.replace('take_', '')
    if (chatId == OPERATOR) {
      try { await setStatus(ticketId, 'in_progress') } catch {}
      const msgs = await fetchMessages(ticketId)
      const preview = (msgs || []).reverse().slice(-5).map(m =>
        `[${m.sender_type}] ${(m.message_text || '').slice(0, 200)}`
      ).join('\n\n')
      await edit(chatId, msgId,
        `✅ Тикет #${ticketId.slice(0, 8)} взят в работу\n\n` +
        `Последние сообщения:\n${preview || '—'}`
      )
    }
    return answer(cb.id)
  }
}

// ─── Main ───────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      env: {
        token: !!TOKEN,
        operator: !!OPERATOR,
        openai: !!process.env.OPENAI_API_KEY,
        webhookSecret: !!WEBHOOK_SECRET,
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    })
  }

  if (req.method !== 'POST' || !TOKEN) return res.status(405).end()

  const { valid, reason } = verifyWebhookSecret(
    req.headers['x-telegram-bot-api-secret-token'],
    WEBHOOK_SECRET,
  )
  if (!valid) {
    if (reason === 'not_configured') {
      console.error('[webhook] TELEGRAM_WEBHOOK_SECRET is not set — rejecting all requests')
      return res.status(500).json({ error: 'Webhook not configured' })
    }
    console.warn('[webhook] Rejected unauthorized request from %s (reason: %s)', req.headers['x-forwarded-for'] || 'unknown', reason)
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = req.body
  if (!body) return res.status(200).end()

  try {
    const msg = body.message
    if (msg) {
      const chatId = msg.chat.id
      const from = msg.from

      if (chatId == OPERATOR && msg.reply_to_message) {
        await onOperatorReply(msg)
        return res.status(200).end()
      }

      const text = msg.text || ''

      if (text === '/start' || text === '/help') {
        await onStart(chatId, from)
      } else if (text === '/faq') {
        await onFaq(chatId, from)
      } else if (text === '/about') {
        await onAbout(chatId, from)
      } else if (text === '/support') {
        await onSupport(chatId, from)
      } else if (text) {
        await onUserMessage(chatId, from, text)
      } else if (msg.photo) {
        await onPhoto(chatId, from, msg.photo, msg.caption)
      }

      return res.status(200).end()
    }

    const cb = body.callback_query
    if (cb) {
      await onCallback(cb)
      return res.status(200).end()
    }
  } catch (err) {
    console.error('[webhook] Fatal:', err?.message || err)
  }

  res.status(200).end()
}
