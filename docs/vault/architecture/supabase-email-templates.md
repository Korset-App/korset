Создано: 2026-05-06
Статус: active
Тип: configuration
Связи: [[auth-system]]

# Supabase Auth Email Templates

Эти шаблоны вставляются в Supabase Dashboard → Authentication → Email Templates.
Используют Go template синтаксис: `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`.

---

## Confirm Signup (Подтверждение регистрации)

Используется когда юзер регистрируется через email+пароль. Supabase отправляет 6-значный OTP.

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Подтверждение регистрации — Körset</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F0F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;background-color:#F0F0F5;">
<tr>
<td align="center" style="padding:48px 12px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;background-color:#FFFFFF;border-radius:28px;box-shadow:0 12px 48px rgba(124,58,237,0.08),0 2px 12px rgba(0,0,0,0.04);overflow:hidden;">

<tr>
<td align="center" style="padding:48px 24px 8px;">
<img src="https://tcvuffoxwavqdexrzwjj.supabase.co/storage/v1/object/public/public-assets/favicon.png" alt="Körset" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:20px;margin:0 auto 16px;">
<h1 style="margin:0;font-size:28px;font-weight:800;color:#0F0F13;letter-spacing:-0.5px;">K&ouml;rset</h1>
<p style="margin:8px 0 0;font-size:14px;color:#71717A;font-weight:500;">Умный выбор продуктов питания</p>
</td>
</tr>

<tr>
<td style="padding:32px 48px 40px;text-align:center;">
<p style="margin:0 0 8px;font-size:17px;color:#27272A;font-weight:600;">Ваш код подтверждения</p>
<p style="margin:0 0 28px;font-size:14px;color:#A1A1AA;">Действителен 1 час</p>
<div style="margin:0 0 32px;background-color:#FAF4FF;border:2px solid #E9D5FF;border-radius:18px;padding:22px 40px;">
<span style="font-size:44px;font-weight:800;color:#7C3AED;letter-spacing:12px;">{{ .Token }}</span>
</div>
<p style="margin:0;font-size:13px;color:#A1A1AA;line-height:1.6;">Если вы не создавали аккаунт на K&ouml;rset — просто проигнорируйте это письмо.<br>Никому не сообщайте этот код.</p>
</td>
</tr>

<tr>
<td align="center" style="padding:24px;background-color:#F8F9FA;border-top:1px solid #F4F4F5;">
<p style="margin:0;font-size:12px;color:#BBBBBB;">&copy; 2026 K&ouml;rset.app &middot; Все права защищены</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>
```

---

## Magic Link (Вход по коду / Email OTP)

Используется когда юзер нажимает «Отправить код» на вкладке «Код» в AuthScreen.
Это повторный вход, НЕ регистрация — текст должен быть другим.

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Код для входа — Körset</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F0F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;background-color:#F0F0F5;">
<tr>
<td align="center" style="padding:48px 12px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;background-color:#FFFFFF;border-radius:28px;box-shadow:0 12px 48px rgba(124,58,237,0.08),0 2px 12px rgba(0,0,0,0.04);overflow:hidden;">

<tr>
<td align="center" style="padding:48px 24px 8px;">
<img src="https://tcvuffoxwavqdexrzwjj.supabase.co/storage/v1/object/public/public-assets/favicon.png" alt="Körset" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:20px;margin:0 auto 16px;">
<h1 style="margin:0;font-size:28px;font-weight:800;color:#0F0F13;letter-spacing:-0.5px;">K&ouml;rset</h1>
<p style="margin:8px 0 0;font-size:14px;color:#71717A;font-weight:500;">Умный выбор продуктов питания</p>
</td>
</tr>

<tr>
<td style="padding:32px 48px 40px;text-align:center;">
<p style="margin:0 0 8px;font-size:17px;color:#27272A;font-weight:600;">Ваш код для входа</p>
<p style="margin:0 0 28px;font-size:14px;color:#A1A1AA;">Действителен 1 час</p>
<div style="margin:0 0 32px;background-color:#FAF4FF;border:2px solid #E9D5FF;border-radius:18px;padding:22px 40px;">
<span style="font-size:44px;font-weight:800;color:#7C3AED;letter-spacing:12px;">{{ .Token }}</span>
</div>
<p style="margin:0;font-size:13px;color:#A1A1AA;line-height:1.6;">Если вы не запрашивали этот код — просто проигнорируйте это письмо.<br>Никому не сообщайте этот код.</p>
</td>
</tr>

<tr>
<td align="center" style="padding:24px;background-color:#F8F9FA;border-top:1px solid #F4F4F5;">
<p style="margin:0;font-size:12px;color:#BBBBBB;">&copy; 2026 K&ouml;rset.app &middot; Все права защищены</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>
```

