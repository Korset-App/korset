// Vercel Serverless Function — серверный прокси для OpenAI GPT-4.1 nano
// API ключ ТОЛЬКО на сервере (process.env.OPENAI_API_KEY)
// Клиент вызывает: POST /api/ai { messages, mode, product?, lang }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  try {
    const { messages, mode, product, profile, lang } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' })
    }

    // ── Формируем system prompt на сервере ──
    let systemPrompt

    if (mode === 'product' && product) {
      systemPrompt = buildProductPrompt(product, profile, lang)
    } else if (mode === 'enrich' && product) {
      systemPrompt = buildEnrichPrompt(product)
    } else if (mode === 'compare' && req.body.productA && req.body.productB) {
      systemPrompt = buildComparePrompt(req.body.productA, req.body.productB, profile, req.body.winner, lang)
    } else {
      systemPrompt = buildGeneralPrompt(lang)
    }

    // ── Вызов OpenAI ──
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        max_tokens: mode === 'enrich' ? 300 : mode === 'compare' ? 200 : 400,
        temperature: mode === 'enrich' ? 0.3 : 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}))
      console.error('OpenAI error:', err)
      return res.status(openaiRes.status).json({
        error: err.error?.message || `OpenAI HTTP ${openaiRes.status}`,
      })
    }

    const data = await openaiRes.json()
    const reply = data.choices?.[0]?.message?.content?.trim()

    return res.status(200).json({ reply: reply || '' })

  } catch (e) {
    console.error('API /ai error:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


// ── System prompts ──────────────────────────────────────────────

function buildProductPrompt(product, profile, lang) {
  const profileParts = []
  if (profile?.halal || profile?.halalOnly) profileParts.push('нужен халал')
  if (profile?.allergens?.length) profileParts.push(`аллергии: ${profile.allergens.join(', ')}`)
  if (profile?.dietGoals?.length) profileParts.push(`диета: ${profile.dietGoals.join(', ')}`)

  const nutr = formatNutrition(product)
  const langNote = lang === 'kz'
    ? 'Отвечай на казахском языке.'
    : 'Отвечай на русском языке.'

  return `Ты — Körset AI, умный помощник покупателя в супермаркете Казахстана. Отвечай кратко, по делу. Максимум 3–4 предложения. Без markdown — пиши живым текстом как друг.
${langNote}

ТОВАР: ${product.name} | Бренд: ${product.brand || '—'}
КБЖУ: ${nutr} | Состав: ${product.ingredients || '—'}
Халал: ${product.halalStatus === 'yes' ? 'да' : product.halalStatus === 'no' ? 'нет' : 'неизвестно'}
Аллергены: ${product.allergens?.join(', ') || 'нет'}
ПРОФИЛЬ: ${profileParts.length ? profileParts.join('; ') : 'не задан'}`
}


function buildGeneralPrompt(lang) {
  if (lang === 'kz') {
    return 'Сен — Қазақстан супермаркетіндегі Körset AI көмекшісісің. Тауар табуға, рецепт ұсынуға және құрамын түсіндіруге көмектес. Қысқа, түсінікті қазақша жауап бер. Максимум 3-4 сөйлем.'
  }
  return 'Ты — Körset AI, помощник покупателя в супермаркете Казахстана. Помогаешь найти товары, советуешь рецепты, отвечаешь про состав и аллергены. Кратко, по-русски, как дружелюбный консультант. Максимум 3-4 предложения.'
}


function buildComparePrompt(productA, productB, profile, winner, lang) {
  const profileParts = []
  if (profile?.halal || profile?.halalOnly) profileParts.push('нужен халал')
  if (profile?.allergens?.length) profileParts.push(`аллергии: ${profile.allergens.join(', ')}`)
  if (profile?.dietGoals?.length) profileParts.push(`диета: ${profile.dietGoals.join(', ')}`)

  const langNote = lang === 'kz' ? 'Отвечай на казахском языке.' : 'Отвечай на русском языке.'
  const profileStr = profileParts.length ? profileParts.join('; ') : 'не задан'

  const nutrA = formatNutrition(productA)
  const nutrB = formatNutrition(productB)

  const isDraw = winner === 'draw'
  const winnerLine = isDraw
    ? 'Эти товары по безопасности и составу одинаковы.'
    : `По расчёту Körset, ${winner === 'A' ? productA.name : productB.name} лучше для данного пользователя.`

  return `Ты — Körset AI. Ты только что сравнил два товара для покупателя. Напиши 1-2 предложения объяснения — почему именно этот товар лучше (или почему ничья). Без markdown, живым текстом.
${langNote}
ПРОФИЛЬ: ${profileStr}
ТОВАР A: ${productA.name} | Халал: ${productA.halalStatus || '?'} | КБЖУ: ${nutrA} | Аллергены: ${productA.allergens?.join(', ') || 'нет'}
ТОВАР B: ${productB.name} | Халал: ${productB.halalStatus || '?'} | КБЖУ: ${nutrB} | Аллергены: ${productB.allergens?.join(', ') || 'нет'}
${winnerLine}`
}


function buildEnrichPrompt(product) {
  return `Товар: "${product.name}"${product.brand ? `, бренд: ${product.brand}` : ''}.
Ответь ТОЛЬКО JSON без markdown:
{"ingredients":"состав на русском","allergens":["milk","gluten","nuts","eggs","fish","soy","peanuts","shellfish"],"dietTags":["halal","vegan","vegetarian","gluten_free","dairy_free","sugar_free"],"description":"1 предложение о товаре"}
Оставь в allergens и dietTags ТОЛЬКО те, которые реально относятся к этому товару.`
}


function formatNutrition(product) {
  // Поддерживаем оба формата: nutrition (external) и nutritionPer100 (local)
  const n = product.nutrition || product.nutritionPer100
  if (!n) return 'не указано'

  const protein = n.protein ?? '—'
  const fat = n.fat ?? '—'
  const carbs = n.carbs ?? '—'
  const kcal = n.calories ?? n.kcal ?? '—'

  return `Белки ${protein}г, Жиры ${fat}г, Углеводы ${carbs}г, Ккал ${kcal}`
}
