/**
 * Generic Resend PDF email (Meeting Board / Weekly Expenditure / etc.).
 */
export async function sendResendPdfEmail({
  to,
  subject,
  html,
  filename,
  pdfBase64,
  from,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY missing — Vercel env mein add karein');
  }

  const fromAddr =
    from ||
    process.env.MEETING_BOARD_EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    'Executive Flow <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddr,
      to: [to],
      subject,
      html,
      attachments: [
        {
          filename,
          content: pdfBase64,
        },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Resend failed (${res.status})`);
  }
  return data;
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
