# Лендинг Körset V2 — Полный план редизайна

> Создано: 2026-05-05
> Статус: В РАБОТЕ
> Этапов: 5
> Связи: [[landing-v3-full-rebuild]] · [[landing-v3-prompt]]

---

## 1. КОНЦЕПЦИЯ

### Целевая аудитория
Покупатель, зашедший по ссылке из Google или напрямую. НЕ через QR.
Вторичная: владелец магазина (секция внизу).

### Главное действие
«Выбрать магазин» → /stores

### Визуальная философия
**Dark Technological Premium** — как Shopify, Framer, Slack.
Чёрный фон, фиолетовые акценты, глубокие градиенты, чёткая типографика Advent Pro,
много negative space. Каждый пиксель как у бренда уровня $1B.

### Референсы
- **Shopify.com** — 3D-элементы, hover slideshow, scroll-эффекты, видеовставки, динамический заголовок
- **Framer.com** — чистый минимализм, плавные анимации, shader-эффекты
- **Slack.com** — дружелюбный тон, крупные иконки, социальное доказательство

### Уникальные визуальные решения Körset
- **Фиолетовый primary (#7c3aed)** как основной акцент — не синий
- **Advent Pro** как display font — геометричный, технологичный
- **Noise texture overlay** — добавляет глубину фону (как у Framer)
- **Gradient mesh backgrounds** — radial-gradient пятна фиолетового/голубого/зелёного
- **Glass morphism cards** — но утончённые, не перегруженные
- **CSS 3D phone mockup** — перспективный телефон с parallax при скролле
- **Scroll-triggered reveal** — секции плавно появляются при скролле
- **Hover micro-interactions** — карточки поднимаются, подсвечиваются, glow-эффект
- **Dynamic word rotation** в hero — плавная смена ключевого слова

### Тема: ТОЛЬКО ТЁМНАЯ
Убираем toggle, убираем все `:root[data-theme='light']` правила из LandingScreen.css.
Лендинг — автономная brand-страница, как у всех крупных брендов.

---

## 2. ТЕРМИНОЛОГИЯ RU/KZ

| Текущий | Замена RU | Замена KZ | Контекст |
|---------|-----------|-----------|----------|
| Fit-Check | Подходит ли? | Сай келе ме? | Hero, секция, чипы |
| (вердикт) | Подходит | Сай келеді | Зелёная карточка |
| (вердикт) | Осторожно | Абайлаңыз | Оранжевая карточка |
| (вердикт) | Не подходит | Сай емес | Красная карточка |
| SKU | товаров | тауар | Stats, Retail |
| PWA | Без установки | Орнатусыз | Features, FAQ |
| AI | ИИ-помощник | ИИ-көмекші | Features |
| Early Access | Ранняя подписка | Ерте жазылу | Тарифы |
| Retail Cabinet | Кабинет магазина | Дүкен кабинеті | Retail секция |
| Catalog | Каталог | Каталог | Features |
| Compare | Сравнение | Салыстыру | Features |
| Alternatives | Альтернативы | Баламалар | Features |
| Offline | Офлайн | Офлайн | Features |
| History | История | Тарих | Features |
| Profile | Профиль | Профиль | Features |

---

## 3. СТРУКТУРА ЛЕНДИНГА (12 секций)

### 0. HEADER — Sticky Navigation

**Десктоп:**
```
┌──────────────────────────────────────────────────────────────┐
│  Körset   Как работает   Возможности   Магазинам   Тарифы  │  [Выбрать магазин] │
└──────────────────────────────────────────────────────────────┘
```

**Мобильный:**
```
┌─────────────────────────┐
│  Körset          ☰      │
└─────────────────────────┘
→ Гамбургер открывает slide-down меню с секциями
```

**Поведение:**
- Sticky, backdrop-blur(28px) saturate(1.4)
- Фон: rgba(7, 7, 15, 0.88)
- При скролле вниз: padding сжимается (12px → 8px), border-bottom появляется
- Smooth scroll к секции по клику
- Активная секция подсвечивается фиолетовым (IntersectionObserver)
- Логотип «Körset» — gradient text primary-bright → accent-sky
- CTA кнопка «Выбрать магазин» — primary gradient
- Язык: определяется по устройству, переключатель RU/KZ в хедере (маленький, рядом с CTA)

**Навигационные ссылки:**
- Как работает → #how
- Возможности → #features
- Магазинам → #retail
- Тарифы → #pricing

---

### 1. HERO — Главный экран

**Фон:**
- Base: #07070f
- Radial gradient: rgba(124, 58, 237, 0.18) на 50% -10% (фиолетовый glow сверху)
- Radial gradient: rgba(56, 189, 248, 0.08) на 100% 15% (голубой glow справа)
- Noise texture overlay (opacity 0.28, mask fade)

**Левая часть (копи):**
- Eyebrow chip: «Аллергены · Халал · Диеты · Состав»
- **Заголовок H1:**
  - Фиксированная часть: «Узнай »
  - Ротирующееся слово (каждые 2.5с, fade transition):
    1. **состав** — ингредиенты, Е-добавки
    2. **аллергены** — 14 типов
    3. **халал** — религиозный критерий
    4. **цену** — сколько стоит и где стоит
    5. **КБЖУ** — калории, белки, жиры, углеводы
    6. **подходит ли тебе** — итоговый вердикт
  - Размер: clamp(42px, 13vw, 84px), Advent Pro 800
  - Цвет: gradient text (text → primary-bright → accent-sky)
  - Ротирующееся слово: primary-bright цвет, underline animation

- **Субтитр:**
  «Наведи камеру на штрихкод — Körset покажет всё за секунду»
  Размер: 18px, Inter 600, color: text-sub

- **CTA:**
  - Primary: «Выбрать магазин» → /stores (gradient bg, glow shadow)
  - Ghost: «Как работает» ↓ scroll (glass bg)

**Правая часть (визуал):**
- CSS 3D phone mockup:
  - Перспективный телефон (border-radius: 36px, border: glass-strong-border)
  - На экране: стилизованный результат «Подходит» (зелёный вердикт)
  - Parallax rotateY при скролле (0 → 15deg)
  - Subtle float animation (4s ease-in-out)
  - Glow: box-shadow с primary-dim
  - НЕ Three.js — чистый CSS perspective + transform
  - Под телефоном: отражение (opacity 0.1, transform scaleY(-1))

**Social proof bar (под hero):**
- Тонкая полоса: «Уже в магазинах Казахстана»
- 3-4 логотипа-заглушки (круглые, grayscale, opacity 0.5)
- Размер:紧凑ный, не отвлекает

---

### 2. HOW IT WORKS — 3 шага

**Секция id:** #how

**Визуал:**
- Eyebrow: «Как работает»
- Заголовок: «Три шага — и ты знаешь всё»
- Субтитр: «Körset работает прямо у полки, без установки»

**3 карточки горизонтально:**

| # | Иконка | Заголовок | Описание | Hover-эффект |
|---|--------|-----------|----------|-------------|
| 01 | store (SVG) | Открой магазин | Выбери магазин из списка или наведи на QR у входа | Поднимается, glow |
| 02 | scan (SVG) | Сканируй товар | Наведи камеру на штрихкод — карточка появится мгновенно | Поднимается, glow |
| 03 | check (SVG) | Узнай, подходит ли | Аллергены, халал, КБЖУ — понятный ответ за секунду | Поднимается, glow |

**Стиль карточки:**
- Glass bg, glass-border
- Номер 01/02/03: Advent Pro 800, 42px, gradient text (primary → accent-sky), opacity 0.4
- Иконка: 28px, primary-bright
- Заголовок: 17px, Advent Pro 800
- Описание: 14px, Inter 600, text-sub
- Hover: translateY(-4px), border → primary-mid, box-shadow с primary glow
- Mobile: вертикальный стек, карточки полная ширина

**Media placeholder:** Каждая карточка при hover показывает slideshow (пока: CSS gradient placeholder 200x120)

---

### 3. ПОДХОДИТ ЛИ? — Fit-Check демонстрация

**Секция id:** #fit (не в навигации, часть storytelling)

**Визуал:**
- Eyebrow: «Результат скана»
- Заголовок: «Не просто состав — понятный ответ»
- Субтитр: «Körset объясняет причину, а не заставляет разбираться в этикетке»

**3 больших карточки:**

| Цвет | Заголовок | Описание | Accent |
|------|-----------|----------|--------|
| Зелёный | Подходит | Товар не конфликтует с вашим профилем и ограничениями | success-bright |
| Оранжевый | Осторожно | Есть спорные ингредиенты, следы аллергенов или неясный халал | warning |
| Красный | Не подходит | Критичный аллерген или явное ограничение подсвечено сразу | error-bright |

**Стиль:**
- Каждая карточка: tall card, gradient bg (color-tint → transparent)
- Иконка: 32px, цветная
- Заголовок: 20px, Advent Pro 800
- Описание: 14px, Inter 600, text-sub
- Левый бордер: 3px, цветной
- Hover: translateY(-2px), glow цвета карточки

**Под карточками — блок «Альтернативы»:**
- «Не подошёл? Увидишь подходящие товары из того же магазина»
- Иконка: compare_arrows
- Стиль: compact pill, glass bg

**Disclaimer:**
- «Körset помогает ориентироваться, но критичные аллергены всегда проверяйте на упаковке»
- Glass bg, text-dim, 13px

---

### 4. ДЛЯ КОГО — горизонтальные карточки

**Секция id:** #for-whom (не в навигации, часть storytelling)

**Визуал:**
- Eyebrow: «Для кого»
- Заголовок: «Полезно тем, кто выбирает внимательнее»
- Субтитр: «Без перегруза: главное видно сразу, детали — по мере необходимости»

**4 карточки:**

| Иконка | Заголовок | Описание |
|--------|-----------|----------|
| allergy | Аллергии | Молоко, орехи, глютен и ещё 11 типов ограничений |
| verified | Халал | Подсказки по ингредиентам и спорным добавкам |
| monitoring | Диеты | Сахар, КБЖУ, веган, кето и подходящие альтернативы |
| family_restroom | Семья | Быстрее выбрать продукт без лишнего риска для близких |

**Стиль:**
- Горизонтальный ряд (десктоп: 4 колонки, мобильный: 2x2)
- Glass card, hover: translateY(-4px) + primary glow
- Иконка: 24px, primary-bright
- Заголовок: 16px, Advent Pro 800
- Описание: 13px, Inter 600, text-sub

**Media placeholder:** Hover slideshow (пока: placeholder gradient)

---

### 5. ВОЗМОЖНОСТИ — 2x3 grid

**Секция id:** #features

**Визуал:**
- Eyebrow: «Возможности»
- Заголовок: «Всё важное — в одном приложении»
- Субтитр: «От скана до ИИ-вопроса — без переключения между программами»

**6 карточек (2 ряда × 3):**

| # | Иконка | Заголовок | Описание | Группа |
|---|--------|-----------|----------|--------|
| 1 | check_circle | Подходит ли? | Проверка аллергенов, халал, диет — понятный ответ | Проверка |
| 2 | restaurant | Состав и КБЖУ | Ингредиенты, Е-добавки, калории — всё на одном экране | Проверка |
| 3 | swap_horiz | Альтернативы | Не подошёл — увидишь подходящие товары из того же магазина | Действие |
| 4 | compare_arrows | Сравнение | Два товара рядом: состав, цена, КБЖУ, вердикт | Действие |
| 5 | smart_toy | ИИ-помощник | Спроси про состав, замену или рецепт — ответит мгновенно | Интеллект |
| 6 | cloud_off | Без установки | Открой через QR — работай сразу. Работает офлайн | Доступ |

**Стиль:**
- Glass card, hover: translateY(-4px) + primary glow
- Иконка: 28px, primary-bright
- Заголовок: 16px, Advent Pro 800
- Описание: 13px, Inter 600, text-sub
- Каждая карточка имеет hover slideshow placeholder

**Mobile:** 2 колонки, 3 ряда

---

### 6. STATS — цифры

**Секция id:** #stats (не в навигации)

**Визуал:**
- 4 карточки в ряд (десктоп), 2x2 (мобильный)
- Фон: subtle gradient mesh

**Числа (scroll-triggered count-up):**

| Значение | Подпись |
|----------|---------|
| 7 000+ | товаров в базе |
| 99% | реальных штрихкодов |
| 88% | товаров с составом |
| 2 | языка: русский и казахский |

**Стиль:**
- Число: Advent Pro 800, 36px, gradient text (text → primary-bright)
- Подпись: Inter 600, 13px, text-dim
- Карточка: glass bg, hover: accent-sky glow
- Count-up анимация при попадании в viewport (IntersectionObserver)
- Duration: 1.5s, ease-out

---

### 7. ВИДЕО-ДЕМО — полноширинный

**Секция id:** #showcase (не в навигации)

**Визуал:**
- Полноширинный контейнер с rounded corners (24px)
- Aspect ratio: 16/9
- Play button по центру (большой, primary gradient, ▶ icon)
- Overlay gradient снизу (для текста)
- Текст поверх: «Посмотрите, как работает Körset»

**Сейчас (заглушка):**
- Gradient placeholder с анимированными частицами (CSS)
- Play button есть, но видео нет

**Потом (реальное):**
- 10-15сек WebM, зацикленное
- AI-generated: камера сканирует товар → появляется результат
- Autoplay на десктопе (muted), click-to-play на мобильном
- Формат: WebM (VP9) + MP4 (H.264) fallback
- Размер: < 3MB

---

### 8. ДЛЯ МАГАЗИНОВ — Retail секция

**Секция id:** #retail

**Визуал:**
- Eyebrow: «Körset для магазинов»
- Заголовок: «Покупателю проще выбрать — магазину проще возвращать его снова»
- Субтитр: «Körset превращает обычную полку в цифровой сервис: покупатель получает пользу, а магазин — лояльность и понимание спроса»

**5 карточек преимуществ:**

| Иконка | Заголовок | Описание |
|--------|-----------|----------|
| qr_code_2 | QR на полке | Покупатель сканирует товары без установки — открывает по QR |
| inventory_2 | Каталог и цены | Импорт прайса из Excel, обновление цен и наличия за минуту |
| query_stats | Аналитика в ₸ | Сканы, покрытие каталога, упущенная выручка — всё в кабинете |
| dashboard | Кабинет магазина | Личный дашборд: товары, импорт, настройки, QR-коды |
| campaign | Продвижение | Instagram и медиа-каналы Körset привлекают дополнительную аудиторию |

**Стиль карточек:**
- 5 в ряд (десктоп), 2+3 или горизонтальный скролл (мобильный)
- Glass card с иконкой
- Hover: translateY(-4px) + primary glow
- Compact: только иконка + заголовок + 1 строка описания

**CTA:**
- «Подключить магазин» → /retail
- Primary gradient button

---

### 9. ТАРИФЫ — 3 карточки

**Секция id:** #pricing

**Визуал:**
- Eyebrow: «Тарифы»
- Заголовок: «Прозрачная цена — всё включено»
- Субтитр: «Начните с Basic. PRO и Enterprise появятся скоро с расширенными возможностями.»

**3 карточки:**

#### Basic — 15 000 ₸/мес (активен, подсвечен)
- Badge: «Ранняя подписка» (primary bg, white text)
- Список преимуществ:
  - ✓ Подходит ли? — проверка аллергенов, халал, диет
  - ✓ QR-интеграция — покупатель заходит без установки
  - ✓ Каталог товаров — импорт прайса, обновление цен
  - ✓ Аналитика в ₸ — сканы, покрытие, упущенная выручка
  - ✓ Кабинет магазина — дашборд, товары, настройки
  - ✓ ИИ-помощник — ответы на вопросы покупателей
  - ✓ Офлайн-режим — работает без интернета
- Примечание: «Ранняя цена — некоторые функции будут перенесены в PRO»
- CTA: «Подключить магазин» → /retail (primary gradient)

#### PRO — Скоро (заблокирован)
- Badge: «Скоро» (glass bg, text-dim)
- Список:
  - ✓ Всё из Basic
  - ✓ Продвижение через медиа Körset (Instagram, видеоконтент)
  - ✓ Приоритетная поддержка
  - ✓ Расширенная аналитика и отчёты
- CTA: «Уведомить о запуске» (ghost button, disabled visual)

#### Enterprise — Скоро (заблокирован)
- Badge: «Скоро» (glass bg, text-dim)
- Список:
  - ✓ Всё из PRO
  - ✓ Навигация по магазину (для супермаркетов)
  - ✓ Индивидуальные решения и кастомная интеграция
  - ✓ Выделенный менеджер
- CTA: «Связаться» → mailto:founder@korset.app (ghost button)

**Стиль:**
- Basic: active card (border: primary-mid, gradient bg primary-dim → transparent, glow)
- PRO/Enterprise: locked cards (opacity 0.65, muted)
- Заголовок тарифа: Advent Pro 800
- Цена: Advent Pro 800, 32px
- Список: Inter 500, 14px, check icon primary-bright
- 3 колонки (десктоп), стек (мобильный)

---

### 10. FAQ — аккордеон

**Секция id:** #faq (не в навигации)

**5-6 вопросов:**

1. **Нужно ли скачивать приложение?**
   Нет. Körset работает без установки — откройте через QR в магазине или ссылку.

2. **Что если товара нет в базе?**
   Мы добавим его. Такие запросы попадают в очередь, а магазин видит пробелы в каталоге.

3. **Как работает «Подходит ли?»?**
   Вы указываете аллергены, диеты и предпочтения в профиле. При скане товара Körset проверяет состав и даёт понятный ответ.

4. **Можно ли загрузить прайс-лист в кабинет магазина?**
   Да. Поддерживается импорт CSV, XLS и XLSX — цены и наличие обновляются за минуту.

5. **Тариф 15 000 ₸ — это окончательная цена?**
   Это ранняя подписка. Позже появятся PRO и Enterprise с расширенными функциями.

6. **Работает ли Körset без интернета?**
   Да. Каталог магазина кэшируется, а сканы сохраняются и отправятся при подключении.

**Стиль:**
- Clean expand/collapse
- `+` индикатор поворачивается 45° → `×` при открытии
- Открытый элемент: border primary-mid, subtle primary glow
- Вопрос: Advent Pro 800, 15px
- Ответ: Inter 500, 14px, text-sub
- Gap между элементами: 10px

---

### 11. FOOTER

**CTA-блок:**
- «Выберите магазин или подключите свой»
- CTA: «Выбрать магазин» → /stores (primary gradient)

**Grid:**
- Колонка 1: Körset лого + описание + «Made in Kazakhstan 🇰🇿»
- Колонка 2: «Продукт» — Выбрать магазин, Подключить магазин, Политика конфиденциальности
- Колонка 3: «Контакты» — founder@korset.app, @korset.app, Telegram

**Bottom bar:**
- © 2026 Körset
- RU | KZ (язык)

**Стиль:**
- Фон: rgba(7, 7, 15, 0.92) + backdrop-blur
- Border-top: line-soft
- Ссылки: hover → primary-bright

---

## 4. МЕДИА-ЗАГЛУШКИ → ЧТО ГЕНЕРИРОВАТЬ

| Блок | Заглушка (сейчас) | Что генерировать AI | Формат | Размер |
|------|-------------------|---------------------|--------|--------|
| Hero | CSS 3D phone + gradient bg | AI-видео 8-10сек: scan→result flow | WebM+MP4 | <2MB |
| Hero phone | CSS perspective phone | GLB смартфон с UI | GLB | <500KB |
| How it works | Gradient placeholder 200×120 | Короткие видео/слайд-шоу каждого шага | WebM/PNG seq | <500KB each |
| Fit-Check | CSS-анимация результата | Видео результата скана | WebM | <1MB |
| Для кого | Gradient placeholder | AI-фото людей у полки магазина | PNG/WebP | <200KB each |
| Features | Gradient placeholder | Hover slideshow: 2-3 фото на карточку | PNG/WebP | <100KB each |
| Video showcase | CSS animated gradient + play btn | AI-видео 10-15сек: полный product demo | WebM+MP4 | <3MB |
| Retail | Иконки | Фото QR/дашборда/магазина | PNG/WebP | <200KB each |
| Social proof | Круглые placeholder | Логотипы магазинов | SVG/PNG | <50KB each |

---

## 5. 3D: CSS СЕЙЧАС → GLB ПОТОМ

### Уровень 1 (текущий): CSS 3D Phone Mockup

```
CSS perspective + transform:
- .landing-hero__visual { perspective: 1200px }
- .landing-phone-mockup {
    transform: rotateY(-8deg) rotateX(2deg);
    transition: transform 0.6s ease;
  }
- Parallax при скролле: rotateY 0 → 15deg
- Subtle float: translateY 0 → -10px (4s infinite)
- Glow: box-shadow primary-dim
- Reflection: ::after scaleY(-1) opacity(0.1)
```

### Уровень 2 (потом): GLB через Three.js

**Инструкция по генерации:**
1. Сгенерируй изображение смартфона с Körset UI в Midjourney/DALL-E
2. Конвертируй в 3D через Spline (spline.design) — визуальный редактор
   - Или Tripo3D / Meshy.ai — AI-конвертация картинка → GLB
   - Целевой размер: < 500KB
3. Оптимизируй:
   ```bash
   npx @gltf-transform/cli optimize model.glb model-opt.glb
   ```
4. Положи в `public/landing/phone.glb`

**Интеграция (я сделаю в отдельной сессии):**
```bash
npm install three @react-three/fiber @react-three/drei
```
- Компонент `<Hero3D>` с `Suspense` + CSS fallback
- `useGLTF('/landing/phone.glb')`
- `OrbitControls` — drag для вращения
- `autoRotate` — медленное вращение когда не трогают
- `enableZoom={false}` — без зума
- Lazy load: Three.js грузится только на `/`

---

## 6. АНИМАЦИИ И ЭФФЕКТЫ

### Scroll-triggered reveal
- Все секции плавно появляются при скролле
- `animation: landingReveal both; animation-timeline: view(); animation-range: entry 5% cover 24%`
- Fallback для браузеров без `animation-timeline`: IntersectionObserver + class toggle
- `@media (prefers-reduced-motion: reduce)`: все анимации отключены

### Hover micro-interactions
- Карточки: `translateY(-4px)`, border → primary-mid, box-shadow с primary glow
- Кнопки: `translateY(-1px)`, усиление glow
- Иконки навигации: subtle scale(1.05)
- Все transition: 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) — spring-like

