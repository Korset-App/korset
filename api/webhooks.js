// Unified webhooks handler: Telegram support bot + Sentry alerts
// Route:
//   POST /api/webhooks/telegram  → Telegram bot webhook
//   POST /api/webhooks/sentry    → Sentry → Telegram alert relay

import { createClient } from '@supabase/supabase-js'
import { t } from '../src/telegram-bot/i18n.js'
import { getAIResponse } from '../src/telegram-bot/ai.js'
import { verifyWebhookSecret } from '../src/telegram-bot/verifyWebhook.js'

// ── Shared config ──
const TELEGRAM_API = 'https://api.telegram.org'
const SUPPORT_BOT_TOKEN = process.env.TELEGRAM_SUPPORT_BOT_TOKEN
const OPERATOR = process.env.TELEGRAM_OPERATOR_CHAT_ID
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const ALERT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ALERT_CHAT_ID = process.env.TELEGRAM_ALERT_CHAT_ID

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-telegram-bot-api-secret-token',
}

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

// ══════════════════════════════════════════════════════════════
//  SENTRY → TELEGRAM ALERT RELAY
// ══════════════════════════════════════════════════════════════

async function sendTelegram(token, chatId, text) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram API ${res.status}: ${err}`)
  }
  return res.json()
}

function formatAlert(payload) {
  const event = payload?.event || payload?.data?.event || {}
  const issue = payload?.issue || payload?.data?.issue || {}

  const title = event.title || issue.title || 'Unknown error'
  const culprit = event.culprit || event.transaction || '—'
  const issueUrl = issue.url || payload?.url || ''
  const level = (event.level || 'error').toUpperCase()
  const count = issue.count || event.count || 1
  const userCount = event.userCount || issue.userCount || 0
  const env = event.environment || 'production'
  const project = payload?.project_name || payload?.project || 'korset-web'

  const emojis = { FATAL: '💥', ERROR: '🚨', WARNING: '⚠️', INFO: 'ℹ️' }
  const emoji = emojis[level] || '🚨'

  const link = issueUrl ? `\n<a href="${issueUrl}">Open in Sentry</a>` : ''

  return `${emoji} <b>Sentry ${level}</b> | ${project} | ${env}

<b>${title}</b>
<code>${culprit}</code>

