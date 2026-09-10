/**
 * Receiving Note Word HTML / base64 — server (email attach).
 */

const SIGNATURE = 'Ashmal Hashmi, PS to DG PAFDA';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveDateLine(dateISO) {
  const dateRaw = String(dateISO || '').trim();
  if (!dateRaw) {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    const [y, m, d] = dateRaw.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return dateRaw;
}

function buildLetterheadHtml(letterheadDataUrl, letterheadWidth = 0, letterheadHeight = 0) {
  const src = String(letterheadDataUrl || '').trim();
  if (!src.startsWith('data:image/')) return '';
  const w = Number(letterheadWidth) || 590;
  const h = Number(letterheadHeight) || 0;
  if (h > 0) {
    return `<p style="text-align:center; margin:0 0 18pt 0;">
<img src="${src}" width="${w}" height="${h}" alt="PAFDA Letterhead" style="width:${w}px;height:${h}px;display:block;margin:0 auto;" />
</p>`;
  }
  return `<p style="text-align:center; margin:0 0 18pt 0;">
<img src="${src}" width="${w}" alt="PAFDA Letterhead" style="width:${w}px;height:auto;display:block;margin:0 auto;" />
</p>`;
}

function buildSignatureHtml(signatureDataUrl, signatureWidth = 0, signatureHeight = 0) {
  const sigParts = SIGNATURE.split(',').map((p) => p.trim());
  const src = String(signatureDataUrl || '').trim();
  const w = Number(signatureWidth) || 0;
  const h = Number(signatureHeight) || 0;
  const img =
    src.startsWith('data:image/') && w > 0 && h > 0
      ? `<p style="text-align:right; margin:12pt 0 2pt 0;">
<img src="${src}" width="${w}" height="${h}" alt="Signature" style="width:${w}px;height:${h}px;" />
</p>`
      : '';
  const nameHtml = sigParts
    .map(
      (line, i) =>
        `<p style="text-align:right; margin:${i === 0 && !img ? '12pt' : '0'} 0 0 0; font-family:'Times New Roman',Times,serif; font-size:12pt;">${escapeHtml(line)}</p>`,
    )
    .join('\n');
  return `${img}\n${nameHtml}`;
}

export function buildReceivingNoteDocHtml({
  orderNo,
  dateISO,
  vendor,
  statement,
  itemsReceived,
  letterheadDataUrl = '',
  letterheadWidth = 0,
  letterheadHeight = 0,
  signatureDataUrl = '',
  signatureWidth = 0,
  signatureHeight = 0,
}) {
  const dateLine = resolveDateLine(dateISO);
  const orderLabel = escapeHtml(String(orderNo || '').trim() || '________________');
  const vendorLabel = escapeHtml(String(vendor || '').trim());
  const bodyText = escapeHtml(
    String(statement || '').trim() || String(itemsReceived || '').trim() || '—',
  ).replace(/\n/g, '<br/>');

  const letterheadBlock = buildLetterheadHtml(letterheadDataUrl, letterheadWidth, letterheadHeight);

  const vendorBlock = vendorLabel
    ? `<p style="text-align:left; margin:0 0 24pt 0;">Vendor: ${vendorLabel}</p>`
    : `<p style="margin:0 0 24pt 0;">&nbsp;</p>`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>Receiving Note — ${orderLabel}</title>
<!--[if gte mso 9]><xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
 </w:WordDocument>
</xml><![endif]-->
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; }
</style>
</head>
<body>
${letterheadBlock}
<p style="text-align:right; margin:0;">Date: ${escapeHtml(dateLine)}</p>
<p style="text-align:right; margin:0 0 12pt 0;">Order No.: ${orderLabel}</p>
${vendorBlock}
<p style="text-align:center; margin:48pt 0 18pt 0; font-size:14pt; font-weight:bold;">Receiving Note</p>
<p style="text-align:left; margin:0 0 12pt 0; line-height:1.5;">${bodyText}</p>
${buildSignatureHtml(signatureDataUrl, signatureWidth, signatureHeight)}
</body>
</html>`;
}

export function buildReceivingNoteDocBase64(opts) {
  const html = buildReceivingNoteDocHtml(opts);
  const safe = String(opts.orderNo || 'order')
    .replace(/[^\w\-]+/g, '-')
    .slice(0, 40);
  const filename = `receiving-note-${safe || 'order'}-${new Date().toISOString().slice(0, 10)}.doc`;
  const base64 = Buffer.from(`\ufeff${html}`, 'utf8').toString('base64');
  return { filename, base64, html };
}
