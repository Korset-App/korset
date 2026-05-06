---
domain: architecture
subdomain: auth
status: active
updated: 2026-05-06
---

# Auth System Architecture

## Overview

Körset uses Supabase Auth with email-based sign-in methods. Phone/WhatsApp removed from V1.

## Sign-in Methods

| Method | Implementation | Cost | Status |
|--------|---------------|------|--------|
| Email + Password | `signInWithPassword` / `signUp` | Free | Active |
| Email OTP | `signInWithOtp({ email })` | Free (Resend 100/day) | Active |
| Google OAuth | `signInWithOAuth({ provider: 'google' })` | Free | Active |
| Phone provider | Supabase Phone enabled | — | Dashboard ON, no UI (V2) |
| WhatsApp OTP | — | — | Removed (V2 rewrite) |
| Apple Sign-In | — | $99/yr | Deferred |
| WebAuthn/Passkeys | — | Free | Deferred to V2 |

## Key Files

- `src/screens/AuthScreen.jsx` — Main auth screen, 2 tabs: password / email code
- `src/screens/UpdatePasswordScreen.jsx` — Password reset completion
- `src/contexts/AuthContext.jsx` — Auth state, session, profile_setup_done
- `src/components/AuthBackground.jsx` — Decorative spheres (shared)
- `src/components/PasswordRules.jsx` — 3 password rules (shared)
- `src/components/AuthAlert.jsx` — Error/success boxes (shared)
- `src/components/GoogleLogo.jsx` — Multi-color Google SVG
- `src/components/EyeBtn.jsx` — Show/hide password with i18n
- `src/utils/authHelpers.js` — Pure functions: localizeError, validatePassword, isValidEmail
- `src/utils/authFlow.js` — returnTo/normalizeReturnTo helpers
- `tests/unit/authHelpers.test.mjs` — 9 unit tests
- `src/locales/{ru,kz}/auth.json` — 59 i18n keys each

## Auth Flows

### Email + Password
1. User enters email + password
2. `signUp()` → OTP email → `verifyOtp({ type: 'signup' })` → `/setup-profile`
3. `signInWithPassword()` → check `profile_setup_done` → redirect

### Email OTP (Passwordless)
1. User enters email on "Код" tab
2. `signInWithOtp({ email, shouldCreateUser: true })` → 6-digit code sent
3. User enters code in 6 separate inputs → `verifyOtp({ type: 'email' })`
4. Auto-creates account if new user → `/setup-profile`

### OTP Paste
- `onPaste` handler on ALL 6 inputs (not just first)
- Extracts digits from clipboard, fills all 6 positions
- Auto-submits when 6 digits entered
- `pattern="[0-9]"` for iOS numeric keyboard

### Resend OTP
- Signup type: `auth.resend({ type: 'signup', email })`
- Email type: `signInWithOtp()` re-send
- 60-second cooldown between resends

### Google OAuth
1. `signInWithOAuth({ provider: 'google' })` → popup
2. If `full_name` + `picture` from Google → `profile_setup_done: true` auto
3. 30s timeout prevents infinite spinner if popup hangs

### Password Reset
1. User clicks "Забыли пароль?" → enters email
2. `resetPasswordForEmail()` sends `{{ .ConfirmationURL }}` link
3. Link → `/update-password` → detects recovery session
4. `updateUser({ password })` → auto-login → redirect

## Error Handling

- `localizeError(message)` returns `{ text, key }` — key stored separately for reliable comparison
- Known error keys mapped to i18n strings in auth.json
- Case-insensitive matching, provider detection ("already registered" → "use Google")
- `errorKey` state prevents stale comparisons after language switch

## Email Templates

3 branded templates in `docs/vault/architecture/supabase-email-templates.md`:
- **Confirm signup**: 6-digit OTP, lavender glow box, `{{ .Token }}`
- **Magic link**: same layout, text = "Ваш код для входа"
- **Reset password**: gradient purple button, `{{ .ConfirmationURL }}`, fallback text link

Insert into: Supabase Dashboard → Authentication → Email Templates

## Supabase Dashboard Configuration

- Site URL: `https://korset.app`
- Redirect URLs: `https://korset.app/**`, `http://localhost:5173/**`
- Providers: Email ON, Google ON (Client ID/Secret configured), Phone ON (no UI yet)
- SMTP: Resend custom SMTP configured and verified for korset.app

## Security Notes

- `app_metadata.is_admin` for admin detection (NOT user_metadata)
- RLS on all tables, JWT auth on API
- No account enumeration: generic error messages
- `shouldCreateUser: true` for OTP flows
- Password validation: 8+ chars, uppercase, lowercase, digit
- Same-as-old password rejection on update
- `errorKey` state prevents leaking raw Supabase messages

## Removed in This Workstream

- Phone tab, `formatKzPhone`, `normalizeKzPhone`, `handlePhoneOtp`, `phoneInputStyle`, `phoneRaw`
- 18 dead i18n keys (RU+KZ) related to phone/SMS
- Hardcoded rgba colors → CSS variables
- Inline `<style>` blocks → index.css
- `alert()` calls → inline error state
- `window.clipboardData` → `e.clipboardData`
- 5 shared components extracted from duplicate code