### Dynamic word rotation (Hero)
- Каждые 2.5с плавная смена слова
- Старое: opacity 1→0, translateY 0→-20px
- Новое: opacity 0→1, translateY 20px→0
- Duration: 0.4s ease
- CSS transition на span, JS setInterval для переключения

### Count-up (Stats)
- IntersectionObserver: когда секция видна → запуск
- Duration: 1.5s ease-out
- Формат: число с разделителем (7 000, 99%)
- Один раз (не повторяется при повторном скролле)

### CSS Phone parallax
- Scroll event (throttled): rotateY = scrollY * 0.02 (max 15deg)
- Mobile: rotateY = touch/mouse X * 0.03
- Smooth: CSS transition 0.6s ease на transform

### Noise texture overlay
- `::before` на landing-page container
- background-image: SVG noise или CSS gradient имитация
- opacity: 0.28
- mask-image: linear-gradient(fade top → transparent bottom)

---

## 7. НОВЫЕ ЗАВИСИМОСТИ

### Сейчас (Этапы 1-5): 0 новых зависимостей
Всё на чистом CSS + React + IntersectionObserver.

### Потом (GLB интеграция):
- `three` — 3D рендеринг
- `@react-three/fiber` — React обёртка
- `@react-three/drei` — хелперы (OrbitControls, useGLTF)

