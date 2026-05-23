import { Bot } from 'grammy'
import { t } from './i18n.js'
import * as menu from './menu.js'
import * as db from './supabase.js'

const OPERATOR_CHAT_ID = process.env.TELEGRAM_OPERATOR_CHAT_ID
let bot = null
let initialized = false

export function getBot() {
  if (bot) return bot
  bot = new Bot(process.env.TELEGRAM_SUPPORT_BOT_TOKEN)
  return bot
}

export function setupBot() {
  if (initialized) return getBot()
  initialized = true
  const b = getBot()

  b.command('start', async (ctx) => {
    const lang = resolveLang(ctx)
    await ctx.reply(t(lang, 'start', ctx.from?.first_name || 'гость'), {
      reply_markup: menu.mainMenu(lang),
    })
  })

  b.command('faq', async (ctx) => {
    const lang = resolveLang(ctx)
    await ctx.reply(t(lang, 'faqTitle'), {
      reply_markup: menu.faqMenu(lang),
    })
  })

  b.command('support', async (ctx) => {
    const lang = resolveLang(ctx)
    await ctx.reply(t(lang, 'askQuestion'))
  })

  b.command('about', async (ctx) => {
    const lang = resolveLang(ctx)
    await ctx.reply(t(lang, 'about'), {
      reply_markup: menu.backButton(lang),
    })
  })

  b.callbackQuery('main_menu', async (ctx) => {
    const lang = resolveLang(ctx)
    await ctx.editMessageText(t(lang, 'start', ctx.from?.first_name || 'гость'), {
      reply_markup: menu.mainMenu(lang),
    })
    await ctx.answerCallbackQuery()
  })

  b.callbackQuery('faq', async (ctx) => {
    const lang = resolveLang(ctx)
    await ctx.editMessageText(t(lang, 'faqTitle'), {
      reply_markup: menu.faqMenu(lang),
    })
    await ctx.answerCallbackQuery()
  })

  b.callbackQuery('ask', async (ctx) => {
    const lang = resolveLang(ctx)
    await ctx.editMessageText(t(lang, 'askQuestion'))
    await ctx.answerCallbackQuery()
  })

  b.callbackQuery('about', async (ctx) => {
    const lang = resolveLang(ctx)
    await ctx.editMessageText(t(lang, 'about'), {
      reply_markup: menu.backButton(lang),
    })
    await ctx.answerCallbackQuery()
  })

  b.callbackQuery(/^faq_(\d+)$/, async (ctx) => {
    const lang = resolveLang(ctx)
    const idx = parseInt(ctx.match[1], 10)
    const items = t(lang, 'faqItems')
    const item = items[idx]
    if (!item) {
      await ctx.answerCallbackQuery()
      return
    }
    await ctx.editMessageText(`<b>${item.q}</b>\n\n${item.a}`, {
      parse_mode: 'HTML',
      reply_markup: menu.helpButtons(lang),
    })
    await ctx.answerCallbackQuery()
  })

  b.callbackQuery('resolved', async (ctx) => {
    const lang = resolveLang(ctx)
    await ctx.editMessageText(t(lang, 'resolved'), {
      reply_markup: menu.mainMenu(lang),
    })
    await ctx.answerCallbackQuery()
  })

  b.callbackQuery(/^close_/, async (ctx) => {
    const lang = resolveLang(ctx)
    const ticketId = ctx.callbackQuery.data.replace('close_', '')
    try {
      await db.updateTicketStatus(ticketId, 'closed')
    } catch (e) {
      console.error('[close error]', e)
    }
    await ctx.editMessageText(t(lang, 'resolved'), {
      reply_markup: menu.mainMenu(lang),
    })
    await ctx.answerCallbackQuery()
  })

  b.callbackQuery(/^take_/, async (ctx) => {
    const ticketId = ctx.callbackQuery.data.replace('take_', '')
    const chatId = ctx.from?.id
    if (String(chatId) !== String(OPERATOR_CHAT_ID)) {
      await ctx.answerCallbackQuery({ text: 'Только оператор может взять тикет.' })
      return
    }
    try {
      await db.updateTicketStatus(ticketId, 'in_progress')
      const ticket = await db.getTicketById(ticketId)
      const messages = await db.getTicketMessages(ticketId)
      const preview = messages
        .slice(-3)
        .map((m) => `[${m.sender_type}] ${m.message_text?.slice(0, 200)}`)
        .join('\n\n')
      await ctx.editMessageText(
        `✅ Тикет #${ticketId.slice(0, 8)} взят в работу\n\n` +
          `Пользователь: ${ticket.telegram_first_name || ticket.telegram_username || ticket.telegram_user_id}\n` +
          `Последние сообщения:\n${preview || '—'}`
      )
    } catch (e) {
      console.error('[take error]', e)
    }
    await ctx.answerCallbackQuery()
  })

  b.callbackQuery('transfer', async (ctx) => {
    const lang = resolveLang(ctx)
    const userId = ctx.from?.id
    const username = ctx.from?.username
    const firstName = ctx.from?.first_name

    try {
      const ticket = await db.createOrGetTicket(userId, username, firstName, lang)
      const msgText = ctx.callbackQuery.message?.text || 'Запрос на оператора'
      await db.addMessage(ticket.id, 'user', msgText)
      await db.updateTicketStatus(ticket.id, 'waiting_operator')
      await ctx.editMessageText(t(lang, 'transferToOperator'))
      await notifyOperator(ctx, ticket, lang, msgText)
    } catch (err) {
      console.error('[transfer error]', err)
      await ctx.reply(t(lang, 'operatorBusy'))
    }
    await ctx.answerCallbackQuery()
  })

  b.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id

    if (String(chatId) === String(OPERATOR_CHAT_ID)) {
      await handleOperatorText(ctx)
      return
    }

    await handleUserText(ctx)
  })

  return b
}

