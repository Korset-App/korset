# 2026-05-05 — Auth Strategy Discovery

> Связи: [[auth-system]] · [[auth-flow]]

## Context

User wants a professional auth audit before implementation, not just a surface password reset change. The target product is a mobile-first PWA for Kazakhstan grocery stores and shoppers.

## Current Direction

- Remove Apple registration for V1.
- Remove classic SMS as a primary channel if cost is too high.
- Explore WhatsApp phone OTP because Kazakhstan coverage is strong.
- Do not add Telegram auth for now to avoid channel sprawl.
- Treat WebAuthn/Passkeys as likely post-V1 unless the auth foundation is already stable.

## Key Product Questions

- Is WhatsApp login mandatory, or should it be an optional alternative to Google/email?
- What fallback should exist if a user has no WhatsApp access or OTP delivery fails?
- Should buyers and store owners use the same auth methods?
- Should phone become a primary identity field, or just a verification/recovery factor?
- How should duplicate accounts be handled when the same person signs in with Google and later phone OTP?

## Technical Notes

- Supabase supports phone OTP with SMS/WhatsApp channels; WhatsApp support depends on supported providers such as Twilio/Twilio Verify or a Send SMS Hook.
- Password reset needs a full recovery flow: request screen, redirect route, recovery session handling, new password screen, expired/invalid link handling, no account enumeration, rate limiting, and RU/KZ copy.
- Any auth work must review RLS assumptions and avoid using user-editable metadata for authorization.

