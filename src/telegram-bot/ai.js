const OPENAI_API = 'https://api.openai.com/v1/chat/completions'
const API_KEY = process.env.OPENAI_API_KEY || ''
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
const MAX_TOKENS = 260
const TIMEOUT_MS = 8000

const SUPPORT_INSTRUCTIONS_RU = `Ты — дружелюбный консультант поддержки приложения Körset.

Körset — это mobile-first PWA для офлайн-продуктовых магазинов Казахстана.
Покупатель сканирует штрихкод товара и получает Fit-Check: подходит ли товар под его аллергии, диеты, халяль-статус.

КЛЮЧЕВЫЕ ПРАВИЛА:
1. Отвечай кратко (2-4 предложения), дружелюбно, без markdown-форматирования.
2. Не выдумывай сертификаты халяля, медицинские факты или юридическую информацию.
3. Если вопрос не по теме Körset — вежливо объясни, что это не входит в компетенцию поддержки, и предложи обратиться к оператору.
4. Если не уверен в ответе — предложи связаться с оператором.
5. Не используй **жирный**, *курсив*, заголовки, списки. Простой текст.
6. Если вопрос относится к работе приложения, сканированию, профилю — ответь на основе FAQ ниже.
7. Если пользователь спрашивает про конкретный товар/состав/EAN — объясни, как это проверить в приложении, но не анализируй состав сам.
8. В конце каждого ответа добавляй фразу "Чем ещё могу помочь?" — это сигнал, что AI закончил.

ВОПРОСЫ НЕ ПО ТЕМЕ (направляй к оператору):
- Юридические вопросы
- Медицинские консультации
- Жалобы на конкретные магазины/персонал
- Вопросы о партнёрстве/рекламе
- Технические проблемы, выходящие за рамки FAQ`

const SUPPORT_INSTRUCTIONS_KZ = `Сен — Körset қосымшасының достық қолдау консультантысың.

Körset — бұл Қазақстанның офлайн азық-түлік дүкендеріне арналған mobile-first PWA.
Сатып алушы тауардың штрихкодын сканерлейді және Fit-Check алады: тауар оның аллергиясына, диетасына, халяль мәртебесіне сәйкес келе ме.

НЕГІЗГІ ЕРЕЖЕЛЕР:
1. Қысқа (2-4 сөйлем), достық, markdownсыз жауап бер.
2. Халяль сертификаттарын, медициналық фактілерді немесе заңгерлік ақпаратты ойлап шығарма.
3. Егер сұрақ Körset тақырыбына қатысты болмаса — бұл қолдау құзыретінде емес екенін түсіндіріп, операторға хабарласуды ұсын.
4. Жауапқа сенімді болмасаң — операторға хабарласуды ұсын.
5. **қара**, *курсив*, тақырыпшалар, тізімдерді қолданба. Қарапайым мәтін.
6. Сұрақ қосымша жұмысына, сканерлеуге, профильге қатысты болса — FAQ негізінде жауап бер.
7. Пайдаланушы нақты тауар/құрам/EAN туралы сұраса — оны қосымшада қалай тексеруге болатынын түсіндір, бірақ құрамды өзің талдама.
8. Әр жауаптың соңына "Тағы немен көмектесе аламын?" дегенді қос.

ТАҚЫРЫПҚА ҚАТЫСТЫ ЕМЕС СҰРАҚТАР (операторға жібер):
- Заңгерлік сұрақтар
- Медициналық кеңестер
- Нақты дүкендер/қызметкерлер туралы шағымдар
- Серіктестік/жарнама туралы сұрақтар
- FAQ ауқымынан тыс техникалық мәселелер`

function buildFAQContext(lang, faqItems) {
  const items = faqItems || []
  if (items.length === 0) return ''
  return items.map((item, i) => `${i + 1}. В: ${item.q}\n   О: ${item.a}`).join('\n\n')
}

export async function getAIResponse(question, lang, faqItems) {
  if (!API_KEY || !question) {
    return { text: null, needsOperator: true, category: 'unknown' }
  }

  const isKZ = lang === 'kz'
  const instructions = isKZ ? SUPPORT_INSTRUCTIONS_KZ : SUPPORT_INSTRUCTIONS_RU
  const faqBlock = buildFAQContext(lang, faqItems)

  const systemPrompt = `${instructions}\n\nСПРАВОЧНАЯ ИНФОРМАЦИЯ (FAQ):\n${faqBlock || 'Нет доступных FAQ.'}\n\nВАЖНО: Используй FAQ только как справочную информацию. Если вопрос не покрыт FAQ — отвечай на основе общих знаний о Körset. Если не уверен — предложи оператора.`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const openAiBaseUrl = process.env.OPENAI_API_BASE_URL
    const base = openAiBaseUrl || 'https://api.openai.com/v1'
    const fetchUrl = `${base.replace(/\/+$/, '')}/chat/completions`
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    }
    if (fetchUrl.includes('.azure.com') || fetchUrl.includes('.services.ai.azure.com')) {
      headers['api-key'] = API_KEY
    }

    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: MODEL,
        max_completion_tokens: MAX_TOKENS,
        temperature: 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text()
      console.error('[ai] OpenAI error:', res.status, errText)
      return { text: null, needsOperator: true, category: 'error' }
    }

    const data = await res.json()
    const reply = data?.choices?.[0]?.message?.content?.trim() || ''

    if (!reply) {
      return { text: null, needsOperator: true, category: 'empty' }
    }

    const needsOperator = detectNeedsOperator(reply, isKZ)
    const category = classifyQuestion(question, isKZ)

    return { text: reply, needsOperator, category }
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      console.error('[ai] OpenAI timeout')
      return { text: null, needsOperator: true, category: 'timeout' }
    }
    console.error('[ai] fetch error:', err.message)
    return { text: null, needsOperator: true, category: 'error' }
  }
}

function detectNeedsOperator(reply, isKZ) {
  const lower = reply.toLowerCase()
  const signals = isKZ
    ? ['оператор', 'операторға', 'операторға жібер', 'қолдау қызметіне хабарлас']
    : [
        'оператор',
        'передам оператору',
        'свяжитесь с оператором',
        'обратитесь к оператору',
        'не входит в компетенцию',
      ]
  return signals.some((s) => lower.includes(s))
}

function classifyQuestion(text, isKZ) {
  const lower = text.toLowerCase()
  if (isKZ) {
    if (lower.includes('халяль') || lower.includes('аллергия') || lower.includes('диет'))
      return 'product'
    if (lower.includes('сканер') || lower.includes('тауар') || lower.includes('сканир'))
      return 'technical'
    if (lower.includes('дүкен') || lower.includes('магазин') || lower.includes('тіркелу'))
      return 'store'
    return 'other'
  }
  if (lower.includes('халяль') || lower.includes('аллерги') || lower.includes('диет'))
    return 'product'
  if (
    lower.includes('сканер') ||
    lower.includes('товар') ||
    lower.includes('штрихкод') ||
    lower.includes('ean')
  )
    return 'technical'
  if (lower.includes('магазин') || lower.includes('регистраци') || lower.includes('добав'))
    return 'store'
  return 'other'
}
