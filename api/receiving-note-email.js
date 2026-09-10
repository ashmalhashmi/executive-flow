import { buildReceivingNoteDocBase64 } from './_lib/receivingNoteDoc.js';
import { escapeHtml, sendResendPdfEmail } from './_lib/sendResendPdfEmail.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

/**
 * POST /api/receiving-note-email
 * Body: { email, orderNo, dateISO?, vendor?, statement?, itemsReceived?, letterheadDataUrl?, letterheadWidth?, letterheadHeight?, signatureDataUrl?, signatureWidth?, signatureHeight? }
 * Sends Receiving Note as Word (.doc) via Resend.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const to = String(body.email || '').trim();
    const orderNo = String(body.orderNo || '').trim();
    const dateISO = String(body.dateISO || '').trim();
    const vendor = String(body.vendor || '').trim();
    const statement = String(body.statement || '').trim();
    const itemsReceived = String(body.itemsReceived || '').trim();
    const letterheadDataUrl = String(body.letterheadDataUrl || '').trim();
    const letterheadWidth = Number(body.letterheadWidth) || 0;
    const letterheadHeight = Number(body.letterheadHeight) || 0;
    const signatureDataUrl = String(body.signatureDataUrl || '').trim();
    const signatureWidth = Number(body.signatureWidth) || 0;
    const signatureHeight = Number(body.signatureHeight) || 0;

    if (letterheadDataUrl && letterheadDataUrl.length > 900_000) {
      return res.status(400).json({ error: 'Letterhead image too large' });
    }
    if (signatureDataUrl && signatureDataUrl.length > 900_000) {
      return res.status(400).json({ error: 'Signature image too large' });
    }
    if (!isValidEmail(to)) {
      return res.status(400).json({ error: 'Valid email address required' });
    }
    if (!orderNo) {
      return res.status(400).json({ error: 'Order No. required' });
    }
    if (!statement && !itemsReceived) {
      return res.status(400).json({ error: 'Statement or items required' });
    }

    const doc = buildReceivingNoteDocBase64({
      orderNo,
      dateISO,
      vendor,
      statement,
      itemsReceived,
      letterheadDataUrl: letterheadDataUrl.startsWith('data:image/')
        ? letterheadDataUrl
        : '',
      letterheadWidth,
      letterheadHeight,
      signatureDataUrl: signatureDataUrl.startsWith('data:image/')
        ? signatureDataUrl
        : '',
      signatureWidth,
      signatureHeight,
    });

    const subject = `Receiving Note — ${orderNo}`;
    const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;color:#111;">
        <h2 style="margin:0 0 8px;">Receiving Note</h2>
        <p style="color:#555;margin:0 0 8px;">Order No.: <strong>${escapeHtml(orderNo)}</strong></p>
        ${vendor ? `<p style="margin:0 0 8px;">Vendor: <strong>${escapeHtml(vendor)}</strong></p>` : ''}
        <p style="margin:0 0 16px;">Word (.doc) file attached — open in Microsoft Word / LibreOffice.</p>
        <p style="color:#888;font-size:12px;">Executive Flow · Order Log</p>
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
      auth: 'manual',
    });
  } catch (err) {
    console.error('receiving-note-email', err);
    return res.status(500).json({
      error: err.message || 'Failed to send receiving note email',
    });
  }
}
