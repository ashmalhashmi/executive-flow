import { extractComposeLetterHeader } from './composeLetterPdf';
import {
  loadPafdaLetterheadDataUrl,
  loadPafdaLetterheadForWord,
  PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX,
} from './composeLetterheadImage';
import { buildPafdaLetterheadWordHtml } from './pafdaLetterheadWordHtml';
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraphsFromRest(rest) {
  const blocks = String(rest || '').split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const lines = block.split(/\n/).map((l) => escapeHtml(l));
      if (!lines.some((l) => l.trim())) return '';
      return `<p style="margin:0 0 12pt 0; text-align:left; font-family:'Times New Roman',Times,serif; font-size:12pt; line-height:1.5;">${lines.join(
        '<br/>',
      )}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Build Word-compatible HTML (optional PAFDA letterhead image as data URL).
 */
export function buildComposeLetterDocHtml({
  subject,
  body,
  letterNo,
  letterheadDataUrl = '',
  letterheadWidth = 0,
  letterheadHeight = 0,
}) {
  const header = extractComposeLetterHeader(body, letterNo);
  const title = escapeHtml(subject || 'Composed Letter');
  const letterheadBlock = buildPafdaLetterheadWordHtml(
    letterheadDataUrl,
    letterheadWidth,
    letterheadHeight,
  );
  const noLabel = String(body || '').match(/^File No\./im) ? 'File No.' : 'No.';
  const noLine = header.letterNo
    ? `<p class="hdr" style="text-align:left; margin:0;">${noLabel} ${escapeHtml(header.letterNo)}</p>`
    : '';
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<!--[if gte mso 9]><xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
 </w:WordDocument>
</xml><![endif]-->
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; }
  .hdr { text-align: left; margin: 0 0 0 0; }
</style>
</head>
<body>
${letterheadBlock}
${noLine}
<p class="hdr" style="text-align:left; margin:0 0 18pt 0;">Date: ${escapeHtml(header.dateLine)}</p>
${paragraphsFromRest(header.rest)}
</body>
</html>`;
}

/**
 * Word-compatible .doc download (opens in Microsoft Word / LibreOffice).
 * Optional PAFDA letterhead at top when attachPafdaHeader is true.
 */
export async function downloadComposeLetterWord({
  subject,
  body,
  letterNo,
  attachPafdaHeader = false,
}) {
  let letterheadDataUrl = '';
  let letterheadWidth = 0;
  let letterheadHeight = 0;
  if (attachPafdaHeader) {
    try {
      const lh = await loadPafdaLetterheadForWord();
      letterheadDataUrl = lh.dataUrl;
      letterheadWidth = lh.width;
      letterheadHeight = lh.height;
    } catch {
      try {
        letterheadDataUrl = await loadPafdaLetterheadDataUrl();
        letterheadWidth = PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX;
        letterheadHeight = 0;
      } catch {
        letterheadDataUrl = '';
      }
    }
  }

  const html = buildComposeLetterDocHtml({
    subject,
    body,
    letterNo,
    letterheadDataUrl,
    letterheadWidth,
    letterheadHeight,
  });
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = String(subject || 'letter')
    .replace(/[^\w\-]+/g, '-')
    .slice(0, 40);
  a.href = url;
  a.download = `compose-${safe}-${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