---

## Reset Password (Сброс пароля)

Используется когда юзер нажимает «Забыли пароль?» в AuthScreen.
Supabase отправляет ссылку с `{{ .ConfirmationURL }}`, NOT token.
Ссылка ведёт на `/update-password` где юзер вводит новый пароль.

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Сброс пароля — Körset</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F0F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;background-color:#F0F0F5;">
<tr>
<td align="center" style="padding:48px 12px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;background-color:#FFFFFF;border-radius:28px;box-shadow:0 12px 48px rgba(124,58,237,0.08),0 2px 12px rgba(0,0,0,0.04);overflow:hidden;">

<tr>
<td align="center" style="padding:48px 24px 8px;">
<img src="https://tcvuffoxwavqdexrzwjj.supabase.co/storage/v1/object/public/public-assets/favicon.png" alt="Körset" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:20px;margin:0 auto 16px;">
<h1 style="margin:0;font-size:28px;font-weight:800;color:#0F0F13;letter-spacing:-0.5px;">K&ouml;rset</h1>
<p style="margin:8px 0 0;font-size:14px;color:#71717A;font-weight:500;">Умный выбор продуктов питания</p>
</td>
</tr>

<tr>
<td style="padding:32px 48px 40px;text-align:center;">
<p style="margin:0 0 24px;font-size:16px;color:#52525B;line-height:1.6;">Вы запросили сброс пароля для вашего аккаунта K&ouml;rset.</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 32px;">
<tr>
<td align="center">
<a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:16px 44px;background:linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%);border-radius:14px;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 16px rgba(124,58,237,0.3);">Сбросить пароль</a>
</td>
</tr>
</table>
<p style="margin:0;font-size:13px;color:#A1A1AA;line-height:1.6;">Ссылка действительна 1 час. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.</p>
<hr style="margin:24px 0;border:none;border-top:1px solid #F4F4F5;">
<p style="margin:0;font-size:12px;color:#BBBBBB;line-height:1.6;">Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:<br><a href="{{ .ConfirmationURL }}" style="color:#7C3AED;word-break:break-all;font-weight:500;">{{ .ConfirmationURL }}</a></p>
</td>
</tr>

<tr>
<td align="center" style="padding:24px;background-color:#F8F9FA;border-top:1px solid #F4F4F5;">
<p style="margin:0;font-size:12px;color:#BBBBBB;">&copy; 2026 K&ouml;rset.app &middot; Все права защищены</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>
```

---

## Как вставить в Dashboard

1. Supabase Dashboard → Authentication → Email Templates
2. Выбрать вкладку (Confirm signup / Magic link / Reset password)
3. Вставить соответствующий HTML целиком
4. Нажать Save

## Что улучшено относительно оригинала

- Фон: `#F8F9FA` → `#F0F0F5` (мягкий lavender tint вместо серого)
- Логотип: 64px → 72px, border-radius 18→20
- Заголовок: 26px/800 → 28px/800
- OTP код: 40px/800 → 44px/800, letter-spacing 10→12
- OTP рамка: plain `#F4F4F5` фон → `#FAF4FF` (lavender glow) + `#E9D5FF` бордер (purple tint)
- Текст над кодом: «Добро пожаловать!» → точный контекстный текст («Ваш код подтверждения» / «Ваш код для входа»)
- Подзаголовок-теглайн: добавлен под логотипом с font-weight:500
- Кнопка сброса: gradient `#7C3AED→#6D28D9` + purple box-shadow вместо flat background
- Карточка: box-shadow с purple tint вместо чисто-чёрного
- Padding: увеличен для премиального «воздуха»
- Max-width: 500→520px

## Примечания

- `#7C3AED` и `#6D28D9` в email — брендовый purple. CSS vars в email не работают, хардкод обязателен.
- `#FAF4FF` + `#E9D5FF` — lavender glow вокруг OTP кода, создаёт фокус внимания
- `{{ .Token }}` — 6-значный OTP код (Confirm signup, Magic link)
- `{{ .ConfirmationURL }}` — ссылка для сброса пароля (Reset password)
- Логотип: Supabase Storage public bucket `public-assets/favicon.png`
