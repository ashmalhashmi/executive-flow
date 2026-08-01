# Option B — Email OTP code in Magic Link template

## Status: APPLIED (Jul 20, 2026)

Supabase project `wnvxakzxmmieorogvufb` → Authentication → Emails → **Magic link or OTP**:

- **Subject:** `{{ .Token }} is your Executive Flow login code`
- **Body:** includes large `{{ .Token }}` + optional ConfirmationURL link

## Test
1. App → Sync & Backup → **Send Email Code**
2. Gmail → subject mein numbers + body mein bara code
3. App mein type → **Verify & Login** → **Load from Cloud**

## Files (repo copy)
- `supabase/email-templates/magic-link.html`
- `scripts/apply-supabase-magic-link-template.ps1`