Events: ${count} | Users: ${userCount}${link}`
}

async function handleSentryWebhook(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!ALERT_BOT_TOKEN || !ALERT_CHAT_ID) {
    console.error('[webhooks:sentry] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ALERT_CHAT_ID')
    return res.status(200).json({ ok: false, error: 'Webhook not configured' })
  }

  let payload = {}
  try {
    if (typeof req.body === 'string') {
      payload = JSON.parse(req.body)
    } else if (req.body && typeof req.body === 'object') {
      payload = req.body
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const text = formatAlert(payload)

  try {
    await sendTelegram(ALERT_BOT_TOKEN, ALERT_CHAT_ID, text)
    console.log('[webhooks:sentry] Sent:', payload?.event?.title || payload?.issue?.title || 'unknown')
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[webhooks:sentry] Telegram error:', e.message)
    return res.status(200).json({ ok: false, error: 'Telegram send failed' })
  }
}

// ══════════════════════════════════════════════════════════════
//  TELEGRAM SUPPORT BOT WEBHOOK
// ══════════════════════════════════════════════════════════════

const sb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

function fetchTg(method, payload) {
  return fetch(`${TELEGRAM_API}/bot${SUPPORT_BOT_TOKEN}/${method}`, {
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

function sendPhoto(chatId, fileId, caption, extra = {}) {
  return fetchTg('sendPhoto', { chat_id: chatId, photo: fileId, caption, parse_mode: 'HTML', ...extra })
}

// ── Keyboards ──

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

function takeKB(ticketId) {
  return {
    inline_keyboard: [
      [{ text: '✅ Взять тикет', callback_data: `take_${ticketId}` }],
    ],
  }
}

function operatorActiveKB(ticketId) {
  return {
    inline_keyboard: [
      [{ text: '🔒 Закрыть тикет', callback_data: `op_close_${ticketId}` }],
    ],
  }
}

// ── Helpers ──

const RATE_LIMIT_WINDOW_S = 60
const RATE_LIMIT_MAX = 6
const TICKET_STALE_HOURS = 24

function langOf(from) {
  return from?.language_code === 'kz' ? 'kz' : 'ru'
}

function nameOf(from) {
  return from?.first_name || 'гость'
}

function isOperator(chatId) {
  return String(chatId) === String(OPERATOR)
}

async function checkRateLimit(userId) {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_S * 1000).toISOString()
  const { count } = await sb
    .from('support_messages')
    .select('*', { head: true, count: 'exact' })
    .eq('sender_type', 'user')
    .gte('created_at', since)
    .filter('ticket_id', 'in', `(SELECT id FROM support_tickets WHERE telegram_user_id = ${userId})`)
  return (count || 0) < RATE_LIMIT_MAX
}

async function closeStaleTickets(userId) {
  const staleSince = new Date(Date.now() - TICKET_STALE_HOURS * 3600 * 1000).toISOString()
  const { data: stale } = await sb
    .from('support_tickets')
    .select('id')
    .eq('telegram_user_id', userId)
    .in('status', ['in_progress', 'waiting_operator', 'ai_answered'])
    .lt('updated_at', staleSince)
  if (!stale?.length) return
  const ids = stale.map(s => s.id)
  await sb
    .from('support_tickets')
    .update({ status: 'closed', closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .in('id', ids)
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

async function fetchMessages(ticketId, limit = 10) {
  const { data } = await sb.from('support_messages')
    .select('sender_type, message_text, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

async function getFullTicket(ticketId) {
  const { data } = await sb.from('support_tickets').select('*').eq('id', ticketId).single()
  return data
}

async function findTicketByOperatorMessage(msgId) {
  const { data } = await sb.from('support_messages')
    .select('ticket_id').eq('telegram_message_id', msgId).limit(1)
  return data?.[0]?.ticket_id || null
}

async function getOperatorActiveTicket() {
  const { data } = await sb.from('support_tickets')
    .select('id, status, telegram_user_id, telegram_first_name, telegram_username, telegram_language_code, created_at')
    .in('status', ['waiting_operator', 'in_progress'])
    .order('updated_at', { ascending: false })
    .limit(1)
  return data?.[0] || null
}

async function getOperatorAllActiveTickets() {
  const { data } = await sb.from('support_tickets')
    .select('id, status, telegram_user_id, telegram_first_name, telegram_username, telegram_language_code, created_at')
    .in('status', ['waiting_operator', 'in_progress'])
    .order('updated_at', { ascending: false })
    .limit(10)
  return data || []
}

// ── Operator notification ──

async function notifyOperator(ticketId, lang, fromName, text, username, history) {
  if (!OPERATOR) return
  const header = `🔔 <b>Новый вопрос</b>\nОт: ${username ? '@' + username : fromName}\n`
  const preview = text ? `\n\n<code>${text.slice(0, 500)}</code>` : ''
  const histBlock = history?.length
    ? `\n\n📋 <b>История:</b>\n${history.slice(-3).map(m => `[${m.sender_type}] ${(m.message_text || '').slice(0, 200)}`).join('\n')}`
    : ''
  const msg = await send(OPERATOR, header + preview + histBlock, { reply_markup: takeKB(ticketId) })
  if (msg?.ok && msg?.result?.message_id) {
    await logMsg(ticketId, 'system', 'notified', msg.result.message_id)
  }
}

async function forwardUserMessageToOperator(ticket, from, text) {
  if (!OPERATOR) return
  const username = from?.username ? '@' + from.username : nameOf(from)
  const shortId = ticket.id.slice(0, 8)
  const msg = await send(OPERATOR, `💬 <b>${username}</b> (#${shortId}):\n\n${text}`, {
    reply_markup: operatorActiveKB(ticket.id),
  })
  if (msg?.ok && msg?.result?.message_id) {
    await logMsg(ticket.id, 'user', text, msg.result.message_id)
  }
}

// ── User handlers ──

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

  if (!await checkRateLimit(from.id)) {
    await send(chatId, t(lang, 'rateLimited'))
    return
  }

  await closeStaleTickets(from.id)

  const ticket = await getTicket(from.id, from.username, from.first_name, lang)
  await logMsg(ticket.id, 'user', text)

  if (!text || text.trim().length === 0) {
    await send(chatId, t(lang, 'emptyMessage'))
    return
  }

  if (['in_progress', 'waiting_operator'].includes(ticket.status)) {
    await forwardUserMessageToOperator(ticket, from, text)
    await send(chatId, t(lang, 'messageForwarded'))
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
    await setStatus(ticket.id, 'waiting_operator')
    const history = await fetchMessages(ticket.id)
    await notifyOperator(ticket.id, lang, nameOf(from), text, from.username, history)
  }
}

