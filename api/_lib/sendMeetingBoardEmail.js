/**
 * Send Meeting Board PDF via Resend HTTP API (no SDK required).
 */
export async function sendMeetingBoardEmail({
  to,
  dateISO,
  meetings,
  pdfBase64,
  filename,
  boardTitle,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY missing — Vercel env mein add karein');
  }

  const from =
    process.env.MEETING_BOARD_EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    'Executive Flow <onboarding@resend.dev>';

  const rows = meetings
    .map(
      (m, i) =>
        `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${i + 1}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(m.title || '')}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(m.time || '')}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(m.location || '—')}</td>
        </tr>`,
    )
    .join('');

  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;color:#111;">
      <h2 style="margin:0 0 8px;">Meeting Board — ${escapeHtml(boardTitle)}</h2>
      <p style="color:#555;margin:0 0 16px;">Aaj ki ${meetings.length} meeting${meetings.length === 1 ? '' : 's'} — PDF attach hai.</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px;">
        <thead>
          <tr style="background:#1e1e1e;color:#fff;">
            <th style="padding:8px;text-align:left;">#</th>
            <th style="padding:8px;text-align:left;">Meeting</th>
            <th style="padding:8px;text-align:left;">Time</th>
            <th style="padding:8px;text-align:left;">Venue</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#888;font-size:12px;margin-top:24px;">Executive Flow · Auto morning board · ${escapeHtml(dateISO)}</p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Meeting Board — ${boardTitle} (${meetings.length})`,
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
