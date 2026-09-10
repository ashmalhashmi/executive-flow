import { buildPettyCashDocBase64 } from './_lib/pettyCashDoc.js';
import { escapeHtml, sendResendPdfEmail } from './_lib/sendResendPdfEmail.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

const DOC_LABELS = {
  purchase_slip: 'Purchase Slip',
  satisfactory_note: 'Satisfactory Note',
  refreshment_receiving: 'Receiving Note (Refreshment)',
};

/**
 * POST /api/petty-cash-email
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const to = String(body.email || '').trim();
    const docType = String(body.docType || '').trim();
    const payload = body.payload || {};

    if (!isValidEmail(to)) {
      return res.status(400).json({ error: 'Valid email address required' });
    }
    if (!DOC_LABELS[docType]) {
      return res.status(400).json({ error: 'Invalid docType' });
    }

    const doc = buildPettyCashDocBase64({
      docType,
      payload,
      letterheadDataUrl: String(body.letterheadDataUrl || '').trim(),
      letterheadWidth: Number(body.letterheadWidth) || 0,
      letterheadHeight: Number(body.letterheadHeight) || 0,
      signatureDataUrl: String(body.signatureDataUrl || '').trim(),
      signatureWidth: Number(body.signatureWidth) || 0,
      signatureHeight: Number(body.signatureHeight) || 0,
    });

    const ref = payload.caseNo || payload.noteNo || 'Petty Cash';
    const label = DOC_LABELS[docType];
    const subject = `${label} — ${ref}`;

    const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;color:#111;">
        <h2 style="margin:0 0 8px;">${escapeHtml(label)}</h2>
        <p style="margin:0 0 16px;">Reference: <strong>${escapeHtml(ref)}</strong></p>
        <p style="margin:0 0 16px;">Word (.doc) attached — open in Microsoft Word.</p>
        <p style="color:#888;font-size:12px;">Executive Flow · Petty Cash Record</p>
      </div>
    `;

    await sendResendPdfEmail({
      to,
      subject,
      html,
      filename: doc.filename,
      pdfBase64: doc.base64,
    });

    return res.status(200).json({
      ok: true,
      sent: true,
      email: to,
      filename: doc.filename,
    });
  } catch (err) {
    console.error('petty-cash-email', err);
    return res.status(500).json({ error: err.message || 'Failed to send email' });
  }
}
