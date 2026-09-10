import { buildComposeLetterDocBase64 } from './_lib/composeLetterDoc.js';
import { escapeHtml, sendResendPdfEmail } from './_lib/sendResendPdfEmail.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

/**
 * POST /api/compose-letter-email
 *
 * Compose letter (Word):
 *   { email, subject?, body, letterNo?, letterhead… }
 *
 * Contact Database PDF (same file as Download PDF) — Hobby plan shares this route:
 *   { type: 'contact_database', email, pdfBase64, filename?, count? }
 *
 * File label PDF (same file as Download PDF):
 *   { type: 'file_label', email, pdfBase64, filename?, name? }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const to = String(body.email || '').trim();
    const type = String(body.type || '').trim();

    if (!isValidEmail(to)) {
      return res.status(400).json({ error: 'Valid email address required' });
    }

    if (type === 'contact_database') {
      const pdfBase64 = String(body.pdfBase64 || '').trim();
      const count = Number(body.count) || 0;
      const filename =
        String(body.filename || '').trim() ||
        `contact-database-${new Date().toISOString().slice(0, 10)}.pdf`;

      if (!pdfBase64 || pdfBase64.length < 32) {
        return res.status(400).json({ error: 'PDF attachment missing' });
      }
      if (pdfBase64.length > 4_500_000) {
        return res.status(400).json({
          error: 'PDF too large for email — filters se list chhoti karein',
        });
      }

      const subject =
        count > 0
          ? `Contact Database — ${count} contact${count === 1 ? '' : 's'}`
          : 'Contact Database PDF';

      const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;color:#111;">
        <h2 style="margin:0 0 8px;">Contact Database</h2>
        <p style="margin:0 0 16px;">
          ${count > 0 ? `<strong>${count}</strong> contact${count === 1 ? '' : 's'} · ` : ''}
          PDF attached (same as Download PDF).
        </p>
        <p style="color:#888;font-size:12px;">Executive Flow · Contact Database</p>
      </div>
    `;

      await sendResendPdfEmail({
        to,
        subject,
        html,
        filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
        pdfBase64,
      });

      return res.status(200).json({
        ok: true,
        sent: true,
        email: to,
        filename,
        count,
        auth: 'manual',
      });
    }

    if (type === 'file_label') {
      const pdfBase64 = String(body.pdfBase64 || body.docBase64 || '').trim();
      const labelName = String(body.name || '').trim();
      const filename =
        String(body.filename || '').trim() ||
        `file-label-${new Date().toISOString().slice(0, 10)}.pdf`;

      if (!pdfBase64 || pdfBase64.length < 32) {
        return res.status(400).json({ error: 'PDF attachment missing' });
      }
      if (pdfBase64.length > 4_500_000) {
        return res.status(400).json({ error: 'PDF too large for email' });
      }

      const subject = labelName ? `File Label — ${labelName}` : 'File Label';
      const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;color:#111;">
        <h2 style="margin:0 0 8px;">File Label</h2>
        <p style="margin:0 0 16px;">
          ${labelName ? `<strong>${escapeHtml(labelName)}</strong> · ` : ''}
          PDF attached — same as Download PDF.
        </p>
        <p style="color:#888;font-size:12px;">Executive Flow · File Labels</p>
      </div>
    `;

      await sendResendPdfEmail({
        to,
        subject,
        html,
        filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
        pdfBase64,
      });

      return res.status(200).json({
        ok: true,
        sent: true,
        email: to,
        filename,
        auth: 'manual',
      });
    }

    const letterBody = String(body.body || '').trim();
    const subject = String(body.subject || 'Composed Letter').trim();
    const letterNo = String(body.letterNo || '').trim();
    const letterheadDataUrl = String(body.letterheadDataUrl || '').trim();
    const letterheadWidth = Number(body.letterheadWidth) || 0;
    const letterheadHeight = Number(body.letterheadHeight) || 0;
    if (letterheadDataUrl && letterheadDataUrl.length > 900_000) {
      return res.status(400).json({ error: 'Letterhead image too large' });
    }

    if (!letterBody) {
      return res.status(400).json({ error: 'Letter body required' });
    }
    if (letterBody.length > 120_000) {
      return res.status(400).json({ error: 'Letter too long for email' });
    }

    const doc = buildComposeLetterDocBase64({
      subject,
      body: letterBody,
      letterNo,
      letterheadDataUrl: letterheadDataUrl.startsWith('data:image/')
        ? letterheadDataUrl
        : '',
      letterheadWidth,
      letterheadHeight,
    });

    const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;color:#111;">
        <h2 style="margin:0 0 8px;">Composed letter</h2>
        <p style="color:#555;margin:0 0 12px;">Subject: <strong>${escapeHtml(subject)}</strong></p>
        <p style="margin:0 0 16px;">Word (.doc) file attached — open in Microsoft Word / LibreOffice.</p>
        <p style="color:#888;font-size:12px;">Executive Flow · Compose Desk</p>
      </div>
    `;

    await sendResendPdfEmail({
      to,
      subject: subject.startsWith('Letter:') ? subject : `Letter: ${subject}`,
      html,
      filename: doc.filename,
      pdfBase64: doc.base64,
    });

    return res.status(200).json({
      ok: true,
      sent: true,
      email: to,
      filename: doc.filename,
      auth: 'manual',
    });
  } catch (err) {
    console.error('compose-letter-email', err);
    return res.status(500).json({
      error: err.message || 'Failed to send letter email',
    });
  }
}
