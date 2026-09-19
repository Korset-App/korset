import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/User/.gemini/antigravity/brain/7e71fb97-bf71-4f01-b2d2-f7429b7c3649';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const icons = [
  {
    id: 'close',
    title: 'Крестик закрытия (Close / Dismiss)',
    current: 'close',
    usages: 16,
    files: 'AIAssistantScreen, RetailProductsScreen, ConfirmDangerModal, ImageCarousel, LightboxModal',
    variants: [
      {
        name: 'Вариант 1 (Solar Minimal)',
        desc: 'Тонкие линии 1.6px со скругленными концами, легкий и невесомый',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Bold)',
        desc: 'Четкие линии 2px, высокая читаемость для мобильных тапов',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      },
      {
        name: 'Вариант 3 (Circle Dismiss)',
        desc: 'Крестик в мягком тонком круге, премиальный вид для карточек',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`
      }
    ]
  },
  {
    id: 'inventory_2',
    title: 'Каталог / Склад / Товары (Inventory Box)',
    current: 'inventory_2',
    usages: 11,
    files: 'CatalogScreen (empty state), RetailProductsScreen, SuperAdminStoresScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Box Outline)',
        desc: 'Премиальная коробка с крышкой и центральной ручкой-замком',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18-3H3a1 1 0 0 0-1 1v2h20V6a1 1 0 0 0-1-1z"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Package 3D)',
        desc: 'Изометрическая посылка с линиями сгиба скотча',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>`
      },
      {
        name: 'Вариант 3 (Modern Archive Archive)',
        desc: 'Минималистичный контейнер с выдвижным слотом',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="5" rx="1.5"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>`
      }
    ]
  },
  {
    id: 'storefront',
    title: 'Магазин / Витрина (Storefront)',
    current: 'storefront',
    usages: 10,
    files: 'Store switcher, StoryViewer, SuperAdminStoresScreen, RetailEntryScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Boutique)',
        desc: 'Изящный фасад с навесом и арочной дверью',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.8-5h14.4L21 9v11a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20V9z"/><path d="M3 9c0 1.66 1.34 3 3 3s3-1.34 3-3c0 1.66 1.34 3 3 3s3-1.34 3-3c0 1.66 1.34 3 3 3s3-1.34 3-3"/><path d="M9 21.5v-7h6v7"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Store)',
        desc: 'Строгий минималистичный магазин',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>`
      },
      {
        name: 'Вариант 3 (Modern Market Pin)',
        desc: 'Геометрический контур магазина с открытым входом',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v4M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M9 21v-6h6v6"/></svg>`
      }
    ]
  },
  {
    id: 'barcode_scanner',
    title: 'Сканер штрих-кода (Barcode Scan)',
    current: 'barcode_scanner',
    usages: 6,
    files: 'RetailScannerModal, CatalogScreen, EanRecoveryScreen, StorePublicScreen',
    variants: [
      {
        name: 'Вариант 1 (Laser Frame Scan)',
        desc: 'Видоискатель с лазерной линией и штрихами',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2m-10 0H5a2 2 0 0 1-2-2v-2"/><path d="M7 9v6M10 8v8M14 9v6M17 8v8"/></svg>`
      },
      {
        name: 'Вариант 2 (Accurate EAN-13 Lines)',
        desc: 'Прецизионные вертикальные полосы разной толщины внутри рамки',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6a2 2 0 0 1 2-2h2m8 0h2a2 2 0 0 1 2 2m0 12a2 2 0 0 1-2 2h-2m-8 0H6a2 2 0 0 1-2-2"/><path d="M8 8v8M11 8v8M13 8v8M16 8v8"/></svg>`
      },
      {
        name: 'Вариант 3 (Target Focus Scanner)',
        desc: 'Фокусировочные уголки с центральной полосой сканирования',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><line x1="4" y1="12" x2="20" y2="12" stroke-width="2"/></svg>`
      }
    ]
  },
  {
    id: 'arrow_forward',
    title: 'Стрелка вперед / Далее (Arrow Forward)',
    current: 'arrow_forward',
    usages: 5,
    files: 'StoryViewer, ProductScreen, RetailDashboardScreen, ScanScreen, StorePublicScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Arrow Right)',
        desc: 'Изящная длинная стрелка с красивым углом наконечника',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16m0 0l-6-6m6 6l-6 6"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Chevron Right)',
        desc: 'Компактный шеврон для списков и кнопок действий',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`
      },
      {
        name: 'Вариант 3 (Rounded Pill Arrow)',
        desc: 'Мягкий наконечник в стиле iOS сбалансированной ширины',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`
      }
    ]
  },
  {
    id: 'arrow_back',
    title: 'Назад (Arrow Back)',
    current: 'arrow_back',
    usages: 5,
    files: 'AlternativesScreen, CatalogScreen, ProductCompositionScreen, StorePublicScreen, StoresScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Arrow Left)',
        desc: 'Элегантная стрелка назад с оптимальным балансом',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H4m0 0l6-6m-6 6l6 6"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Chevron Left)',
        desc: 'Шеврон назад (навигационный хедер мобильного экрана)',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`
      },
      {
        name: 'Вариант 3 (Back Arrow Rounded)',
        desc: 'Плавный изгиб с тонким оперением',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m0 0l6 6m-6-6l6-6"/></svg>`
      }
    ]
  },
  {
    id: 'expand_more',
    title: 'Раскрыть вниз (Chevron Down)',
    current: 'expand_more',
    usages: 5,
    files: 'IngredientsPreview, CatalogScreen, RetailProductsScreen, StorePublicScreen',
    variants: [
      {
        name: 'Вариант 1 (Lucide Chevron Down)',
        desc: 'Аккуратный шеврон для аккордеонов и селектов',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`
      },
      {
        name: 'Вариант 2 (Solar Soft Angle)',
        desc: 'Широкий мягкий угол с закругленной вершиной',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l5 5 5-5"/></svg>`
      },
      {
        name: 'Вариант 3 (Circle Chevron)',
        desc: 'Шеврон в круглом бейдже для крупных списков',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="m9 11 3 3 3-3"/></svg>`
      }
    ]
  },
  {
    id: 'check_circle',
    title: 'Успешно / Проверено (Check Circle)',
    current: 'check_circle',
    usages: 4,
    files: 'Scan toast, Fit-Check cards, EAN recovery, Admin',
    variants: [
      {
        name: 'Вариант 1 (Solar Check Ring)',
        desc: 'Идеальный круг с динамичным хвостиком галочки',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M8 12.5l2.8 2.8 5.4-5.6"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Success Badge)',
        desc: 'Лаконичный четкий индикатор успеха',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
      },
      {
        name: 'Вариант 3 (Soft Rounded Check)',
        desc: 'Плавный силуэт со скругленной вершиной галочки',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/></svg>`
      }
    ]
  },
  {
    id: 'verified',
    title: 'Сертификат / Халал проверка (Verified Badge)',
    current: 'verified',
    usages: 4,
    files: 'StoryViewer, AlternativesScreen, EanRecoveryScreen, Halal badge',
    variants: [
      {
        name: 'Вариант 1 (Solar Starburst Badge)',
        desc: 'Премиальный 8-лепестковый бейдж сертификации',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 2.1 3.2-.3 1.3 2.9 3 1.2-.5 3.2 2 2.5-2 2.5.5 3.2-3 1.2-1.3 2.9-3.2-.3L12 22l-2.4-2.1-3.2.3-1.3-2.9-3-1.2.5-3.2-2-2.5 2-2.5-.5-3.2 3-1.2 1.3-2.9 3.2.3L12 2z"/><path d="M8.5 12l2.5 2.5 5-5"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Shield Check)',
        desc: 'Щит надежности с галочкой',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`
      },
      {
        name: 'Вариант 3 (Award Rosette)',
        desc: 'Знак качества с лентой-гарантией',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="7"/><path d="m8.5 10 2.5 2.5 4.5-4.5"/><path d="M8.2 15.5 7 21l5-2 5 2-1.2-5.5"/></svg>`
      }
    ]
  },
  {
    id: 'auto_awesome',
    title: 'AI Магия / Интеллект (Sparkles)',
    current: 'auto_awesome',
    usages: 4,
    files: 'StoryViewer, ProductCompositionScreen, StorePublicScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar 4-Point Sparkles)',
        desc: 'Фирменная 4-конечная звезда и две малых искорки',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c0 4.5 3.5 8 8 8-4.5 0-8 3.5-8 8 0-4.5-3.5-8-8-8 4.5 0 8-3.5 8-8z"/><path d="M19 16c0 1.7 1.3 3 3 3-1.7 0-3 1.3-3 3 0-1.7-1.3-3-3-3 1.7 0 3-1.3 3-3z"/><path d="M5 4c0 1.1.9 2 2 2-1.1 0-2 .9-2 2 0-1.1-.9-2-2-2 1.1 0 2-.9 2-2z"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Sparkles)',
        desc: 'Легкие тонкие мерцающие звезды современного AI',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/></svg>`
      },
      {
        name: 'Вариант 3 (Magic Wand Sparkle)',
        desc: 'Волшебная палочка с искрами вдохновения',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m15 4-2 2M18 7l2-2M15 10l5-5M3 21l9-9"/><path d="M12.2 6.8 17.2 11.8"/></svg>`
      }
    ]
  },
  {
    id: 'delete',
    title: 'Удалить / Корзина (Trash / Delete)',
    current: 'delete',
    usages: 8,
    files: 'AIScreen, RetailProductsScreen, HistoryScreen, ConfirmDangerModal',
    variants: [
      {
        name: 'Вариант 1 (Solar Minimal Bin)',
        desc: 'Изящный контейнер с парящей крышкой и плавными стенками',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Trash 2)',
        desc: 'Классическая корзина со строгими вертикальными ребрами',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`
      },
      {
        name: 'Вариант 3 (Sleek Outline Bucket)',
        desc: 'Минималистичное мусорное ведро без лишних линий',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7l-.87 12.14A2 2 0 0 1 16.14 21H7.86a2 2 0 0 1-2-1.86L5 7M3 7h18M8 7V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3"/></svg>`
      }
    ]
  },
  {
    id: 'travel_explore',
    title: 'Поиск / Исследование (Explore / Search)',
    current: 'travel_explore',
    usages: 7,
    files: 'AlternativesScreen, CatalogScreen, ProductScreen, StoresScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Search Globe)',
        desc: 'Лупа с орбитой глобуса — идеальный аналог travel_explore',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><ellipse cx="11" cy="11" rx="8" ry="3" transform="rotate(-30 11 11)"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Compass Explore)',
        desc: 'Компас исследования каталога и магазинов',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`
      },
      {
        name: 'Вариант 3 (Clean Precision Loupe)',
        desc: 'Классическая четкая лупа с элегантной ручкой',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`
      }
    ]
  },
  {
    id: 'warning',
    title: 'Предупреждение / Аллерген (Warning Alert)',
    current: 'warning',
    usages: 8,
    files: 'ErrorBoundary, AlternativesScreen, ProductCompositionScreen, ConfirmDangerModal',
    variants: [
      {
        name: 'Вариант 1 (Solar Rounded Triangle)',
        desc: 'Скругленный треугольник с мягкими углами и точкой',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Alert Circle)',
        desc: 'Круг с восклицательным знаком — мягкое внимание',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      },
      {
        name: 'Вариант 3 (Octagon Shield Alert)',
        desc: 'Восьмигранник для критических предупреждений и стоп-факторов',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      }
    ]
  },
  {
    id: 'fact_check',
    title: 'Факты / Чеклист состава (Fact Check)',
    current: 'fact_check',
    usages: 6,
    files: 'IngredientsPreview, RetailDashboardScreen, StorePublicScreen, HistoryScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Clipboard Check)',
        desc: 'Планшет с зажимом и отмеченными пунктами списка',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide List Checks)',
        desc: 'Три полоски списка с галочками',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m3 5 2 2 4-4M3 12l2 2 4-4M3 19l2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/></svg>`
      },
      {
        name: 'Вариант 3 (Document Verified Check)',
        desc: 'Лист спецификации с печатью одобрения',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>`
      }
    ]
  },
  {
    id: 'edit',
    title: 'Редактировать (Edit / Pencil)',
    current: 'edit',
    usages: 3,
    files: 'EanRecoveryScreen, SuperAdminStoresScreen, RetailSettingsScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Clean Pen)',
        desc: 'Наклонный стильный карандаш со штрихом подложки',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Edit 3)',
        desc: 'Карандаш, пишущий на нижней горизонтальной линии',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`
      },
      {
        name: 'Вариант 3 (Minimalist Stylus)',
        desc: 'Современный лаконичный стилус',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3l-13.5 13.5-4.5 1.5 1.5-4.5 13.5-13.5z"/></svg>`
      }
    ]
  },
  {
    id: 'location_on',
    title: 'Локация / Адрес магазина (Map Pin)',
    current: 'location_on',
    usages: 3,
    files: 'StorePublicScreen, StoresScreen, SuperAdminStoresScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Pin Drop)',
        desc: 'Капля геолокации с полым кругом внутри',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Map Pin Soft)',
        desc: 'Утонченный контур маркера на карте',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
      },
      {
        name: 'Вариант 3 (Nav Compass Pin)',
        desc: 'Маркер навигации в форме стрелки компаса',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`
      }
    ]
  },
  {
    id: 'lock',
    title: 'Замок / Безопасность / Доступ (Lock)',
    current: 'lock',
    usages: 2,
    files: 'RetailLayout, SuperAdminStoresScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Padlock)',
        desc: 'Скругленный корпус с аккуратной дужкой',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Lock Keyhole)',
        desc: 'Замок со скважиной ключа',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
      },
      {
        name: 'Вариант 3 (Shield Lock)',
        desc: 'Щит безопасности со встроенным замком',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10 11V9a2 2 0 1 1 4 0v2"/></svg>`
      }
    ]
  },
  {
    id: 'sync',
    title: 'Синхронизация / Обновление (Sync)',
    current: 'sync',
    usages: 2,
    files: 'HistoryScreen, SuperAdminStoresScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Dual Arrows)',
        desc: 'Две стрелки по кругу с мягким радиусом',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6"/><path d="M18.86 9A9 9 0 0 0 5.14 9M5.14 15a9 9 0 0 0 13.72 0"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Refresh Clockwise)',
        desc: 'Круговое вращение обновления данных',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`
      },
      {
        name: 'Вариант 3 (Cloud Sync)',
        desc: 'Облако со стрелками синхронизации каталога',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="m11 13 2 2 2-2"/></svg>`
      }
    ]
  },
  {
    id: 'ios_share',
    title: 'Поделиться (Share)',
    current: 'ios_share',
    usages: 1,
    files: 'ImageCarousel (кнопка поделиться товаром)',
    variants: [
      {
        name: 'Вариант 1 (Apple Style Tray Share)',
        desc: 'Стрелка вверх из лотка — привычный жест для iOS/Safari',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Universal Nodes)',
        desc: 'Три узла связи — универсальный знак шеринга для Android и Web',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`
      },
      {
        name: 'Вариант 3 (Link & Arrow Out)',
        desc: 'Стрелка из угла карточки (экспорт ссылки)',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`
      }
    ]
  },
  {
    id: 'visibility',
    title: 'Видимость / Пароль (Visibility / Eye)',
    current: 'visibility',
    usages: 4,
    files: 'SuperAdminStoresScreen, RetailSettingsScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar Curved Eye)',
        desc: 'Изящный глаз с центральным зрачком',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Eye)',
        desc: 'Классический четкий контур глаза',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`
      },
      {
        name: 'Вариант 3 (Soft Iris Pupil)',
        desc: 'Смягченные контуры с акцентированной радужкой',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c1.8-4.5 5.8-7 10-7s8.2 2.5 10 7c-1.8 4.5-5.8 7-10 7s-8.2-2.5-10-7z"/><circle cx="12" cy="12" r="3.5"/></svg>`
      }
    ]
  },
  {
    id: 'upload_file',
    title: 'Загрузка файла / Импорт (Upload File)',
    current: 'upload_file',
    usages: 3,
    files: 'RetailImportScreen, RetailProductsScreen',
    variants: [
      {
        name: 'Вариант 1 (Solar File Upload)',
        desc: 'Лист Excel/CSV со стрелкой загрузки в систему',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 12 15 15"/><line x1="12" y1="12" x2="12" y2="18"/></svg>`
      },
      {
        name: 'Вариант 2 (Lucide Cloud Upload)',
        desc: 'Облако со стрелкой вверх для импорта каталогов',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>`
      },
      {
        name: 'Вариант 3 (Tray Arrow Upload)',
        desc: 'Минималистичный лоток со стрелкой вверх',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`
      }
    ]
  }
];

