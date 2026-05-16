# Fix: Profile edit/setup layout stability + upload tile visibility

**Date:** 2026-05-17
**Scope:** ProfileEditScreen, SetupProfileScreen (step 2), ProfileAvatar component
**Issues fixed:**

## 1. Layout jumps on avatar/banner selection
**Root cause:** Border width changed from 1px to 2px on selection, causing element size to grow by 2px per side and shifting grid siblings.
**Fix:** Replaced dynamic border width with fixed `border: 2px solid` everywhere. Selection now changes only `borderColor` (via transition on `border-color`). This makes elements stay the exact same pixel size in both states — no grid reflow, no visual jumps.

**Files:**
- `src/screens/ProfileEditScreen.jsx` — avatar upload tile, avatar preset wrappers, banner upload tile, banner preset wrappers
- `src/screens/SetupProfileScreen.jsx` — `AvatarChoice` component, `BannerChoice` component, avatar upload tile, banner upload tile

## 2. Avatar image corners sticking out of wrapper
**Root cause:** `ProfileAvatar` with `rounded='square'` used `borderRadius: 22`, but outer wrapper used `borderRadius: 18` (ProfileEditScreen) and `20` (SetupProfileScreen).
**Fix:** Changed `ProfileAvatar.jsx` square radius from 22 → 18 to match the tightest outer wrapper. SetupProfileScreen `AvatarChoice` wrapper changed from 20 → 18 for consistency.

## 3. Avatar grid too small on phone
**Root cause:** `gridTemplateColumns: 'repeat(5, minmax(0, 1fr))'` in SetupProfileScreen made each avatar ~62px on a 390px phone.
**Fix:** Changed to `repeat(4, minmax(0, 1fr))` with `gap: 12` — avatars now ~78px each, much more legible. ProfileEditScreen increased `minmax(72px, 1fr)` → `minmax(88px, 1fr)`.

## 4. Upload tile invisible in light theme
**Root cause:** `background: var(--glass-subtle)` (44% white) on white card background in light theme made upload tile nearly invisible. Text color `var(--text-soft)` was also too faint.
**Fix:** Changed upload tile backgrounds to `var(--primary-dim)` (tinted purple, visible in both themes). Changed border/text colors to `var(--primary-bright)` for contrast. Font size bumped from 11px → 12px. Applied to both avatar and banner upload tiles in both screens.

## Verification
- `npm run build` — ✅
- `npm run test:unit` — ✅ (245/245)
- `npm run lint` — ✅ (0 new errors/warnings)
- Playwright smoke test — layout stable before/after clicks, upload tiles clearly visible

## Changed files
- `src/components/ProfileAvatar.jsx`
- `src/screens/ProfileEditScreen.jsx`
- `src/screens/SetupProfileScreen.jsx`