---

## 8. i18n КЛЮЧИ — НОВЫЕ

Все новые ключи добавляются в `src/locales/ru/home.json` и `src/locales/kz/home.json`.
Префикс: `landing.`

### Новые ключи (полный список):

```json
{
  "landing.nav.how": "Как работает",
  "landing.nav.features": "Возможности",
  "landing.nav.retail": "Магазинам",
  "landing.nav.pricing": "Тарифы",
  "landing.nav.lang": "KZ",

  "landing.hero.rotating.0": "состав",
  "landing.hero.rotating.1": "аллергены",
  "landing.hero.rotating.2": "халал",
  "landing.hero.rotating.3": "цену",
  "landing.hero.rotating.4": "КБЖУ",
  "landing.hero.rotating.5": "подходит ли тебе",
  "landing.hero.titlePrefix": "Узнай",
  "landing.hero.subtitle": "Наведи камеру на штрихкод — Körset покажет всё за секунду",
  "landing.hero.cta.primary": "Выбрать магазин",
  "landing.hero.cta.secondary": "Как работает",
  "landing.hero.proof": "Уже в магазинах Казахстана",

  "landing.how.eyebrow": "Как работает",
  "landing.how.title": "Три шага — и ты знаешь всё",
  "landing.how.text": "Körset работает прямо у полки, без установки",
  "landing.how.steps.0.title": "Открой магазин",
  "landing.how.steps.0.text": "Выбери магазин из списка или наведи на QR у входа",
  "landing.how.steps.1.title": "Сканируй товар",
  "landing.how.steps.1.text": "Наведи камеру на штрихкод — карточка появится мгновенно",
  "landing.how.steps.2.title": "Узнай, подходит ли",
  "landing.how.steps.2.text": "Аллергены, халал, КБЖУ — понятный ответ за секунду",

  "landing.fit.eyebrow": "Результат скана",
  "landing.fit.title": "Не просто состав — понятный ответ",
  "landing.fit.text": "Körset объясняет причину, а не заставляет разбираться в этикетке",
  "landing.fit.cards.0.title": "Подходит",
  "landing.fit.cards.0.text": "Товар не конфликтует с вашим профилем и ограничениями",
  "landing.fit.cards.1.title": "Осторожно",
  "landing.fit.cards.1.text": "Есть спорные ингредиенты, следы аллергенов или неясный халал",
  "landing.fit.cards.2.title": "Не подходит",
  "landing.fit.cards.2.text": "Критичный аллерген или явное ограничение подсвечено сразу",
  "landing.fit.alternatives": "Не подошёл? Увидишь подходящие товары из того же магазина",
  "landing.fit.disclaimer": "Körset помогает ориентироваться, но критичные аллергены всегда проверяйте на упаковке",

  "landing.audience.eyebrow": "Для кого",
  "landing.audience.title": "Полезно тем, кто выбирает внимательнее",
  "landing.audience.text": "Без перегруза: главное видно сразу, детали — по мере необходимости",
  "landing.audience.cards.0.title": "Аллергии",
  "landing.audience.cards.0.text": "Молоко, орехи, глютен и ещё 11 типов ограничений",
  "landing.audience.cards.1.title": "Халал",
  "landing.audience.cards.1.text": "Подсказки по ингредиентам и спорным добавкам",
  "landing.audience.cards.2.title": "Диеты",
  "landing.audience.cards.2.text": "Сахар, КБЖУ, веган, кето и подходящие альтернативы",
  "landing.audience.cards.3.title": "Семья",
  "landing.audience.cards.3.text": "Быстрее выбрать продукт без лишнего риска для близких",

  "landing.features.eyebrow": "Возможности",
  "landing.features.title": "Всё важное — в одном приложении",
  "landing.features.text": "От скана до ИИ-вопроса — без переключения между программами",
  "landing.features.cards.0.title": "Подходит ли?",
  "landing.features.cards.0.text": "Проверка аллергенов, халал, диет — понятный ответ",
  "landing.features.cards.1.title": "Состав и КБЖУ",
  "landing.features.cards.1.text": "Ингредиенты, Е-добавки, калории — всё на одном экране",
  "landing.features.cards.2.title": "Альтернативы",
  "landing.features.cards.2.text": "Не подошёл — увидишь подходящие товары из того же магазина",
  "landing.features.cards.3.title": "Сравнение",
  "landing.features.cards.3.text": "Два товара рядом: состав, цена, КБЖУ, вердикт",
  "landing.features.cards.4.title": "ИИ-помощник",
  "landing.features.cards.4.text": "Спроси про состав, замену или рецепт — ответит мгновенно",
  "landing.features.cards.5.title": "Без установки",
  "landing.features.cards.5.text": "Открой через QR — работай сразу. Работает офлайн",

  "landing.stats.0.value": "7 000+",
  "landing.stats.0.label": "товаров в базе",
  "landing.stats.1.value": "99%",
  "landing.stats.1.label": "реальных штрихкодов",
  "landing.stats.2.value": "88%",
  "landing.stats.2.label": "товаров с составом",
  "landing.stats.3.value": "2",
  "landing.stats.3.label": "языка: русский и казахский",

  "landing.showcase.title": "Посмотрите, как работает Körset",

  "landing.retail.eyebrow": "Körset для магазинов",
  "landing.retail.title": "Покупателю проще выбрать — магазину проще возвращать его снова",
  "landing.retail.text": "Körset превращает обычную полку в цифровой сервис: покупатель получает пользу, а магазин — лояльность и понимание спроса",
  "landing.retail.cta": "Подключить магазин",
  "landing.retail.cards.0.title": "QR на полке",
  "landing.retail.cards.0.text": "Покупатель сканирует товары без установки — открывает по QR",
  "landing.retail.cards.1.title": "Каталог и цены",
  "landing.retail.cards.1.text": "Импорт прайса из Excel, обновление цен и наличия за минуту",
  "landing.retail.cards.2.title": "Аналитика в ₸",
  "landing.retail.cards.2.text": "Сканы, покрытие каталога, упущенная выручка — всё в кабинете",
  "landing.retail.cards.3.title": "Кабинет магазина",
  "landing.retail.cards.3.text": "Личный дашборд: товары, импорт, настройки, QR-коды",
  "landing.retail.cards.4.title": "Продвижение",
  "landing.retail.cards.4.text": "Instagram и медиа-каналы Körset привлекают дополнительную аудиторию",

  "landing.pricing.eyebrow": "Тарифы",
  "landing.pricing.title": "Прозрачная цена — всё включено",
  "landing.pricing.text": "Начните с Basic. PRO и Enterprise появятся скоро с расширенными возможностями.",
  "landing.pricing.basic.badge": "Ранняя подписка",
  "landing.pricing.basic.title": "Basic",
  "landing.pricing.basic.price": "15 000 ₸/мес",
  "landing.pricing.basic.feat.0": "Подходит ли? — проверка аллергенов, халал, диет",
  "landing.pricing.basic.feat.1": "QR-интеграция — покупатель заходит без установки",
  "landing.pricing.basic.feat.2": "Каталог товаров — импорт прайса, обновление цен",
  "landing.pricing.basic.feat.3": "Аналитика в ₸ — сканы, покрытие, упущенная выручка",
  "landing.pricing.basic.feat.4": "Кабинет магазина — дашборд, товары, настройки",
  "landing.pricing.basic.feat.5": "ИИ-помощник — ответы на вопросы покупателей",
  "landing.pricing.basic.feat.6": "Офлайн-режим — работает без интернета",
  "landing.pricing.basic.note": "Ранняя цена — некоторые функции будут перенесены в PRO",
  "landing.pricing.pro.badge": "Скоро",
  "landing.pricing.pro.title": "PRO",
  "landing.pricing.pro.feat.0": "Всё из Basic",
  "landing.pricing.pro.feat.1": "Продвижение через медиа Körset",
  "landing.pricing.pro.feat.2": "Приоритетная поддержка",
  "landing.pricing.pro.feat.3": "Расширенная аналитика и отчёты",
  "landing.pricing.pro.cta": "Уведомить о запуске",
  "landing.pricing.enterprise.badge": "Скоро",
  "landing.pricing.enterprise.title": "Enterprise",
  "landing.pricing.enterprise.feat.0": "Всё из PRO",
  "landing.pricing.enterprise.feat.1": "Навигация по магазину",
  "landing.pricing.enterprise.feat.2": "Индивидуальные решения и интеграция",
  "landing.pricing.enterprise.feat.3": "Выделенный менеджер",
  "landing.pricing.enterprise.cta": "Связаться",

  "landing.faq.eyebrow": "FAQ",
  "landing.faq.title": "Коротко о важном",
  "landing.faq.items.0.q": "Нужно ли скачивать приложение?",
  "landing.faq.items.0.a": "Нет. Körset работает без установки — откройте через QR в магазине или ссылку.",
  "landing.faq.items.1.q": "Что если товара нет в базе?",
  "landing.faq.items.1.a": "Мы добавим его. Такие запросы попадают в очередь, а магазин видит пробелы в каталоге.",
  "landing.faq.items.2.q": "Как работает «Подходит ли»?",
  "landing.faq.items.2.a": "Вы указываете аллергены, диеты и предпочтения в профиле. При скане товара Körset проверяет состав и даёт понятный ответ.",
  "landing.faq.items.3.q": "Можно ли загрузить прайс-лист в кабинет магазина?",
  "landing.faq.items.3.a": "Да. Поддерживается импорт CSV, XLS и XLSX — цены и наличие обновляются за минуту.",
  "landing.faq.items.4.q": "Тариф 15 000 ₸ — это окончательная цена?",
  "landing.faq.items.4.a": "Это ранняя подписка. Позже появятся PRO и Enterprise с расширенными функциями.",
  "landing.faq.items.5.q": "Работает ли Körset без интернета?",
  "landing.faq.items.5.a": "Да. Каталог магазина кэшируется, а сканы сохраняются и отправятся при подключении.",

  "landing.footer.title": "Выберите магазин или подключите свой",
  "landing.footer.text": "Körset — ИИ-помощник у полки для покупателей и цифровой слой для продуктовых магазинов Казахстана.",
  "landing.footer.made": "Made in Kazakhstan",
  "landing.footer.copyright": "© 2026 Körset",
  "landing.footer.groups.0.title": "Продукт",
  "landing.footer.groups.0.links.0.label": "Выбрать магазин",
  "landing.footer.groups.0.links.0.href": "/stores",
  "landing.footer.groups.0.links.1.label": "Подключить магазин",
  "landing.footer.groups.0.links.1.href": "/retail",
  "landing.footer.groups.0.links.2.label": "Политика конфиденциальности",
  "landing.footer.groups.0.links.2.href": "/privacy-policy",
  "landing.footer.groups.1.title": "Контакты",
  "landing.footer.groups.1.links.0.label": "founder@korset.app",
  "landing.footer.groups.1.links.0.href": "mailto:founder@korset.app",
  "landing.footer.groups.1.links.1.label": "@korset.app",
  "landing.footer.groups.1.links.1.href": "https://instagram.com/korset.app",
  "landing.footer.groups.1.links.2.label": "Telegram",
  "landing.footer.groups.1.links.2.href": "https://t.me/korset_app"
}
```