const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Körset — Студия замены иконок (Material Symbols → Curated SVG)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(26, 34, 52, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f1f5f9;
      --text-dim: #94a3b8;
      --text-muted: #64748b;
      --primary: #10b981;
      --primary-dim: rgba(16, 185, 129, 0.12);
      --primary-glow: rgba(16, 185, 129, 0.3);
      --current-badge: #ef4444;
      --current-dim: rgba(239, 68, 68, 0.12);
      --option-hover: rgba(255, 255, 255, 0.04);
      --selected-bg: rgba(16, 185, 129, 0.15);
      --selected-border: #10b981;
    }

    [data-theme="light"] {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --text: #0f172a;
      --text-dim: #475569;
      --text-muted: #94a3b8;
      --primary: #059669;
      --primary-dim: rgba(5, 150, 105, 0.1);
      --primary-glow: rgba(5, 150, 105, 0.2);
      --current-badge: #dc2626;
      --current-dim: rgba(220, 38, 38, 0.08);
      --option-hover: #f1f5f9;
      --selected-bg: rgba(5, 150, 105, 0.08);
      --selected-border: #059669;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
      transition: background 0.3s ease, color 0.3s ease;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand-title {
      font-size: 24px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-badge {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--primary-dim);
      color: var(--primary);
      font-weight: 700;
      border: 1px solid var(--primary-glow);
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    button.btn {
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid var(--card-border);
      background: var(--card-bg);
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    button.btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    button.btn-primary {
      background: var(--primary);
      color: #fff;
      border: none;
      box-shadow: 0 4px 14px var(--primary-glow);
    }
    button.btn-primary:hover {
      opacity: 0.92;
      color: #fff;
    }

    .intro-banner {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px 24px;
      margin-bottom: 32px;
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      align-items: center;
    }
    @media (max-width: 768px) {
      .intro-banner { grid-template-columns: 1fr; }
    }

    .intro-banner h2 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .intro-banner p {
      font-size: 14px;
      color: var(--text-dim);
    }

    .intro-stats {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
    }

    .stat-pill {
      text-align: center;
      padding: 12px 18px;
      border-radius: 12px;
      background: var(--primary-dim);
      border: 1px solid var(--primary-glow);
    }

    .stat-pill .num {
      font-size: 22px;
      font-weight: 800;
      color: var(--primary);
      display: block;
    }

    .stat-pill .lbl {
      font-size: 11px;
      color: var(--text-dim);
      font-weight: 600;
      text-transform: uppercase;
    }

    .icon-cards {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .icon-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: border-color 0.2s ease;
    }

    .icon-card:hover {
      border-color: rgba(255, 255, 255, 0.16);
    }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
    }

    .card-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .card-title {
      font-size: 17px;
      font-weight: 700;
    }

    .card-files {
      font-size: 12px;
      color: var(--text-muted);
    }

    .card-badge-count {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 8px;
      background: rgba(255,255,255,0.06);
      color: var(--text-dim);
    }

    .options-grid {
      display: grid;
      grid-template-columns: 180px repeat(3, 1fr);
      gap: 14px;
      margin-top: 6px;
    }

    @media (max-width: 960px) {
      .options-grid {
        grid-template-columns: 1fr;
      }
    }

    .option-box {
      border: 1.5px solid var(--card-border);
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      background: rgba(255, 255, 255, 0.015);
    }

    .option-box:hover {
      background: var(--option-hover);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .option-box.selected {
      background: var(--selected-bg);
      border-color: var(--selected-border);
      box-shadow: 0 0 0 1px var(--selected-border);
    }

    .option-box.current-baseline {
      border-color: var(--current-dim);
      background: var(--current-dim);
      cursor: default;
    }

    .option-badge {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .badge-current { background: var(--current-dim); color: var(--current-badge); }
    .badge-variant { background: rgba(255,255,255,0.08); color: var(--text-dim); }

    .preview-stage {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
    }

    .preview-stage .icon-render {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text);
      transition: transform 0.2s ease;
    }

    .option-box:hover .preview-stage .icon-render {
      transform: scale(1.1);
      color: var(--primary);
    }

    .option-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
    }

    .option-desc {
      font-size: 11.5px;
      color: var(--text-dim);
      line-height: 1.4;
      min-height: 32px;
    }

    .select-btn-radio {
      margin-top: auto;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text-muted);
    }

    .option-box.selected .select-btn-radio {
      color: var(--primary);
    }

    .footer-actions {
      position: sticky;
      bottom: 24px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: 0 12px 36px rgba(0,0,0,0.3);
      padding: 16px 24px;
      border-radius: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 40px;
      z-index: 50;
      backdrop-filter: blur(16px);
      flex-wrap: wrap;
      gap: 16px;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }

    .modal-overlay.active { display: flex; }

    .modal-box {
      background: var(--bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      max-width: 600px;
      width: 100%;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    textarea.export-text {
      width: 100%;
      height: 180px;
      background: rgba(0,0,0,0.2);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      color: var(--text);
      font-family: monospace;
      font-size: 12px;
      padding: 12px;
      resize: vertical;
    }
  </style>
</head>
<body data-theme="dark">
  <div class="container">
    <header>
      <div class="brand-title">
        <span>Körset Design Studio</span>
        <span class="brand-badge">Icon Upgrade v1.0</span>
      </div>
      <div class="controls">
        <button class="btn" onclick="toggleTheme()">
          🌓 Сменить тему (Dark/Light)
        </button>
        <button class="btn" onclick="selectAllOption(0)">
          ⚡ Выбрать все Option 1 (Solar)
        </button>
        <button class="btn btn-primary" onclick="openExportModal()">
          ✓ Экспорт выбора для агента
        </button>
      </div>
    </header>

    <div class="intro-banner">
      <div>
        <h2>Витрина замены Material Symbols на Curated SVG</h2>
        <p>Для каждой иконки подобраны 2-3 высокоточных векторных варианта (Solar Luxury, Lucide Precision, Modern Minimal). Никаких тяжелых внешних шрифтов. Выберите понравившийся вариант кликом по карточке или нажмите <b>«Экспорт выбора»</b>.</p>
      </div>
      <div class="intro-stats">
        <div class="stat-pill">
          <span class="num">${icons.length}</span>
          <span class="lbl">Иконок</span>
        </div>
        <div class="stat-pill">
          <span class="num">${icons.reduce((a,c) => a + c.usages, 0)}</span>
          <span class="lbl">Мест в коде</span>
        </div>
      </div>
    </div>

    <div class="icon-cards" id="iconsContainer">
      ${icons.map((item, idx) => `
        <div class="icon-card" data-icon-id="${item.id}">
          <div class="card-head">
            <div class="card-title-group">
              <span class="card-title">${item.title}</span>
              <span class="card-files">Используется в: <code>${item.files}</code></span>
            </div>
            <span class="card-badge-count">${item.usages} вызовов в приложении</span>
          </div>

          <div class="options-grid">
            <!-- Baseline: Current Material Symbol -->
            <div class="option-box current-baseline">
              <span class="option-badge badge-current">Текущая (Material)</span>
              <div class="preview-stage">
                <span class="material-symbols-outlined" style="font-size: 28px; color: var(--text-dim);">${item.current}</span>
              </div>
              <span class="option-name">Шрифтовой глиф</span>
              <span class="option-desc">Стандартный системный Material Symbol</span>
              <div class="select-btn-radio">Заменяется</div>
            </div>

            <!-- Option 1 -->
            <div class="option-box selected" onclick="selectOption('${item.id}', 1)" id="box_${item.id}_1">
              <span class="option-badge badge-variant">Вариант 1 (Solar / Luxury)</span>
              <div class="preview-stage">
                <div class="icon-render" style="width: 28px; height: 28px;">
                  ${item.variants[0].svg}
                </div>
              </div>
              <span class="option-name">${item.variants[0].name}</span>
              <span class="option-desc">${item.variants[0].desc}</span>
              <div class="select-btn-radio">✓ Выбрано</div>
            </div>

            <!-- Option 2 -->
            <div class="option-box" onclick="selectOption('${item.id}', 2)" id="box_${item.id}_2">
              <span class="option-badge badge-variant">Вариант 2 (Lucide / Precision)</span>
              <div class="preview-stage">
                <div class="icon-render" style="width: 28px; height: 28px;">
                  ${item.variants[1].svg}
                </div>
              </div>
              <span class="option-name">${item.variants[1].name}</span>
              <span class="option-desc">${item.variants[1].desc}</span>
              <div class="select-btn-radio">Выбрать</div>
            </div>

            <!-- Option 3 -->
            <div class="option-box" onclick="selectOption('${item.id}', 3)" id="box_${item.id}_3">
              <span class="option-badge badge-variant">Вариант 3 (Soft / Modern)</span>
              <div class="preview-stage">
                <div class="icon-render" style="width: 28px; height: 28px;">
                  ${item.variants[2].svg}
                </div>
              </div>
              <span class="option-name">${item.variants[2].name}</span>
              <span class="option-desc">${item.variants[2].desc}</span>
              <div class="select-btn-radio">Выбрать</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="footer-actions">
      <div>
        <strong style="font-size: 15px;">Все 20 ключевых иконок настроены</strong>
        <p style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">По умолчанию предвыбран <b>Вариант 1 (Solar Luxury)</b>, идеально сочетающийся со стилем Körset.</p>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="btn btn-primary" onclick="openExportModal()">
          ✓ Скопировать конфигурацию для агента
        </button>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="exportModal" onclick="closeExportModal(event)">
    <div class="modal-box" onclick="event.stopPropagation()">
      <h3 style="font-size: 18px; font-weight: 800;">Конфигурация утвержденных иконок</h3>
      <p style="font-size: 13px; color: var(--text-dim);">Скопируйте этот текст и отправьте в чат — агент сразу создаст все компоненты в <code>src/components/icons/</code> и заменит вызовы в экранах!</p>
      <textarea class="export-text" id="exportContent" readonly></textarea>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button class="btn" onclick="copyToClipboard()">Копировать в буфер</button>
        <button class="btn btn-primary" onclick="document.getElementById('exportModal').classList.remove('active')">Готово</button>
      </div>
    </div>
  </div>

  <script>
    const userSelections = {};
    const iconList = ${JSON.stringify(icons.map(i => i.id))};

    // Default to option 1 for all
    iconList.forEach(id => userSelections[id] = 1);

    function selectOption(iconId, optionIndex) {
      userSelections[iconId] = optionIndex;
      for (let i = 1; i <= 3; i++) {
        const box = document.getElementById('box_' + iconId + '_' + i);
        if (!box) continue;
        if (i === optionIndex) {
          box.classList.add('selected');
          box.querySelector('.select-btn-radio').textContent = '✓ Выбрано';
        } else {
          box.classList.remove('selected');
          box.querySelector('.select-btn-radio').textContent = 'Выбрать';
        }
      }
    }

    function selectAllOption(variantIdx) {
      const optionNumber = variantIdx + 1;
      iconList.forEach(id => {
        selectOption(id, optionNumber);
      });
    }

    function toggleTheme() {
      const current = document.body.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
    }

    function openExportModal() {
      const modal = document.getElementById('exportModal');
      const txt = document.getElementById('exportContent');
      txt.value = JSON.stringify({
        action: 'APPLY_ICON_SELECTION',
        selections: userSelections
      }, null, 2);
      modal.classList.add('active');
    }

    function closeExportModal(e) {
      document.getElementById('exportModal').classList.remove('active');
    }

    function copyToClipboard() {
      const txt = document.getElementById('exportContent');
      txt.select();
      navigator.clipboard.writeText(txt.value);
      alert('Конфигурация скопирована в буфер обмена!');
    }
  </script>
</body>
</html>`;

const targetPath = path.join(ARTIFACT_DIR, 'icon_candidates_showcase.html');
fs.writeFileSync(targetPath, htmlContent, 'utf8');
console.log('Successfully generated showcase at:', targetPath);
