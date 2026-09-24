/**
 * Attribute Parser & Category Classifier for Körset Catalog V3
 * Extracts physical attributes and categorizes products into the 18 official Korset categories.
 */

export const KORSET_CATEGORIES = [
  'dairy_eggs', 'meat', 'deli', 'fish', 'water_beverages', 'tea_coffee',
  'sweets', 'snacks', 'grocery', 'sauces_spices', 'bread', 'frozen',
  'fruits_veg', 'baby_food', 'ready_meals', 'healthy', 'personal_care', 'household'
];

export function inferCategory(name, brand, tnved, existingCategory) {
  if (existingCategory && KORSET_CATEGORIES.includes(existingCategory) && existingCategory !== 'grocery') {
    return existingCategory;
  }

  const tn = String(tnved || '').trim();
  if (tn.startsWith('0401') || tn.startsWith('0402') || tn.startsWith('0403') || tn.startsWith('0405') || tn.startsWith('0406') || tn.startsWith('0407')) {
    return 'dairy_eggs';
  }
  if (tn.startsWith('0201') || tn.startsWith('0202') || tn.startsWith('0203') || tn.startsWith('0204') || tn.startsWith('0207')) {
    return 'meat';
  }
  if (tn.startsWith('1601') || tn.startsWith('1602')) {
    return 'deli';
  }
  if (tn.startsWith('0302') || tn.startsWith('0303') || tn.startsWith('0304') || tn.startsWith('0305') || tn.startsWith('0306') || tn.startsWith('1604') || tn.startsWith('1605')) {
    return 'fish';
  }
  if (tn.startsWith('1806') || tn.startsWith('1704')) {
    return 'sweets';
  }
  if (tn.startsWith('2201') || tn.startsWith('2202') || tn.startsWith('2009')) {
    return 'water_beverages';
  }
  if (tn.startsWith('0901') || tn.startsWith('0902')) {
    return 'tea_coffee';
  }
  if (tn.startsWith('1902') || tn.startsWith('1006') || tn.startsWith('1101') || tn.startsWith('1102') || tn.startsWith('1103') || tn.startsWith('1104')) {
    return 'grocery';
  }
  if (tn.startsWith('2103')) {
    return 'sauces_spices';
  }
  if (tn.startsWith('2105')) {
    return 'frozen';
  }
  if (tn.startsWith('1904')) {
    return 'snacks';
  }
  if (tn.startsWith('3305') || tn.startsWith('3306') || tn.startsWith('3307')) {
    return 'personal_care';
  }
  if (tn.startsWith('3401') || tn.startsWith('3402')) {
    return 'household';
  }

  const text = `${name || ''} ${brand || ''}`.toLowerCase();

  // Dairy & Eggs
  if (/молок|кефир|творог|сметан|сыр\b|сырок|йогурт|ряженк|сливк|айран|кумыс|шубат|брынз|сулугун|масло сливочн|снежок|простокваш|сыр плавлен|яйц|гауда|тильзитер|пармезан|моцарелла/.test(text)) {
    return 'dairy_eggs';
  }

  // Deli
  if (/колбас|сосиск|сардельк|ветчин|карбонад|буженин|паштет|бекон|грудинк|шпик|сервелат|салями|балык\b|рулет мясной/.test(text)) {
    return 'deli';
  }

  // Meat & Poultry
  if (/говядин|свинин|баранин|фарш\b|цыпленок|куриц|индейк|окорочк|крылышк|филе цыпл|стейк|суповой набор|мясо птиц|мясо кур|утка\b|гусь\b/.test(text)) {
    return 'meat';
  }

  // Fish & Seafood
  if (/рыб|тунец|лосос|сельдь|семг|форел|минтай|крабов|креветк|кальмар|икр|горбуш|скумбри|шпрот|сардин|сайр|треск|хек\b|камбал/.test(text)) {
    return 'fish';
  }

  // Bread & Bakery
  if (/хлеб|батон\b|булочк|лаваш|лепешк|круассан|тост\b|пита\b|сдоб|бублик|баранк|сухар|хлебцы|багет|чиабатта/.test(text)) {
    return 'bread';
  }

  // Sweets & Confectionery
  if (/шоколад|конфет|печень|вафл|пряник|зефир|мармелад|халв|торт|пирожн|пастил|карамел|драже|леден|батончик|нутелла|nutella|рахат|баян сулу|alpen gold|milka|snickers|twix|kinder|ferrero|raffaello|kitkat|mars\b|bounty/.test(text)) {
    return 'sweets';
  }

  // Snacks & Nuts
  if (/чипс|сухарик|снек|попкорн|начос|арахис|фисташк|миндал|кешью|семечк|хрустим|lays|doritos|cheetos|pringles/.test(text)) {
    return 'snacks';
  }

  // Water & Beverages
  if (/напит|сок\b|нектар|вод[аы]\b|морс|компот|лимонад|квас|cola|кола|pepsi|пепси|fanta|фанта|sprite|спрайт|минеральн|tassay|borjomi|боржоми|gracio|dada|asar\b|samal|сарыагаш/.test(text)) {
    return 'water_beverages';
  }

  // Tea & Coffee
  if (/чай\b|кофе\b|какао|цикори|tess|greenfield|curtis|jacobs|nescafe|maccoffee|пиала|ассам|шах\b/.test(text)) {
    return 'tea_coffee';
  }

  // Sauces & Spices
  if (/кетчуп|майонез|соус|горчиц|аджик|томатная паста|уксус|специ|приправ|перец молот|соль\b|хрен\b|махеев|слобода|calve|heinz|магги|gallina/.test(text)) {
    return 'sauces_spices';
  }

  // Frozen & Ice Cream
  if (/пельмен|вареник|манты|хинкал|морожен|заморожен|п\/ф|наггетс|тесто слоен|чебурек|котлет замор|эскимо|пломбир/.test(text)) {
    return 'frozen';
  }

  // Fruits & Vegetables
  if (/яблок|банан|апельсин|мандарин|лимон\b|томат|помидор|огурец|картофел|морков|лук репч|чеснок|капуст|зелень|укроп|петрушк|виноград|груш|ягод|грибы свеж|шампиньон/.test(text)) {
    return 'fruits_veg';
  }

  // Baby Food
  if (/детск|пюре дет|каша дет|фрутонян|агуш|тема\b|gerber|hipp|смесь молочн|nan\b|nutrilon|нестле каш/.test(text)) {
    return 'baby_food';
  }

  // Ready Meals
  if (/салат готовый|сендвич|бутерброд|онигири|ланч|кулинария|суп готовый/.test(text)) {
    return 'ready_meals';
  }

  // Healthy & Diet
  if (/протеин|без сахара|без глютена|стевия|гранола|мюсли|семена чиа|правильное питание|экопродукт/.test(text)) {
    return 'healthy';
  }

  // Personal Care
  if (/мыло|шампун|гель для душ|зубная паст|зубная щетк|дезодорант|прокладк|ватные диск|крем для|бальзам для волос|пена для бритья/.test(text)) {
    return 'personal_care';
  }

  // Household
  if (/порошок стирал|кондиционер для бел|моющее|чистящее|губк|салфетк|туалетная бумага|пакеты для мусор|фольга|пергамент|освежитель воздух|средство для мытья/.test(text)) {
    return 'household';
  }

  // Grocery (grains, pasta, flour, sugar, oil)
  if (/макарон|спагетти|рис\b|гречк|мук[аы]\b|сахар\b|круп|хлопь|овсянк|горох\b|фасол|масло подсолнечн|масло растительн|кублей|тушенка|консерв/.test(text)) {
    return 'grocery';
  }

  return existingCategory && KORSET_CATEGORIES.includes(existingCategory) ? existingCategory : 'grocery';
}

