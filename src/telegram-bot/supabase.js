import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let client = null

export function getSupabase() {
  if (client) return client
  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  return client
}

export async function createOrGetTicket(userId, username, firstName, lang) {
  const sb = getSupabase()

  const { data: open } = await sb
    .from('support_tickets')
    .select('id, status')
    .eq('telegram_user_id', userId)
    .in('status', ['new', 'ai_answered', 'waiting_operator', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (open && open.length > 0) {
    return open[0]
  }

  const { data: ticket, error } = await sb
    .from('support_tickets')
    .insert({
      telegram_user_id: userId,
      telegram_username: username,
      telegram_first_name: firstName,
      telegram_language_code: lang,
    })
    .select('id, status')
    .single()

  if (error) throw error
  return ticket
}

export async function addMessage(ticketId, senderType, text, telegramMessageId) {
  const sb = getSupabase()

  const { error } = await sb.from('support_messages').insert({
    ticket_id: ticketId,
    sender_type: senderType,
    message_text: text,
    telegram_message_id: telegramMessageId,
  })

  if (error) throw error
}

export async function updateTicketStatus(ticketId, status) {
  const sb = getSupabase()
  const updates = { status, updated_at: new Date().toISOString() }
  if (status === 'closed') updates.closed_at = new Date().toISOString()

  const { error } = await sb.from('support_tickets').update(updates).eq('id', ticketId)

  if (error) throw error
}

export async function getTicketMessages(ticketId) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getTicketById(ticketId) {
  const sb = getSupabase()
  const { data, error } = await sb.from('support_tickets').select('*').eq('id', ticketId).single()

  if (error) throw error
  return data
}