function resolveLang(ctx) {
  const lang = ctx.from?.language_code || 'ru'
  return ['ru', 'kz'].includes(lang) ? lang : 'ru'
}

async function handleUserText(ctx) {
  const lang = resolveLang(ctx)
  const text = ctx.message.text

  try {
    const ticket = await db.createOrGetTicket(
      ctx.from.id,
      ctx.from.username,
      ctx.from.first_name,
      lang
    )
    await db.addMessage(ticket.id, 'user', text)
    await notifyOperator(ctx, ticket, lang, text)
  } catch (err) {
    console.error('[handleUserText error]', err)
    await ctx.reply(t(lang, 'operatorBusy'))
  }
}

async function handleOperatorText(ctx) {
  const replyTo = ctx.message.reply_to_message
  if (!replyTo) {
    await ctx.reply('Ответьте на сообщение с уведомлением, чтобы отправить ответ пользователю.')
    return
  }

  const originalMsgId = replyTo.message_id
  const replyText = ctx.message.text

  try {
    const { data: tickets } = await db
      .getSupabase()
      .from('support_messages')
      .select('ticket_id')
      .eq('telegram_message_id', originalMsgId)
      .limit(1)

    if (!tickets || tickets.length === 0) {
      await ctx.reply('Не удалось найти тикет для этого ответа.')
      return
    }

    const ticketId = tickets[0].ticket_id
    const ticket = await db.getTicketById(ticketId)
    await db.addMessage(ticketId, 'operator', replyText)
    await db.updateTicketStatus(ticketId, 'in_progress')

    const lang = ticket.telegram_language_code || 'ru'
    const formattedReply = `<b>${t(lang, 'operatorReplied')}</b>\n\n${replyText}`

    await bot.api.sendMessage(ticket.telegram_user_id, formattedReply, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: t(lang, 'closeTicket'), callback_data: `close_${ticketId}` }]],
      },
    })

    await ctx.reply(t(lang, 'operatorReplySent'))
  } catch (err) {
    console.error('[handleOperatorText error]', err)
    await ctx.reply('Ошибка при отправке ответа.')
  }
}

async function notifyOperator(ctx, ticket, lang, text) {
  if (!OPERATOR_CHAT_ID) {
    await ctx.reply(t(lang, 'operatorBusy'))
    return
  }

  const username = ctx.from?.username || ctx.from?.first_name || '—'
  const notification = t(lang, 'operatorNotification', username, text)

  try {
    const operatorMsg = await bot.api.sendMessage(OPERATOR_CHAT_ID, notification, {
      reply_markup: {
        inline_keyboard: [[{ text: '✅ Взять тикет', callback_data: `take_${ticket.id}` }]],
      },
    })
    await db.addMessage(
      ticket.id,
      'operator',
      'Нотификация оператору отправлена',
      operatorMsg.message_id
    )
  } catch (err) {
    console.error('[notifyOperator error]', err)
    await ctx.reply(t(lang, 'operatorBusy'))
  }
}
