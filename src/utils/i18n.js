import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'korset_lang'
const DEFAULT_LANG = 'ru'

const translations = {
  ru: {
    common: {
      appName: 'Körset',
      loading: 'Загрузка...',
      continue: 'Продолжить',
      skip: 'Пропустить',
      back: 'Назад',
      scanAgain: 'Сканировать ещё раз',
      notFound: 'Товар не найден',
      unknown: 'Неизвестно',
      yes: 'Да',
      no: 'Нет',
      all: 'Все',
      forYou: 'Для вас',
      online: 'Онлайн',
      add: 'Добавить',
      reset: 'Сбросить',
      save: 'Сохранить',
      start: 'Начать',
      close: 'Закрыть',
      demo: 'демо',
      noData: 'Данные появятся позже',
      language: 'Язык',
      russian: 'Русский',
      kazakh: 'Қазақша',
    },
    nav: { home: 'Главная', catalog: 'Каталог', scan: 'Скан', ai: 'ИИ', profile: 'Профиль' },
    home: {
      welcome: 'Добро пожаловать',
      subtitle: 'Сканируй товары и узнай — подходят ли они именно тебе',
      scanTitle: 'Сканировать штрихкод',
      scanSub: 'Наведи на любой товар в магазине',
    },
    onboarding: {
      title1: 'Выберите язык',
      subtitle1: 'Интерфейс можно будет изменить позже в профиле.',
      title2a: 'Этот товар тебе',
      title2b: 'подходит?',
      subtitle2: 'Скажи что важно — и Körset будет проверять каждый товар за тебя.',
      startScanning: 'Начать сканировать →',
      continueWithoutSetup: 'Продолжить без настройки',
      halalLabel: 'Халал',
      halalSub: 'Только разрешённые продукты',
      milkLabel: 'Без молока',
      milkSub: 'Аллергия или непереносимость',
      glutenLabel: 'Без глютена',
      glutenSub: 'Целиакия или диета',
      nutsLabel: 'Без орехов',
      nutsSub: 'Аллергия на орехи / арахис',
      sugarLabel: 'Без сахара',
      sugarSub: 'Диабет, диета или ЗОЖ',
      veganLabel: 'Веган',
      veganSub: 'Без мяса, молока и яиц',
    },
    profile: {
      hero: 'Настройте профиль — AI мгновенно покажет подходит ли товар вам',
      religious: 'Религиозные требования',
      halalOnly: 'Только Халал',
      halalOnlySub: 'Исключит товары без маркировки',
      dietPrefs: 'Диета и предпочтения',
      dietHint: 'Нажмите всё что подходит',
      allergens: 'Мои аллергены',
      allergensHint: 'Товары с этим составом будут помечены ⚠️',
      customHint: 'Не нашли? Введите вручную',
      customPlaceholder: 'Клубника, кунжут...',
      priority: 'Приоритет выбора',
      activeFilters: 'Активных фильтров: {{count}}',
      showProducts: 'Показать подходящие товары',
      scanQr: 'Сканировать QR-код',
      prefsLanguage: 'Язык интерфейса',
    },
    catalog: {
      title: 'Каталог',
      itemsInBase: '{{count}} товаров в базе',
      searchPlaceholder: 'Поиск продуктов...',
      nothingFound: 'Ничего не найдено',
      sortFit: 'Подходящие мне',
      sortCheap: 'Сначала дешевле',
      sortPricey: 'Сначала дороже',
      sortRating: 'По рейтингу',
      catAll: 'Все',
      catFit: 'Для вас',
      catGrocery: 'Продукты',
      catElectronics: 'Электроника',
      catDiy: 'Стройка',
    },
    scan: {
      title: 'Сканер',
      startScan: 'Сканировать штрихкод',
      aimAny: 'Наведите на любой товар в магазине',
      howWorks: 'Как это работает',
      step1: 'Наведите камеру на штрихкод любого товара',
      step2: 'Körset найдёт состав, аллергены и КБЖУ',
      step3: 'AI проверит подходит ли товар именно вам',
      dbTitle: '3+ млн товаров в базе',
      dbSub: 'Open Food Facts · Обновляется автоматически',
      finding: 'Ищем товар...',
      checkingDb: 'Проверяем базу данных',
      cameraBack: '← Назад',
      torchUnavailable: '⚠️ Фонарик недоступен в этом браузере',
      aimBarcode: 'Наведите на штрихкод товара',
      supportedFormats: 'Поддерживаются все форматы штрихкодов',
      notFoundBody: 'Штрихкод {{ean}} не найден в базе данных',
      cameraNotFound: 'Камера не обнаружена',
    },
    product: {
      cardTitle: 'Карточка товара',
      manufacturerMissing: 'Производитель не указан',
      specs: 'Характеристики',
      nutrition: 'КБЖУ ({{base}})',
      base100: 'на 100 г',
      params: 'Основные параметры',
      proteins: 'Белки', fats: 'Жиры', carbs: 'Углеводы', kcal: 'Ккал',
      extraWillAppear: 'Характеристики будут добавлены',
      more: 'Дополнительно', hide: 'Скрыть',
      ingredients: 'Состав', storage: 'Условия хранения', expiry: 'Срок хранения', extraSpecs: 'Доп. характеристики',
      fits: 'Подходит вам', notFits: 'Не подходит',
      fitsSub: 'Соответствует вашему профилю', notFitsSub: 'Есть ограничения по вашему профилю',
      alternatives: 'Альтернативы', askAi: '✦ Спросить AI',
      photoLater: 'Фото добавим позже',
      goods: 'Товары', shelf: 'Полка',
      volume: 'Объём', weight: 'Вес', fat: 'Жирность', sugar: 'Сахар', calories: 'Калории', length: 'Длина', maxPower: 'Мощность', standard: 'Стандарт', power: 'Мощность', type: 'Тип', anc: 'Шумоподавление', battery: 'Батарея', waterproof: 'Защита', coverage: 'Расход', dryTime: 'Сохнет', moisture: 'Влагостойкость', brand: 'Бренд', model: 'Модель', material: 'Материал', size: 'Размер',
    },
    external: {
      searchDb: 'Ищу товар в базе данных...',
      notFoundBody: 'Этот штрихкод не найден в нашем каталоге и в мировой базе Open Food Facts.',
      noConnection: 'Нет подключения к интернету или сервер временно недоступен.',
      askAi: 'Спросить AI',
      dataSource: 'Данные: Open Food Facts · EAN: {{ean}}',
      halalUnknown: 'Халал-статус неизвестен — уточните по упаковке',
      notHalal: 'Не является халал',
      containsAllergen: 'Содержит аллерген: {{name}}',
      containsCustom: 'Содержит: {{name}}',
      containsSugar: 'Содержит сахар',
      containsDairy: 'Содержит молочные продукты',
      containsGluten: 'Содержит глютен',
      notVegan: 'Не подходит для веганов',
      halalOk: 'Подтверждено как халал ✓',
      allergensOk: 'Не содержит ваших аллергенов ✓',
      prefsOk: 'Соответствует вашим предпочтениям',
      milk: 'Молоко', gluten: 'Глютен', nuts: 'Орехи', peanuts: 'Арахис', soy: 'Соя', eggs: 'Яйца', fish: 'Рыба', shellfish: 'Моллюски', sesame: 'Кунжут', celery: 'Сельдерей', mustard: 'Горчица',
    },
    ai: {
      helperStore: 'Помощник в магазине',
      helloGeneral: 'Привет! Спроси меня про любой товар, рецепт или что найти в магазине 🛒',
      helloProduct: 'Привет! Спроси меня про этот товар. Я объясню состав, подскажу альтернативу и скажу, подходит ли он тебе.',
      retry: 'Попробуй ещё раз.',
      somethingWrong: 'Что-то пошло не так, попробуй ещё раз.',
      askProducts: 'Спросить про товары...',
      askProductOrRecipe: 'Спросить о товаре или рецепте...',
      qHalal: 'Есть ли халал продукты?',
      qLactose: 'Что без лактозы?',
      qNuts: 'Где найти орехи?',
      qRatatouille: 'Что для рататуя?',
      qCook: 'Что приготовить?',
      qHalalGoods: 'Халал товары',
      qGlutenFree: 'Без глютена',
      qUnder500: 'Дешевле 500₸',
    },
    alternatives: {
      title: 'Альтернативы',
      original: 'Исходный товар',
      betterOptions: 'Подходящие альтернативы',
      noAlternatives: 'Подходящих альтернатив пока не нашли',
    },
  },
  kz: {
    common: {
      appName: 'Körset', loading: 'Жүктелуде...', continue: 'Жалғастыру', skip: 'Өткізу', back: 'Артқа', scanAgain: 'Қайта сканерлеу', notFound: 'Тауар табылмады', unknown: 'Белгісіз', yes: 'Иә', no: 'Жоқ', all: 'Барлығы', forYou: 'Сізге', online: 'Онлайн', add: 'Қосу', reset: 'Тазарту', save: 'Сақтау', start: 'Бастау', close: 'Жабу', demo: 'демо', noData: 'Дерек кейін қосылады', language: 'Тіл', russian: 'Русский', kazakh: 'Қазақша',
    },
    nav: { home: 'Басты', catalog: 'Каталог', scan: 'Скан', ai: 'ИИ', profile: 'Профиль' },
    home: { welcome: 'Қош келдіңіз', subtitle: 'Тауарды сканерлеп, оның сізге сай екенін бірден біліңіз', scanTitle: 'Штрихкодты сканерлеу', scanSub: 'Дүкендегі кез келген тауарға камераны бағыттаңыз' },
    onboarding: {
      title1: 'Тілді таңдаңыз', subtitle1: 'Кейін профильде өзгертуге болады.', title2a: 'Бұл тауар саған', title2b: 'сәйкес пе?', subtitle2: 'Өзіңе маңыздысын таңда — Körset әр тауарды сен үшін тексереді.', startScanning: 'Сканерлеуді бастау →', continueWithoutSetup: 'Баптаусыз жалғастыру', halalLabel: 'Халал', halalSub: 'Тек рұқсат етілген өнімдер', milkLabel: 'Сүтсіз', milkSub: 'Аллергия немесе көтере алмау', glutenLabel: 'Глютенсіз', glutenSub: 'Целиакия немесе диета', nutsLabel: 'Жаңғақсыз', nutsSub: 'Жаңғақ / жержаңғақ аллергиясы', sugarLabel: 'Қантсыз', sugarSub: 'Диабет, диета немесе салауатты өмір', veganLabel: 'Веган', veganSub: 'Етсіз, сүтсіз және жұмыртқасыз',
    },
    profile: {
      hero: 'Профильді баптаңыз — AI тауардың сізге сай екенін бірден көрсетеді', religious: 'Діни талаптар', halalOnly: 'Тек халал', halalOnlySub: 'Таңбасы жоқ тауарларды алып тастайды', dietPrefs: 'Диета және таңдаулар', dietHint: 'Сізге керегінің бәрін таңдаңыз', allergens: 'Менің аллергендерім', allergensHint: 'Осындай құрамы бар тауарлар ⚠️ деп белгіленеді', customHint: 'Тізімде жоқ па? Қолмен енгізіңіз', customPlaceholder: 'Құлпынай, күнжіт...', priority: 'Таңдау басымдығы', activeFilters: 'Белсенді сүзгілер: {{count}}', showProducts: 'Сәйкес тауарларды көрсету', scanQr: 'QR-кодты сканерлеу', prefsLanguage: 'Интерфейс тілі',
    },
    catalog: { title: 'Каталог', itemsInBase: 'Базада {{count}} тауар', searchPlaceholder: 'Өнімдерді іздеу...', nothingFound: 'Ештеңе табылмады', sortFit: 'Маған сайлары', sortCheap: 'Алдымен арзаны', sortPricey: 'Алдымен қымбаты', sortRating: 'Рейтинг бойынша', catAll: 'Барлығы', catFit: 'Сізге', catGrocery: 'Өнімдер', catElectronics: 'Электроника', catDiy: 'Құрылыс' },
    scan: { title: 'Сканер', startScan: 'Штрихкодты сканерлеу', aimAny: 'Дүкендегі кез келген тауарға бағыттаңыз', howWorks: 'Қалай жұмыс істейді', step1: 'Камераны кез келген тауардың штрихкодысына бағыттаңыз', step2: 'Körset құрамын, аллергендерді және КБЖУ табады', step3: 'AI тауардың дәл сізге сай екенін тексереді', dbTitle: 'Базада 3+ млн тауар', dbSub: 'Open Food Facts · Автоматты жаңарады', finding: 'Тауар ізделуде...', checkingDb: 'Дерекқор тексерілуде', cameraBack: '← Артқа', torchUnavailable: '⚠️ Бұл браузерде фонарь қолжетімсіз', aimBarcode: 'Штрихкодқа бағыттаңыз', supportedFormats: 'Штрихкодтың барлық форматтары қолдайды', notFoundBody: '{{ean}} штрихкоды дерекқордан табылмады', cameraNotFound: 'Камера табылмады' },
    product: { cardTitle: 'Тауар картасы', manufacturerMissing: 'Өндіруші көрсетілмеген', specs: 'Сипаттамалар', nutrition: 'КБЖУ ({{base}})', base100: '100 г үшін', params: 'Негізгі параметрлер', proteins: 'Ақуыз', fats: 'Май', carbs: 'Көмірсу', kcal: 'Ккал', extraWillAppear: 'Сипаттамалар кейін қосылады', more: 'Қосымша', hide: 'Жасыру', ingredients: 'Құрамы', storage: 'Сақтау шарттары', expiry: 'Сақтау мерзімі', extraSpecs: 'Қосымша сипаттамалар', fits: 'Сізге сай', notFits: 'Сізге сай емес', fitsSub: 'Профиліңізге сәйкес келеді', notFitsSub: 'Профиліңіз бойынша шектеулер бар', alternatives: 'Балама нұсқалар', askAi: '✦ ИИ-ден сұрау', photoLater: 'Фото кейін қосылады', goods: 'Тауарлар', shelf: 'Сөре', volume: 'Көлемі', weight: 'Салмағы', fat: 'Майлылығы', sugar: 'Қант', calories: 'Калория', length: 'Ұзындығы', maxPower: 'Қуаты', standard: 'Стандарт', power: 'Қуат', type: 'Түрі', anc: 'Шуды басу', battery: 'Батарея', waterproof: 'Қорғаныс', coverage: 'Шығыны', dryTime: 'Кебуі', moisture: 'Ылғалға төзімді', brand: 'Бренд', model: 'Модель', material: 'Материал', size: 'Өлшем' },
    external: { searchDb: 'Тауар дерекқордан ізделуде...', notFoundBody: 'Бұл штрихкод біздің каталогтан да, Open Food Facts базасынан да табылмады.', noConnection: 'Интернетке қосылу жоқ немесе сервер уақытша қолжетімсіз.', askAi: 'ИИ-ден сұрау', dataSource: 'Дерек: Open Food Facts · EAN: {{ean}}', halalUnknown: 'Халал мәртебесі белгісіз — қаптамадан нақтылаңыз', notHalal: 'Халал емес', containsAllergen: 'Аллерген бар: {{name}}', containsCustom: 'Құрамында бар: {{name}}', containsSugar: 'Құрамында қант бар', containsDairy: 'Құрамында сүт өнімдері бар', containsGluten: 'Құрамында глютен бар', notVegan: 'Вегандарға жарамайды', halalOk: 'Халал екені расталды ✓', allergensOk: 'Сіздің аллергендеріңіз жоқ ✓', prefsOk: 'Сіздің қалауыңызға сәйкес', milk: 'Сүт', gluten: 'Глютен', nuts: 'Жаңғақ', peanuts: 'Жержаңғақ', soy: 'Соя', eggs: 'Жұмыртқа', fish: 'Балық', shellfish: 'Теңіз өнімдері', sesame: 'Күнжіт', celery: 'Балдыркөк', mustard: 'Қыша' },
    ai: { helperStore: 'Дүкендегі көмекші', helloGeneral: 'Сәлем! Кез келген тауар, рецепт немесе дүкеннен не табу туралы сұраңыз 🛒', helloProduct: 'Сәлем! Осы тауар туралы сұраңыз. Құрамын түсіндіріп, балама ұсынамын және сізге сай ма соны айтамын.', retry: 'Қайта көріңіз.', somethingWrong: 'Бір нәрсе дұрыс болмады, қайта көріңіз.', askProducts: 'Тауар туралы сұрау...', askProductOrRecipe: 'Тауар немесе рецепт туралы сұраңыз...', qHalal: 'Халал өнімдер бар ма?', qLactose: 'Лактозасыз не бар?', qNuts: 'Жаңғақ қайда?', qRatatouille: 'Рататуйға не керек?', qCook: 'Не пісіруге болады?', qHalalGoods: 'Халал тауарлар', qGlutenFree: 'Глютенсіз', qUnder500: '500₸-ден арзан' },
    alternatives: { title: 'Балама нұсқалар', original: 'Бастапқы тауар', betterOptions: 'Сәйкес баламалар', noAlternatives: 'Сәйкес баламалар әлі табылмады' },
  },
}

