const RESPONSES = {
  grocery: {
    cook: [
      (p) =>
        `Из ${p.name.split('«')[0].trim()} можно приготовить овощной смузи с бананом и ягодами — быстро и питательно. Второй вариант: используйте как основу для заправки к салату с авокадо.`,
      (p) =>
        `С этим продуктом хорошо сочетаются овощи на пару или зерновые. Попробуйте добавить в утреннюю кашу или сделать лёгкий соус для пасты.`,
    ],
    why: [
      (p, profile) =>
        `${p.name.split(' ')[0]} подходит под ваш профиль: ${
          profile.halalOnly ? 'халал ✓, ' : ''
        }${
          profile.allergens?.length > 0 && p.allergens.length === 0
            ? 'без ваших аллергенов ✓, '
            : ''
        }рейтинг качества ${p.qualityScore}/100. Хороший баланс цены и состава.`,
      (p) =>
        `Этот продукт выделяется среди аналогов: чистый состав, минимум добавок. Рейтинг ${p.qualityScore}/100 подтверждает — качество выше среднего по полке.`,
    ],
    compare: [
      (p) =>
        `По сравнению с обычным аналогом: этот вариант содержит меньше искусственных добавок и лучше подходит под ваши ограничения. Немного дороже, но оправдано составом.`,
      (p) =>
        `Главное отличие: состав проще, меньше консервантов. Если важна цена — оба варианта рабочие. Если качество — этот выигрывает по рейтингу.`,
    ],
  },
  electronics: {
    cook: [
      (p) =>
        `Для этого устройства ключевые параметры: ${
          Object.entries(p.specs || {})
            .slice(0, 2)
            .map(([k, v]) => `${v}`)
            .join(', ')
        }. Проверьте совместимость с вашим устройством по разъёму и мощности.`,
    ],
    why: [
      (p) =>
        `Рейтинг ${p.qualityScore}/100 — ${
          p.qualityScore >= 80 ? 'надёжная' : 'базовая'
        } модель. ${
          p.qualityScore >= 80
            ? 'Отличный выбор для регулярного использования.'
            : 'Подойдёт для нечастого применения или как резервный вариант.'
        }`,
    ],
    compare: [
      (p) =>
        `Основное отличие от дешёвых аналогов — качество кабеля и надёжность разъёма. За такую цену получаете долговечность и стабильную зарядку без перегрева.`,
    ],
  },
  diy: {
    cook: [
      (p) =>
        `Расход: примерно ${p.specs?.coverage || '10м²/л'}. На комнату 20м² хватит 1–2 банки по 5л в зависимости от числа слоёв. Не забудьте про грунтовку — сократит расход на 20%.`,
    ],
    why: [
      (p) =>
        `Рейтинг ${p.qualityScore}/100. ${
          p.specs?.moisture === 'Есть'
            ? 'Влагостойкий состав — идеально для ванной и кухни.'
            : 'Для сухих помещений — оптимальный выбор.'
        } Время высыхания: ${p.specs?.dryTime || '2–4ч'}.`,
    ],
    compare: [
      (p) =>
        `Разница с бюджетным вариантом: покрытие лучше (меньше слоёв), срок службы дольше на 2–3 года. Переплата 2–3× окупается за счёт экономии на ремонте.`,
    ],
  },
}

const FALLBACK = [
  () => `Этот товар хорошо подходит под ваш профиль. Состав соответствует вашим ограничениям, качество выше среднего по категории.`,
  () => `Рекомендую взять — соотношение цены и качества оправдано. Если нужен альтернативный вариант, посмотрите похожие товары на соседней полке.`,
]

let counter = 0

export function getMockAIResponse(product, questionType, customQuestion) {
  const cat = product?.category || 'grocery'
  const catResponses = RESPONSES[cat] || RESPONSES.grocery

  let respFns
  if (questionType === 'cook') respFns = catResponses.cook || FALLBACK
  else if (questionType === 'why') respFns = catResponses.why || FALLBACK
  else if (questionType === 'compare') respFns = catResponses.compare || FALLBACK
  else {
    // Custom question — try to guess intent
    const q = (customQuestion || '').toLowerCase()
    if (q.includes('пригот') || q.includes('рецепт')) respFns = catResponses.cook || FALLBACK
    else if (q.includes('лучш') || q.includes('почем')) respFns = catResponses.why || FALLBACK
    else if (q.includes('сравн') || q.includes('разниц')) respFns = catResponses.compare || FALLBACK
    else respFns = FALLBACK
  }

  const fn = respFns[counter % respFns.length]
  counter++

  // profile might not be passed in for custom questions — handle gracefully
  try {
    return fn(product, {})
  } catch {
    return FALLBACK[0](product, {})
  }
}