### KZ эквиваленты — аналогичная структура с казахскими переводами
(будут добавлены при реализации)

---

## 9. ЧТО УБРАТЬ ИЗ ТЕКУЩЕГО ЛЕНДИНГА

- ❌ Кинетическое стекло (3 вращающиеся панели)
- ❌ Рука с пальцами (CSS-арт)
- ❌ Shelf product (CSS-арт упаковки)
- ❌ Barcode визуализации (CSS-арт штрихкодов)
- ❌ Тема-переключатель (только тёмная тема)
- ❌ Compare секция «Без/С Körset» (слабая, заменена на Fit-Check demo)
- ❌ Retail Dashboard preview (громоздкий, заменён на 5 compact карточек)
- ❌ Connect секция (Заявка→Прайс→QR→Запуск — слишком детально для лендинга)
- ❌ Все `:root[data-theme='light']` правила из LandingScreen.css

---

## 10. ЭТАПЫ РЕАЛИЗАЦИИ

### Этап 1: FOUNDATION — Header + Hero + Social Proof
**Цель:** Определить визуальный язык всего лендинга

**Что делаем:**
- Новый sticky header с навигацией (десктоп + мобильный гамбургер)
- Hero секция с ротирующимся заголовком
- CSS 3D phone mockup
- Social proof bar
- Базовый CSS: gradient backgrounds, noise overlay, glass cards
- Удаление старого hero (кинетическое стекло, рука, штрихкоды)
- Удаление theme toggle