function resolve(obj, path) { return path.split('.').reduce((acc, key) => acc?.[key], obj) }
function interpolate(str, vars = {}) { return String(str).replace(/\{\{(.*?)\}\}/g, (_, key) => vars[key.trim()] ?? '') }

export function getLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG
}

export function setLang(lang) {
  localStorage.setItem(STORAGE_KEY, lang)
  window.dispatchEvent(new CustomEvent('korset-lang-changed', { detail: lang }))
}

export function translate(key, vars = {}, lang = getLang()) {
  const value = resolve(translations[lang] || translations[DEFAULT_LANG], key) ?? resolve(translations[DEFAULT_LANG], key) ?? key
  return typeof value === 'string' ? interpolate(value, vars) : value
}

export function useI18n() {
  const [lang, setLangState] = useState(getLang())
  useEffect(() => {
    const handler = (e) => setLangState(e.detail || getLang())
    window.addEventListener('korset-lang-changed', handler)
    return () => window.removeEventListener('korset-lang-changed', handler)
  }, [])
  const api = useMemo(() => ({
    lang,
    setLang: (next) => { setLang(next); setLangState(next) },
    t: (key, vars) => translate(key, vars, lang),
  }), [lang])
  return api
}

export function formatDateLocalized(date = new Date(), lang = getLang()) {
  return new Intl.DateTimeFormat(lang === 'kz' ? 'kk-KZ' : 'ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

export const languageOptions = [
  { id: 'ru', labelKey: 'common.russian' },
  { id: 'kz', labelKey: 'common.kazakh' },
]
