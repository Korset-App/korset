---
domain: changelog
subdomain: auth
status: active
updated: 2026-05-06
---

# 2026-05-06 - Auth Deep Audit, Cleanup & Polish (Complete)

## Summary

Comprehensive auth system overhaul: 9 critical fixes, 14 UX improvements, 50-point audit with 11 bug fixes, DRY refactoring into 5 shared components, auth logic extraction + unit tests, OTP paste fix, 3 branded email templates, Supabase Dashboard verification.

## What Changed

### Phase 1: 9 Critical Fixes
- OTP form disappearing when 6 digits entered
- i18n `{phone}` typo in auth.json
- Double redirect after signup verify
- Autocomplete attributes on inputs
- OTP paste from clipboard
- Resend via `auth.resend()` for signup type
- Loading spinner during verify
- Google users skipping profile setup

### Phase 2: 14 UX Improvements
- Same-as-old password rejection
- Auto-create account hint text
- "Change email" button on OTP step
- Auto-submit OTP when 6 digits entered
- Auto-focus first OTP input
- Errors clear on input change
- Removed `t` from useEffect deps
- Resend button with 60s cooldown
- aria-label on OTP inputs
- role=alert/status on messages
- Back button navigates to /
- Invalid phone error (for future)
- Deep link ?mode=register
- Default mode = register

### Deep Audit: 50 Findings → 11 Fixes
- `handleResendOtp` loading deadlock
- Auto-submit OTP `e?.preventDefault()` crash
- All dead phone code removed (formatKzPhone, normalizeKzPhone, handlePhoneOtp, etc.)
- 18 dead i18n keys removed (RU+KZ)
- Hardcoded rgba → CSS variables everywhere
- `placeholder="Email"` × 3 → `t('auth.emailPlaceholder')`
- UpdatePasswordScreen: untranslated key → immediate translation, lazy useEffect removed
- KZ `verifySub` missing `{email}` — fixed
- Back button aria-label in UpdatePasswordScreen
- Error comparison via `t()` → `errorKey` state
- OTP `pattern="[0-9]*"` for iOS + `e.clipboardData`

### Phase 2 DRY Refactoring
- 5 shared components: AuthBackground, PasswordRules, AuthAlert, GoogleLogo, EyeBtn
- Auth keyframes + `.auth-input` moved to `index.css` (0 inline `<style>`)
- New CSS variables: `--success-glow` (dark + light themes)
- AccountScreen: hardcoded colors → CSS vars, navigate-in-render → useEffect, modals → role="dialog"
- SetupProfileScreen: hardcoded colors → CSS vars, `alert()` → `profileError` state
- EyeBtn: aria-label → i18n (`auth.hidePassword`/`auth.showPassword`), prop `t` added
- Loading `'...'` → `t('common.loading')` (6 buttons)
- Email validation: `length > 3` → `isValidEmail()` regex

### Auth Logic Extraction + Tests
- Created `src/utils/authHelpers.js`: localizeError, validatePassword, isValidEmail
- Created `tests/unit/authHelpers.test.mjs`: 9/9 pass

### OTP Paste Fix
- `onPaste` handler now on ALL 6 inputs (was only on first)
- Paste works from any focused input

### Email Templates
- 3 branded templates in `docs/vault/architecture/supabase-email-templates.md`
- Confirm signup, Magic link, Reset password
- Lavender glow OTP box, gradient purple button, Körset branding
- Need manual insertion into Supabase Dashboard → Auth → Email Templates

### Supabase Dashboard Verification
- Site URL: `https://korset.app` ✅
- Redirect URLs: `https://korset.app/**`, `http://localhost:5173/**` ✅
- Providers: Email ON, Google ON, Phone ON (no UI) ✅

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| AuthScreen lines | ~1414 | ~1060 |
| UpdatePasswordScreen lines | ~520 | ~339 |
| i18n auth keys | 75 | 59 |
| Dead code items | ~30 | 0 |
| Hardcoded colors | ~15 | 0 |
| Inline `<style>` blocks | 3 | 0 |
| Shared components | 0 | 5 |
| Unit tests | 0 | 9 |
| Lint errors | 0 | 0 |
| Lint warnings | ~50 | ~50 (pre-existing) |

## Files Changed

### Modified
- `src/screens/AuthScreen.jsx` — major refactor
- `src/screens/UpdatePasswordScreen.jsx` — major refactor
- `src/screens/AccountScreen.jsx` — CSS vars, a11y
- `src/screens/SetupProfileScreen.jsx` — CSS vars, error state
- `src/index.css` — auth keyframes, CSS variables
- `src/locales/ru/auth.json` — 59 keys
- `src/locales/kz/auth.json` — 59 keys
- `src/locales/ru/common.json` — `common.loading`
- `src/locales/kz/common.json` — `common.loading`
- `src/locales/ru/profile.json` — `profileSetup.saveError`
- `src/locales/kz/profile.json` — `profileSetup.saveError`
- `docs/CONTEXT.md` — updated

### Created
- `src/components/AuthBackground.jsx`
- `src/components/PasswordRules.jsx`
- `src/components/AuthAlert.jsx`
- `src/components/GoogleLogo.jsx`
- `src/components/EyeBtn.jsx`
- `src/utils/authHelpers.js`
- `tests/unit/authHelpers.test.mjs`
- `docs/vault/architecture/supabase-email-templates.md`

### Updated (vault)
- `docs/vault/architecture/auth-system.md` — full rewrite

## Remaining Manual Steps

1. Insert 3 email templates into Supabase Dashboard → Authentication → Email Templates
2. Verify SMTP Settings shows custom Resend (not Supabase default)

## Decisions

- WhatsApp OTP → V2: Code fully removed; rewrite from scratch in V2 is acceptable
- Email OTP uses `shouldCreateUser: true` for auto-registration
- Default auth mode = register (not login)
- `errorKey` stored separately from `error` text for reliable comparison across language switches
- Email regex `/^.+@.+\..+$/` intentionally loose — strict client-side regex rejects valid emails; Supabase validates server-side
- `isValidEmail`, `validatePassword`, `localizeError` extracted for testability
- Phone provider stays ON in Dashboard (no UI, no harm, future-ready)
