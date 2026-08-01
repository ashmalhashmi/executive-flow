# Laptop ↔ Mobile Cloud Sync — Real-time Pulse

## Goal
Changes on mobile appear on laptop (and reverse) **automatically** via **Real-time Pulse**.
No **Save to Cloud** / **Load from Cloud** clicks — every edit pulses to the cloud; the other device picks it up in the background.

## Login: Email (magic link — recommended)

Supabase default email aksar **sirf link** bhejti hai, 6-digit code nahi.

1. Sync & Backup → **Send Email Code**
2. Gmail → email from **Supabase** / your project (check Spam)
3. Email mein **Log In** / blue button / long link **or** 6–8 digit code
4. Link **Copy** → Chrome address bar mein paste → Enter (or type code in app)
5. App open → Sync & Backup → **Logged in: ...** + **Real-time Pulse · live**
6. Done — edit anywhere; Pulse handles the rest

### Agar 6-digit code chahiye (optional)
Supabase Dashboard → Authentication → Email Templates → Magic Link  
Email body mein yeh line add karein:

```html
<p>Your code: <strong>{{ .Token }}</strong></p>
```

Phir email mein number dikhega aur app mein type kar sakte ho.

## Sync steps (Pulse)

| Device A | Device B |
|----------|----------|
| Login (same email) | Login (same email) |
| Make any change — Pulse auto-saves (~1s) | Pulse auto-loads when cloud is newer |
| Keep working | Open the matching tab to see new data |

Empty new device: Pulse auto-restores cloud backup on login (no Load button).

## Google login (optional)
Error `Unsupported provider: provider is not enabled` means Google is OFF in Supabase.

Enable:
1. [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **Providers** → **Google** → Enable
3. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
4. Paste Client ID + Secret into Supabase
5. Redirect URI from Supabase callback URL must be allowed in Google Cloud

Until then, use **Email OTP**.

## URL config (required once)
Supabase → **Authentication** → **URL Configuration**:
- Site URL: `https://executive-flow-seven.vercel.app`
- Redirect URLs: `https://executive-flow-seven.vercel.app/**`

## Realtime (optional, faster pull)
Run `supabase/schema.sql` (includes adding `user_app_data` to `supabase_realtime`), or Dashboard → Database → Replication → enable the table.
Polling every ~4s still works if Realtime is off.