**Файлы:**
- `src/screens/LandingScreen.jsx` — переписать hero + header
- `src/screens/LandingScreen.css` — переписать с нуля
- `src/locales/ru/home.json` — добавить hero/nav ключи
- `src/locales/kz/home.json` — добавить hero/nav ключи

**Результат:** Hero выглядит как у премиального бренда, навигация работает

---

### Этап 2: CONTENT — How it works + Fit-Check + Для кого
**Цель:** Основной storytelling контент

**Что делаем:**
- How it works (3 шага с номерами)
- Fit-Check demo (3 карточки + альтернативы + disclaimer)
- Для кого (4 карточки)
- Hover micro-interactions на всех карточках
- Scroll-triggered reveal анимации

**Файлы:**
- `src/screens/LandingScreen.jsx` — добавить секции
- `src/screens/LandingScreen.css` — стили секций
- `src/locales/ru/home.json` — добавить ключи
- `src/locales/kz/home.json` — добавить ключи

**Результат:** Весь storytelling контент на месте

---

### Этап 3: FEATURES + STATS + VIDEO
**Цель:** Демонстрация возможностей + цифры + медиа

**Что делаем:**
- Features grid (2×3, 6 карточек)
- Stats с count-up анимацией
- Video showcase placeholder
- Все media placeholders (gradient placeholders)
- Hover slideshow placeholders на карточках

