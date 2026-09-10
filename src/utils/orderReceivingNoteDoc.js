import { formatDisplayDate, getTodayISO } from './dates';
import {
  loadPafdaLetterheadDataUrl,
  loadPafdaLetterheadForWord,
  PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX,
} from './composeLetterheadImage';
import { buildPafdaLetterheadWordHtml } from './pafdaLetterheadWordHtml';
import { loadReceivingNoteSignatureForWord } from './receivingNoteSignatureImage';
import { buildReceivingNoteSignatureWordHtml } from './receivingNoteSignatureWordHtml';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveDateLine(dateISO) {
  const dateRaw = String(dateISO || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    try {
      return formatDisplayDate(dateRaw);
    } catch {
      return dateRaw;
    }
  }
  return dateRaw || formatDisplayDate(getTodayISO());
}

async function loadLetterheadForWordExport() {
  try {
    return await loadPafdaLetterheadForWord();
  } catch {
    const raw = await loadPafdaLetterheadDataUrl();
    return {
      dataUrl: raw,
      width: PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX,
      height: 0,
    };
  }
}

/**
 * Word-compatible .doc — same layout as Receiving Note PDF.
 */
export async function downloadOrderReceivingNoteWord({
  orderNo,
  dateISO,
  vendor,
  statement,
  itemsReceived,
  fileBaseName = '',
}) {
  let letterheadDataUrl = '';
  let letterheadWidth = 0;
  let letterheadHeight = 0;
  let signatureDataUrl = '';
  let signatureWidth = 0;
  let signatureHeight = 0;

  try {
    const lh = await loadLetterheadForWordExport();
    letterheadDataUrl = lh.dataUrl;
    letterheadWidth = lh.width;
    letterheadHeight = lh.height;
  } catch {
    letterheadDataUrl = '';
  }

  try {
    const sig = await loadReceivingNoteSignatureForWord();
    signatureDataUrl = sig.dataUrl;
    signatureWidth = sig.width;
    signatureHeight = sig.height;
  } catch {
    signatureDataUrl = '';
  }

  const dateLine = resolveDateLine(dateISO);
  const orderLabel = escapeHtml(String(orderNo || '').trim() || '________________');
  const vendorLabel = escapeHtml(String(vendor || '').trim());
  const bodyText = escapeHtml(
    String(statement || '').trim() || String(itemsReceived || '').trim() || '—',
  ).replace(/\n/g, '<br/>');

  const letterheadBlock = buildPafdaLetterheadWordHtml(
    letterheadDataUrl,
    letterheadWidth,
    letterheadHeight,
  );

  const vendorBlock = vendorLabel
    ? `<p style="text-align:left; margin:0 0 24pt 0;">Vendor: ${vendorLabel}</p>`
    : `<p style="margin:0 0 24pt 0;">&nbsp;</p>`;

  const html = `<!DOCTYPE html>
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
${buildReceivingNoteSignatureWordHtml(signatureDataUrl, signatureWidth, signatureHeight)}
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe =
    String(fileBaseName || '').trim() ||
    String(orderNo || 'order')
      .replace(/[^\w\-]+/g, '-')
      .slice(0, 40);
  a.href = url;
  a.download = `receiving-note-${safe}-${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