async function onUserPhoto(chatId, from, photo, caption) {
  const lang = langOf(from)
  const text = caption || '[Фото]'
  const ticket = await getTicket(from.id, from.username, from.first_name, lang)
  await logMsg(ticket.id, 'user', text)

  if (['in_progress', 'waiting_operator'].includes(ticket.status)) {
    const username = from?.username ? '@' + from.username : nameOf(from)
    const shortId = ticket.id.slice(0, 8)
    const fileId = photo[photo.length - 1].file_id
    const msg = await sendPhoto(OPERATOR, fileId, `📷 <b>${username}</b> (#${shortId}):`, {
      reply_markup: operatorActiveKB(ticket.id),
    })
    if (msg?.ok && msg?.result?.message_id) {
      await logMsg(ticket.id, 'user', '[Фото]', msg.result.message_id)
    }
    await send(chatId, t(lang, 'messageForwarded'))
    return
  }

  await send(chatId, t(lang, 'transferToOperator'))
  await setStatus(ticket.id, 'waiting_operator')
  const history = await fetchMessages(ticket.id)
  await notifyOperator(ticket.id, lang, nameOf(from), text, from.username, history)
}

// ── Operator handlers ──

async function onOperatorText(msg) {
  const chatId = msg.chat.id
  const replyText = msg.text || ''
  const replyTo = msg.reply_to_message

  let ticketId = null

  if (replyTo) {
    ticketId = await findTicketByOperatorMessage(replyTo.message_id)
  }

  if (!ticketId) {
    const active = await getOperatorActiveTicket()
    if (active) {
      ticketId = active.id
    } else {
      const all = await getOperatorAllActiveTickets()
      if (all.length === 0) {
        await send(chatId, 'Нет активных тикетов для ответа.')
      } else {
        await send(chatId, 'Несколько активных тикетов. Ответьте (reply) на сообщение нужного тикета или используйте /tickets чтобы посмотреть список.')
      }
      return
    }
  }

  const ticket = await getFullTicket(ticketId)
  if (!ticket) {
    await send(chatId, 'Тикет не найден.')
    return
  }

  await logMsg(ticketId, 'operator', replyText)
  await setStatus(ticketId, 'in_progress')

  const ulang = ticket.telegram_language_code || 'ru'
  await send(ticket.telegram_user_id, `<b>✉️ ${t(ulang, 'operatorReplied')}</b>\n\n${replyText}`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: t(ulang, 'closeTicket'), callback_data: `close_${ticketId}` }],
        [{ text: t(ulang, 'replyToOperator'), callback_data: `reply_${ticketId}` }],
      ],
    },
  })

  const shortId = ticketId.slice(0, 8)
  const username = ticket.telegram_username ? '@' + ticket.telegram_username : ticket.telegram_first_name || '—'
  await send(chatId, `✅ Ответ отправлен ${username} (#${shortId})`, {
    reply_markup: operatorActiveKB(ticketId),
  })
}

async function onOperatorPhoto(msg) {
  const chatId = msg.chat.id
  const caption = msg.caption || ''
  const replyTo = msg.reply_to_message
  const photo = msg.photo
  const fileId = photo[photo.length - 1].file_id

  let ticketId = null

  if (replyTo) {
    ticketId = await findTicketByOperatorMessage(replyTo.message_id)
  }

  if (!ticketId) {
    const active = await getOperatorActiveTicket()
    if (active) {
      ticketId = active.id
    } else {
      await send(chatId, 'Отправьте фото ответом (reply) на сообщение тикета.')
      return
    }
  }

  const ticket = await getFullTicket(ticketId)
  if (!ticket) {
    await send(chatId, 'Тикет не найден.')
    return
  }

  await logMsg(ticketId, 'operator', caption || '[Фото]')
  await setStatus(ticketId, 'in_progress')

  const ulang = ticket.telegram_language_code || 'ru'
  await sendPhoto(ticket.telegram_user_id, fileId, `<b>✉️ ${t(ulang, 'operatorReplied')}</b>\n\n${caption || ''}`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: t(ulang, 'closeTicket'), callback_data: `close_${ticketId}` }],
        [{ text: t(ulang, 'replyToOperator'), callback_data: `reply_${ticketId}` }],
      ],
    },
  })

  const shortId = ticketId.slice(0, 8)
  const username = ticket.telegram_username ? '@' + ticket.telegram_username : ticket.telegram_first_name || '—'
  await send(chatId, `✅ Фото отправлено ${username} (#${shortId})`, {
    reply_markup: operatorActiveKB(ticketId),
  })
}

