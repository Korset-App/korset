# Landing V3 — Этапы 1-2 (Сессия 8)

> **Дата:** 2026-05-05
> **Статус:** Завершено — Этапы 0, 1, 2 из 7
> **Следующее:** Этап 3 — How + Fit-Check секции
> Связи: [[landing-v3-full-rebuild]] · [[landing-v3-prompt]]

---

## КОНТЕКСТ ЗАДАЧИ

Полный ребилд лендинга с нуля. Референс — Shopify.com.
Цель: насыщенный, полноценный лендинг с видео, 3D мокапами, реальными фото.
Все фото/видео — stock заглушки (Unsplash/Mixkit), владелец заменит на реальные позже.
Все 3D модели сейчас — CSS мокапы, GLB через Spline добавится позже.

---

## КРИТИЧЕСКИЙ АРХИТЕКТУРНЫЙ БАГ (РЕШЁН)

### Проблема
`LandingScreen` рендерится внутри `HomeScreen` → `<div className="app-frame">` (App.jsx:85).
`index.css` → `.app-frame` имеет:
- `max-width: 430px` — всё выглядело как телефон на ноутбуке
- `overflow: hidden` — нельзя было листать страницу
- `height: 100dvh` — высота жёстко фиксирована

### Решение (без изменения App.jsx/HomeScreen.jsx!)
В `LandingScreen.jsx` — `useEffect` на mount/unmount:
```js
useEffect(() => {
  const frame = document.querySelector('.app-frame')
  if (frame) frame.classList.add('app-frame--landing')
  document.documentElement.classList.add('lp-html-active')
  return () => {
    if (frame) frame.classList.remove('app-frame--landing')
    document.documentElement.classList.remove('lp-html-active')
  }
}, [])
```

В `LandingScreen.css` (самом начале):
```css
.lp-html-active {
  overflow-x: hidden;
}
.app-frame--landing {
  max-width: 100% !important;
  width: 100% !important;
  height: auto !important;
  min-height: 100svh !important;
  overflow: visible !important;
  overflow-x: hidden !important;
  background: transparent !important;
  border: none !important;
  display: block !important;
}
```

### Почему position:fixed для header (не sticky)
`position: sticky` ломается когда любой предок имеет `overflow: hidden/clip`.
Решение: `position: fixed; top:0; left:0; right:0; z-index:60`.
Hero использует `padding-top: calc(var(--lp-header-h) + clamp(48px, 7vw, 96px))`.

---

## ФАЙЛОВАЯ СТРУКТУРА

```
src/screens/
  LandingScreen.jsx        — главный компонент (~290 строк)
  LandingScreen.css        — стили (~1200 строк)
  landing/
    landing-tokens.css     — CSS custom properties (--lp-* namespace)

src/locales/ru/home.json   — RU i18n ключи (prefix: landing.*)
src/locales/kz/home.json   — KZ i18n ключи (prefix: landing.*)
```

---

## ТОКЕНЫ (landing-tokens.css)

Ключевые:
- `--lp-brand: #7c5cff` — primary violet
- `--lp-brand-glow: #a78bfa` — lighter violet for glows/accents
- `--lp-brand-soft: rgba(124,92,255,0.12)` — soft bg for badges
- `--lp-cyan: #22d3ee` — complementary accent
- `--lp-ok: #4ade80` — green success
- `--lp-bg: #09090f` — page background
- `--lp-bg-elevated: #0d0d18` — slightly lighter sections
- `--lp-header-h: 68px`
- `--lp-content-wide: 1380px` — max-width for full sections
- `--lp-page-x: clamp(16px, 5vw, 80px)` — horizontal padding
- `--lp-section-y: clamp(64px, 9vw, 128px)` — vertical section padding

Animations (keyframes в tokens):
- `lp-float` — floating chips (translateY -12px)
- `lp-glow-pulse` — pulsing glow on dots
- `lp-reveal` / `lp-reveal--scale` / `lp-reveal--delay-{1-4}` — scroll reveal

---

## ЭТАП 0: Дизайн-токены ✅

Файл `src/screens/landing/landing-tokens.css` создан.
`useReveal` hook в `src/hooks/useReveal.js` — IntersectionObserver для .lp-reveal элементов.

---

## ЭТАП 1: Header + Hero ✅

### Header
- `position: fixed` (НЕ sticky)
- По умолчанию: прозрачный (поверх видео в hero)
- `.lp-header--scrolled`: `background: rgba(10,10,18,0.7); backdrop-filter: blur(20px)`
- Логотип + навигация + CTA кнопка + hamburger (mobile)
- Mobile overlay menu (`.lp-mobile-menu--open`)

### Hero
- `min-height: 100svh; display:flex; align-items:center`
- **Background video layer** (`lp-hero__bg`):
  ```html
  <video autoPlay muted loop playsInline poster={unsplashUrl}>
    <source src="https://assets.mixkit.co/videos/...supermarket-19406-large.mp4" type="video/mp4" />
  </video>
  ```
  Poster fallback: `https://images.unsplash.com/photo-1567449303183-...`
  CSS: `object-fit:cover; position:absolute; inset:0; animation: lp-hero-bg-drift 20s`
- **Overlay** (`lp-hero__bg-overlay`): единственный gradient — `rgba(7,7,15,0.72→0.28→0.38→0.82)`
- **Content** (`lp-hero__wrap`, z-index:2): pills → h1 → subtitle → actions → tagline

