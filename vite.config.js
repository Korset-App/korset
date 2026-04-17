import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createClient } from '@supabase/supabase-js'

// Плагин для локальной обработки /api/ai (на Vercel это серверная функция)
// Включает RAG-контекст из vault_embeddings (pgvector)
function localApiPlugin() {
  let env = {}
  return {
    name: 'local-api',
    configResolved(config) {
      env = loadEnv(config.mode, config.root, '')
    },
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method not allowed')
          return
        }
        const apiKey = env.OPENAI_API_KEY
        if (!apiKey) {
          res.writeHead(500)
          res.end(JSON.stringify({ error: 'OPENAI_API_KEY not set in .env.local' }))
          return
        }

        let body = ''
        for await (const chunk of req) body += chunk
        const { messages, mode, product, profile, lang, productA, productB, winner } =
          JSON.parse(body)

        // ── RAG: подтягиваем контекст из vault ──
        let ragContext = null
        try {
          const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
          const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
          if (supabaseUrl && supabaseKey && (mode === 'product' || mode === 'compare')) {
            const supabase = createClient(supabaseUrl, supabaseKey, {
              auth: { persistSession: false },
            })
            const queryParts = []
            if (product?.ingredients) queryParts.push(product.ingredients.slice(0, 200))
            if (product?.allergens?.length) queryParts.push(product.allergens.join(' '))
            if (profile?.halal) queryParts.push('халал halal сомнительные добавки')
            if (profile?.allergens?.length) queryParts.push(profile.allergens.join(' '))
            const queryText = queryParts.join(' ').slice(0, 500)
            if (queryText) {
              const embRes = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                  model: 'text-embedding-3-small',
                  dimensions: 1536,
                  input: queryText,
                }),
              })
              if (embRes.ok) {
                const embData = await embRes.json()
                const queryEmb = embData.data?.[0]?.embedding
                if (queryEmb) {
                  const { data: chunks } = await supabase.rpc('match_vault_chunks', {
                    query_embedding: queryEmb,
                    match_count: 6,
                    filter: { domain: 'knowledge' },
                  })
                  if (chunks?.length) {
                    ragContext =
                      chunks
                        .filter((r) => r.similarity >= 0.5)
                        .slice(0, 3)
                        .map((r) => `[${r.heading || r.source_file}]: ${r.content.slice(0, 300)}`)
                        .join('\n\n') || null
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('RAG unavailable locally:', e.message)
        }

        // Строим system prompt (дублируем логику из api/ai.js)
        let systemPrompt
        const ragSection = ragContext
          ? `\n\nПРОВЕРЕННЫЕ ЗНАНИЯ (приоритет над общими знаниями):\n${ragContext}`
          : ''

        if (mode === 'product' && product) {
          const parts = []
          if (profile?.halal) parts.push('нужен халал')
          if (profile?.allergens?.length) parts.push(`аллергии: ${profile.allergens.join(', ')}`)
          if (profile?.dietGoals?.length) parts.push(`диета: ${profile.dietGoals.join(', ')}`)
          const langNote =
            lang === 'kz' ? 'Отвечай на казахском языке.' : 'Отвечай на русском языке.'
          systemPrompt = `Ты — Körset AI, умный помощник покупателя в супермаркете Казахстана. Отвечай кратко, по делу. Максимум 3–4 предложения. Без markdown.\n${langNote}\nТОВАР: ${product.name}\nПРОФИЛЬ: ${parts.length ? parts.join('; ') : 'не задан'}${ragSection}`
        } else if (mode === 'enrich' && product) {
          systemPrompt = `Товар: "${product.name}". Ответь ТОЛЬКО JSON: {"ingredients":"...","allergens":[...],"dietTags":[...],"description":"..."}`
        } else {
          systemPrompt =
            lang === 'kz'
              ? 'Сен — Körset AI көмекшісісің. Қысқа қазақша жауап бер.'
              : 'Ты — Körset AI, помощник покупателя. Кратко, по-русски.'
        }

        try {
          const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
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
            res.end(
              JSON.stringify({ error: data.error?.message || `OpenAI HTTP ${openaiRes.status}` })
            )
            return
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              reply: data.choices?.[0]?.message?.content?.trim() || '',
              ragUsed: !!ragContext,
            })
          )
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    localApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      srcDir: 'src',
      filename: 'sw.js',
      strategies: 'injectManifest',
      injectManifest: {
        swSrc: 'src/sw.js',
        swDest: 'dist/sw.js',
      },
      manifest: {
        name: 'Körset',
        short_name: 'Körset',
        start_url: '/',
        display: 'standalone',
        background_color: '#070712',
        theme_color: '#7C3AED',
        icons: [
          { src: '/favicon.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  base: '/',
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