export function extractFatPercent(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (m) {
    const val = parseFloat(m[1].replace(',', '.'));
    if (val >= 0.1 && val <= 100) return val;
  }
  return null;
}

export function extractQuantity(str) {
  if (!str) return { display: null, value: null, unit: null };
  const s = String(str).trim();
  const m = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(г|g|кг|kg|мл|ml|л|l|шт|pcs)\b/i);
  if (!m) return { display: null, value: null, unit: null };

  let val = parseFloat(m[1].replace(',', '.'));
  let rawUnit = m[2].toLowerCase();
  let unit = 'g';
  let display = `${val} ${rawUnit}`;

  if (rawUnit === 'кг' || rawUnit === 'kg') {
    val = Math.round(val * 1000);
    unit = 'g';
    display = `${m[1]} кг`;
  } else if (rawUnit === 'г' || rawUnit === 'g') {
    unit = 'g';
    display = `${val} г`;
  } else if (rawUnit === 'л' || rawUnit === 'l') {
    val = Math.round(val * 1000);
    unit = 'ml';
    display = `${m[1]} л`;
  } else if (rawUnit === 'мл' || rawUnit === 'ml') {
    unit = 'ml';
    display = `${val} мл`;
  } else if (rawUnit === 'шт' || rawUnit === 'pcs') {
    unit = 'pcs';
    display = `${val} шт`;
  }

  return { display, value: val, unit };
}

export function extractPackageType(str) {
  if (!str) return null;
  const text = String(str).toLowerCase();
  if (/бутылк|пэт\b|пет\b/.test(text)) return 'бутылка';
  if (/дой-пак|дойпак/.test(text)) return 'дой-пак';
  if (/тетра-пак|тетрапак/.test(text)) return 'тетра-пак';
  if (/стакан|стаканчик/.test(text)) return 'стакан';
  if (/пакет|флоу-пак|флоупак/.test(text)) return 'пакет';
  if (/коробк|картон/.test(text)) return 'коробка';
  if (/банк[аеи]|жест/.test(text)) return 'банка';
  if (/туб[аы]|тюбик/.test(text)) return 'туба';
  if (/лоток|подложк/.test(text)) return 'лоток';
  if (/вакуум/.test(text)) return 'вакуумная упаковка';
  return null;
}

export function extractFlavor(str) {
  if (!str) return null;
  const text = String(str).toLowerCase();
  const FLAVORS = [
    ['клубник', 'клубника'], ['малин', 'малина'], ['вишн', 'вишня'], ['черник', 'черника'],
    ['персик', 'персик'], ['абрикос', 'абрикос'], ['банан', 'банан'], ['яблок', 'яблоко'],
    ['ваниль', 'ваниль'], ['шоколад', 'шоколад'], ['карамел', 'карамель'], ['кокос', 'кокос'],
    ['лимон', 'лимон'], ['апельсин', 'апельсин'], ['сыр', 'сыр'], ['гриб', 'грибы'],
    ['зелен', 'зелень'], ['чеснок', 'чеснок'], ['томат', 'томат'], ['паприк', 'паприка'],
    ['краб', 'краб'], ['лосос', 'лосось'], ['сметан', 'сметана']
  ];
  for (const [pattern, label] of FLAVORS) {
    if (text.includes(pattern)) return label;
  }
  return null;
}