### Hero компоненты JSX
- `HeroRotatingWord` — ротирует слова через CSS transitions (`lp-rotating--in/out`)
- Pills (`lp-pills`) — чипы с точками
- Title: `font-weight: 600`, `font-size: clamp(40px, 7vw, 96px)`
- `lp-hero__title-accent` — rotating word span, `color: var(--lp-brand-glow)`
- Кнопки: primary (solid violet, no gradient) + ghost (white glass)
- Tagline: checkmarks + 3 пункта (Без установки · По QR · В браузере)
- Scroll-cue: мышь с прокруткой внизу

### CSS buttons
```css
.lp-btn--primary {
  background: var(--lp-brand); /* solid, NO gradient */
  box-shadow: 0 8px 28px rgba(124,92,255,0.38), inset 0 1px 0 rgba(255,255,255,0.18);
}
```

---

## ЭТАП 2: Demo-секция + Phone Mockup ✅

### Структура секции
```
id="demo", class="lp-section lp-demo"
.lp-demo__inner — grid 1fr/1fr на ≥1024px
  .lp-demo__copy — badge, h2, p, points, CTA
  .lp-demo__device — DemoPhone компонент
```

### DemoPhone компонент
CSS-only 3D телефон. Никаких внешних библиотек.

**Структура JSX:**
```jsx
<figure className="lp-phone-wrap">
  <div className="lp-phone">         // 3D tilted phone frame
    <div className="lp-phone__notch" />
    <div className="lp-phone__screen">
      <div className="lp-phone__bar" />     // 9:41 + battery icons
      <div className="lp-phone__appbar" />  // Körset logo + scan icon
      <div className="lp-phone__product" /> // 🥛 + name + meta
      <div className="lp-phone__status" />  // ✅ Подходит
      <div className="lp-phone__rows" />    // allergens/halal/kbju
      <div className="lp-phone__scanbeam" /> // animated scan line
    </div>
    <div className="lp-phone__home" />
  </div>
  <div className="lp-phone__glow" />         // violet glow under phone
  <div className="lp-phone__orbit--top" />   // "Fit-Check за секунды" chip
  <div className="lp-phone__orbit--bottom" /> // "Можно спросить AI" chip
</figure>
```

**3D CSS:**
```css
.lp-phone {
  transform: perspective(1100px) rotateY(-16deg) rotateX(5deg);
  transition: transform 700ms cubic-bezier(0.34, 1.26, 0.64, 1);
}
.lp-phone-wrap:hover .lp-phone {
  transform: perspective(1100px) rotateY(-6deg) rotateX(2deg);
}
```

**Scan beam animation:**
```css
@keyframes lp-scanbeam {
  0%   { top: 30%; opacity: 0.9; }
  80%  { top: 72%; opacity: 0.7; }
  90%  { top: 72%; opacity: 0; }
  100% { top: 30%; opacity: 0; }
}
```

### i18n ключи (Demo секция)
Добавлены новые ключи в `ru/home.json` и `kz/home.json`:
```
landing.demo.badge, .title, .desc, .cta
landing.demo.points.0/1/2
landing.demo.allergen, .allergenOk, .halal, .halalOk, .kbju
```
Уже существовавшие (использованы в phone mockup):
```
landing.demo.productName, .productMeta, .status
landing.demo.orbitTop, .orbitBottom, .aria
```
**check-i18n:** PASS, 0 missing KZ, 0 orphan

---

## СЛЕДУЮЩИЙ: ЭТАП 3 — How + Fit-Check

### Секция How (id="how")
3 шага с ЧЕРЕДОВАНИЕМ layout (фото слева/текст → текст/фото → фото/текст):
- Шаг 1: Unsplash фото (человек с телефоном у полки) + текст справа
- Шаг 2: Unsplash фото (штрихкод крупно) + текст слева
- Шаг 3: CSS мокап экрана результата + текст справа

i18n ключи уже есть: `landing.how.eyebrow/title/text/steps.{0,1,2}.{icon,title,text}`

### Секция Fit-Check (id="fit")
3 CSS карточки результатов (хорошо/осторожно/плохо):
- Green: `border-left: 3px solid #4ade80` + ✓ Подходит
- Yellow: `border-left: 3px solid #fbbf24` + ⚠ Осторожно
- Red: `border-left: 3px solid #f87171` + ✗ Не подходит

i18n ключи уже есть: `landing.fit.eyebrow/title/text/cards.{0,1,2}.{tone,icon,title,text}`

---

## ВЕРИФИКАЦИЯ

```bash
npm run build         → EXIT 0
npx eslint src/screens/LandingScreen.jsx → 0 errors, 0 warnings
node scripts/check-i18n.mjs → PASS (0 missing KZ, 0 orphan)
```

---

## QUALITY RULES ДЛЯ ЛЕНДИНГА V3

1. **Только CSS-переменные** — `var(--lp-*)` для всего. rgba() допустимы для статус-цветов.
2. **Mobile-first** — все стили от малого к большому.
3. **prefers-reduced-motion** — все анимации оборачивать.
4. **clamp()** для всех font-size, padding, gap.
5. **`@media (hover: hover)`** — hover только на pointer devices.
6. **Изображения — заглушки** (Unsplash/Mixkit). Владелец заменит позже.
7. **3D мокапы — CSS only** сейчас. GLB через Spline — в будущем.
8. **i18n** — абсолютно все тексты через `t('landing.*')`. check-i18n PASS обязателен.
9. **НЕ трогать** App.jsx, HomeScreen.jsx, index.css (кроме landing-specific правил).
