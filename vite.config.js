import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Плагин для локальной обработки /api/ai (на Vercel это серверная функция)
function localApiPlugin() {
  let apiKey = ''
  return {
    name: 'local-api',
    configResolved(config) {
      // Загружаем ВСЕ переменные из .env.local, не только VITE_
      const env = loadEnv(config.mode, config.root, '')
      apiKey = env.OPENAI_API_KEY || ''
    },
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
        if (req.method !== 'POST') { res.writeHead(405); res.end('Method not allowed'); return }
        if (!apiKey) { res.writeHead(500); res.end(JSON.stringify({ error: 'OPENAI_API_KEY not set in .env.local' })); return }

        let body = ''
        for await (const chunk of req) body += chunk
        const { messages, mode, product, profile, lang } = JSON.parse(body)

        // Строим system prompt (дублируем логику из api/ai.js)
        let systemPrompt
        if (mode === 'product' && product) {
          const parts = []
          if (profile?.halal) parts.push('нужен халал')
          if (profile?.allergens?.length) parts.push(`аллергии: ${profile.allergens.join(', ')}`)
          if (profile?.dietGoals?.length) parts.push(`диета: ${profile.dietGoals.join(', ')}`)
          const langNote = lang === 'kz' ? 'Отвечай на казахском языке.' : 'Отвечай на русском языке.'
          systemPrompt = `Ты — Körset AI, умный помощник покупателя в супермаркете Казахстана. Отвечай кратко, по делу. Максимум 3–4 предложения. Без markdown.\n${langNote}\nТОВАР: ${product.name}\nПРОФИЛЬ: ${parts.length ? parts.join('; ') : 'не задан'}`
        } else if (mode === 'enrich' && product) {
          systemPrompt = `Товар: "${product.name}". Ответь ТОЛЬКО JSON: {"ingredients":"...","allergens":[...],"dietTags":[...],"description":"..."}`
        } else {
          systemPrompt = lang === 'kz'
            ? 'Сен — Körset AI көмекшісісің. Қысқа қазақша жауап бер.'
            : 'Ты — Körset AI, помощник покупателя. Кратко, по-русски.'
        }

        try {
          const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: 'gpt-4.1-nano',
              max_tokens: mode === 'enrich' ? 300 : 400,
              temperature: mode === 'enrich' ? 0.3 : 0.7,
              messages: [{ role: 'system', content: systemPrompt }, ...messages],
            }),
          })
          const data = await openaiRes.json()
          if (!openaiRes.ok) {
            res.writeHead(openaiRes.status, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: data.error?.message || `OpenAI HTTP ${openaiRes.status}` }))
            return
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ reply: data.choices?.[0]?.message?.content?.trim() || '' }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  base: '/',
  build: {
    chunkSizeWarningLimit: 1000,
  }
})