async function onOperatorTickets(chatId) {
  const tickets = await getOperatorAllActiveTickets()
  if (tickets.length === 0) {
    await send(chatId, '📋 Нет открытых тикетов.')
    return
  }

  const lines = ['📋 <b>Открытые тикеты:</b>\n']
  for (const tk of tickets) {
    const shortId = tk.id.slice(0, 8)
    const name = tk.telegram_first_name || tk.telegram_username || '—'
    const statusEmoji = tk.status === 'in_progress' ? '🔄' : '⏳'
    const time = new Date(tk.created_at).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })
    lines.push(`${statusEmoji} <b>#${shortId}</b> — ${name} (${tk.status})\n   ${time}`)
  }
  lines.push('\nОтветьте (reply) на сообщение тикета, чтобы написать клиенту.')
  await send(chatId, lines.join('\n'))
}

async function onOperatorClose(chatId) {
  const active = await getOperatorActiveTicket()
  if (!active) {
    await send(chatId, 'Нет активных тикетов для закрытия.')
    return
  }
  await setStatus(active.id, 'closed')
  const ticket = await getFullTicket(active.id)
  const shortId = active.id.slice(0, 8)
  const username = ticket?.telegram_username ? '@' + ticket.telegram_username : ticket?.telegram_first_name || '—'
  await send(chatId, `🔒 Тикет #${shortId} (${username}) закрыт.`)
  if (ticket) {
    const ulang = ticket.telegram_language_code || 'ru'
    await send(ticket.telegram_user_id, t(ulang, 'ticketClosedByOperator'), {
      reply_markup: mainKB(ulang),
    })
  }
}

// ── Callbacks ──

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
    const ticket = await getTicket(from.id, from.username, from.first_name, lang)
    await logMsg(ticket.id, 'user', cb.message?.text || 'Запрос на оператора')
    await setStatus(ticket.id, 'waiting_operator')
    const history = await fetchMessages(ticket.id)
    await notifyOperator(ticket.id, lang, nameOf(from), cb.message?.text || '', from.username, history)
    return answer(cb.id)
  }

  if (data.startsWith('close_')) {
    const ticketId = data.replace('close_', '')
    try { await setStatus(ticketId, 'closed') } catch (_e) {}
    await edit(chatId, msgId, t(lang, 'resolved'), { reply_markup: mainKB(lang) })
    return answer(cb.id)
  }

  if (data.startsWith('reply_')) {
    const ticketId = data.replace('reply_', '')
    const ticket = await getFullTicket(ticketId)
    if (!ticket) return answer(cb.id, 'Тикет не найден')
    const ulang = ticket.telegram_language_code || 'ru'
    await send(chatId, t(ulang, 'askQuestion'))
    if (isOperator(chatId)) return answer(cb.id)
    await setStatus(ticketId, 'in_progress')
    return answer(cb.id)
  }

  if (data.startsWith('rate_')) {
    const parts = data.split('_')
    const ticketId = parts[1]
    const rating = parseInt(parts[2], 10)
    try {
      await sb.from('support_tickets').update({ rating, updated_at: new Date().toISOString() }).eq('id', ticketId)
    } catch (_e) {}
    const thanks = rating >= 4 ? '🙌 Спасибо за высокую оценку!' : 'Спасибо за ваш отзыв!'
    await edit(chatId, msgId, thanks + '\n\n' + t(lang, 'resolved'), { reply_markup: mainKB(lang) })
    return answer(cb.id)
  }

  if (data.startsWith('take_')) {
    const ticketId = data.replace('take_', '')
    if (!isOperator(chatId)) {
      return answer(cb.id, 'Только оператор может взять тикет.')
    }
    try { await setStatus(ticketId, 'in_progress') } catch (_e) {}
    const msgs = await fetchMessages(ticketId, 5)
    const ticket = await getFullTicket(ticketId)
    const preview = (msgs || []).reverse().map(m =>
      `[${m.sender_type}] ${(m.message_text || '').slice(0, 200)}`
    ).join('\n\n')
    const username = ticket?.telegram_username ? '@' + ticket.telegram_username : ticket?.telegram_first_name || '—'
    const shortId = ticketId.slice(0, 8)
    await edit(chatId, msgId,
      `✅ <b>Тикет #${shortId} взят в работу</b>\nОт: ${username}\n\nПоследние сообщения:\n${preview || '—'}`,
      { reply_markup: operatorActiveKB(ticketId) }
    )
    const ulang = ticket?.telegram_language_code || 'ru'
    await send(ticket.telegram_user_id, t(ulang, 'operatorAssigned'), {
      reply_markup: {
        inline_keyboard: [[{ text: t(ulang, 'closeTicket'), callback_data: `close_${ticketId}` }]],
      },
    })
    return answer(cb.id)
  }

  if (data.startsWith('op_close_')) {
    const ticketId = data.replace('op_close_', '')
    if (!isOperator(chatId)) {
      return answer(cb.id, 'Только оператор может закрыть тикет.')
    }
    try {
      await setStatus(ticketId, 'closed')
    } catch (_e) {}
    const ticket = await getFullTicket(ticketId)
    const shortId = ticketId.slice(0, 8)
    await edit(chatId, msgId, `🔒 Тикет #${shortId} закрыт`)
    if (ticket) {
      const ulang = ticket.telegram_language_code || 'ru'
      await send(ticket.telegram_user_id, t(ulang, 'ticketClosedByOperator'), {
        reply_markup: mainKB(ulang),
      })
    }
    return answer(cb.id, 'Тикет закрыт')
  }

  return answer(cb.id)
}