**Файлы:**
- `src/screens/LandingScreen.jsx` — добавить секции
- `src/screens/LandingScreen.css` — стили
- `src/locales/ru/home.json` — добавить ключи
- `src/locales/kz/home.json` — добавить ключи
- `public/landing/` — создать папку (пока пустая)

**Результат:** Полный контент с заглушками

---

### Этап 4: RETAIL + PRICING + FAQ + FOOTER
**Цель:** Бизнес-секции + закрытие

**Что делаем:**
- Retail секция (5 карточек)
- Pricing (3 тарифа: Basic заполнен, PRO/Enterprise «скоро»)
- FAQ (6 вопросов, аккордеон)
- Footer (CTA + ссылки + KZ)
- Удаление старых секций (compare, connect, old retail dashboard)

**Файлы:**
- `src/screens/LandingScreen.jsx` — добавить секции, убрать старые
- `src/screens/LandingScreen.css` — стили
- `src/locales/ru/home.json` — добавить ключи
- `src/locales/kz/home.json` — добавить ключи

**Результат:** Полный лендинг со всеми секциями

---

### Этап 5: POLISH + VERIFY
**Цель:** Финальная полировка и верификация

**Что делаем:**
- Cross-check: все 12 секций на месте, все i18n ключи RU+KZ
- `npm run build` — 0 errors
- `npm run lint` — 0 errors
- `node scripts/check-i18n.mjs` — pass
- Мобильный viewport: проверить на 375px
- Десктоп viewport: проверить на 1440px
- Удалить все `:root[data-theme='light']` из LandingScreen.css
- Проверить навигацию (smooth scroll, active state)
- Проверить count-up анимацию
- Проверить ротирующийся заголовок
- Проверить FAQ аккордеон
- Обновить CONTEXT.md
- Запустить vault-embed
- Push → Vercel deploy

**Результат:** Продакшн-ready лендинг

---

## 11. ЗАМЕТКИ ДЛЯ БУДУЩИХ СЕССИЙ

- [ ] StoresScreen — доработать дизайн (записано)
- [ ] Добавить 2-3 магазина перед запуском (записано)
- [ ] GLB 3D phone — генерация через Spline + интеграция Three.js
- [ ] AI-видео для hero: 8-10сек scan→result
- [ ] AI-видео для showcase: 10-15сек product demo
- [ ] Hover slideshow изображения для Features/How/Audience
- [ ] Social proof логотипы магазинов
- [ ] Продвижение в PRO тарифе: Instagram + медиа Körset
- [ ] Enterprise: навигация по магазину + кастомная интеграция
