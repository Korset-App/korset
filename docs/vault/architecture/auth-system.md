# Auth System Architecture

> Last updated: 2026-05-05

## Overview

Körset uses Supabase Auth with multiple sign-in methods for maximum coverage in Kazakhstan.

## Sign-in Methods

| Method | Implementation | Cost | Status |
|--------|---------------|------|--------|
| Email + Password | `signInWithPassword` | Free | Active |
| Email OTP | `signInWithOtp({ email })` | Free (Resend 100/day) | Active |
| Google OAuth | `signInWithOAuth({ provider: 'google' })` | Free | Active |
| WhatsApp OTP | `signInWithOtp({ phone, channel: 'whatsapp' })` | ~$0.005/msg (Twilio) | Active (needs Twilio setup) |
| Apple Sign-In | N/A | $99/yr Apple Developer | Deferred |
| WebAuthn/Passkeys | N/A | Free (custom implementation) | Deferred to V2 |

## Key Files

- `src/screens/AuthScreen.jsx` — Main auth screen with 3 tabs
- `src/screens/UpdatePasswordScreen.jsx` — Password reset completion
- `src/contexts/AuthContext.jsx` — Auth state, session, profile
- `src/components/AuthPromptModal.jsx` — Guest prompt modal
- `src/utils/authFlow.js` — returnTo helpers
- `src/locales/{ru,kz}/auth.json` — 68 i18n keys

## Auth Flow

### Email + Password
1. User enters email + password
2. `supabase.auth.signInWithPassword()` or `signUp()`
3. SignUp → OTP email verification → `verifyOtp({ type: 'signup' })`
4. After signup verify → navigate directly to `/setup-profile` (not double redirect)
5. First login → `profile_setup_done !== true` → redirect to `/setup-profile`

### Email OTP (Passwordless)
1. User enters email
2. `supabase.auth.signInWithOtp({ email, shouldCreateUser: true })`
3. 6-digit code sent to email
4. User enters code (or pastes full 6-digit code) → `verifyOtp({ type: 'email' })`
5. Auto-creates account if new user

### Resend OTP
- For signup type: `supabase.auth.resend({ type: 'signup', email })` — NOT signInWithOtp
- For email type: `handleEmailOtp()` — re-sends via signInWithOtp
- For sms type: `handlePhoneOtp()` — re-sends via signInWithOtp
- 60-second cooldown between resends

### WhatsApp OTP
1. User enters KZ phone number (+7XXXXXXXXXX)
2. Phone normalized via `normalizeKzPhone()`
3. `supabase.auth.signInWithOtp({ phone, channel: 'whatsapp', shouldCreateUser: true })`
4. Requires Twilio provider + WhatsApp Business verification in Supabase Dashboard
5. 6-digit code sent via WhatsApp
6. `verifyOtp({ type: 'sms' })`

### Password Reset
1. User clicks "Forgot password?" → enters email
2. `resetPasswordForEmail()` sends link → redirectTo: `/update-password`
3. User clicks link → UpdatePasswordScreen detects recovery session
4. `updateUser({ password })` → auto-login → redirect

## Account Linking

Supabase auto-links identities with same verified email.
If user signed in via Google (gmail.com) and tries Email OTP on same email → auto-merged.

`linkIdentity()` used in AccountScreen to add Google to existing email-only account.

## KZ Phone Normalization

- `87012345678` → `+77012345678`
- `7701234567` → `+7701234567`
- `7012345678` → `+77012345678`
- Visual mask: `+7 XXX XXX XXXX`

## Rate Limits

- Email OTP: 60-second cooldown between sends (client-side)
- Supabase: default rate limits apply (can configure in Dashboard)
- Resend free tier: 100 emails/day, 3/minute per user

## Security Notes

- `app_metadata.is_admin` for admin detection (NOT user_metadata)
- RLS on all tables, JWT auth on API
- No account enumeration: generic error messages
- `shouldCreateUser: true` for OTP flows (auto-registration)