async function handleTelegramWebhook(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, {
      status: 'ok',
      env: {
        token: !!SUPPORT_BOT_TOKEN,
        operator: !!OPERATOR,
        openai: !!process.env.OPENAI_API_KEY,
        webhookSecret: !!WEBHOOK_SECRET,
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    })
  }

  if (req.method !== 'POST' || !SUPPORT_BOT_TOKEN) return res.status(405).end()

  const { valid, reason } = verifyWebhookSecret(
    req.headers['x-telegram-bot-api-secret-token'],
    WEBHOOK_SECRET,
  )
  if (!valid) {
    if (reason === 'not_configured') {
      console.error('[webhooks:tg] TELEGRAM_WEBHOOK_SECRET is not set — rejecting all requests')
      return json(res, 500, { error: 'Webhook not configured' })
    }
    console.warn('[webhooks:tg] Rejected unauthorized request from %s (reason: %s)', req.headers['x-forwarded-for'] || 'unknown', reason)
    return json(res, 401, { error: 'Unauthorized' })
  }

  const body = req.body
  if (!body) return res.status(200).end()

  try {
    const msg = body.message
    if (msg) {
      const chatId = msg.chat.id
      const from = msg.from

      if (isOperator(chatId)) {
        const text = msg.text || ''
        if (text === '/tickets') {
          await onOperatorTickets(chatId)
          return res.status(200).end()
        }
        if (text === '/close') {
          await onOperatorClose(chatId)
          return res.status(200).end()
        }
        if (msg.photo) {
          await onOperatorPhoto(msg)
          return res.status(200).end()
        }
        if (msg.reply_to_message || text) {
          await onOperatorText(msg)
          return res.status(200).end()
        }
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
        await onUserPhoto(chatId, from, msg.photo, msg.caption)
      }

      return res.status(200).end()
    }

    const cb = body.callback_query
    if (cb) {
      await onCallback(cb)
      return res.status(200).end()
    }
  } catch (err) {
    console.error('[webhooks:tg] Fatal:', err?.message || err)
  }

  res.status(200).end()
}

// ══════════════════════════════════════════════════════════════
//  ROUTER
// ══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') return res.status(204).end()

  const url = req.url || ''
  if (url.includes('/api/webhooks/sentry') || url.includes('/api/sentry')) {
    return handleSentryWebhook(req, res)
  }

  return handleTelegramWebhook(req, res)
}