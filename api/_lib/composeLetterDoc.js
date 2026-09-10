/**
 * Word-compatible .doc (HTML) for Compose letters — server side (email attach).
 */

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractHeader(body, letterNoHint) {
  const text = String(body || '');
  const noMatch = text.match(/^(?:No\.|File No\.)\s*(.*)$/im);
  const dateMatch = text.match(/^Date:\s*(.*)$/im);

  const letterNo =
    String(letterNoHint || '').trim() ||
    (noMatch ? String(noMatch[1] || '').trim() : '');

  const dateLine = (dateMatch ? String(dateMatch[1] || '').trim() : '') || '';

  const rest = text
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (/^(?:No\.|File No\.)\s*/i.test(t)) return false;
      if (/^Date:\s*/i.test(t)) return false;
      return true;
    })
    .join('\n')
    .replace(/^\s+/, '');

  return { letterNo, dateLine: dateLine || new Date().toLocaleDateString('en-GB'), rest };
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
 * @param {{ subject?: string, body: string, letterNo?: string, letterheadDataUrl?: string }} opts
 * letterheadDataUrl — full data:image/png;base64,... from client when PAFDA header requested
 */
export function buildComposeLetterDocHtml({
  subject,
  body,
  letterNo,
  letterheadDataUrl,
  letterheadWidth = 0,
  letterheadHeight = 0,
}) {
  const header = extractHeader(body, letterNo);
  const title = escapeHtml(subject || 'Composed Letter');
  const lh = String(letterheadDataUrl || '').trim();
  const w = Number(letterheadWidth) || 590;
  const h = Number(letterheadHeight) || 0;
  const letterheadBlock = lh.startsWith('data:image/')
    ? h > 0
      ? `<p style="text-align:center; margin:0 0 18pt 0;">
<img src="${lh}" width="${w}" height="${h}" alt="PAFDA Letterhead" style="width:${w}px;height:${h}px;display:block;margin:0 auto;" />
</p>`
      : `<p style="text-align:center; margin:0 0 18pt 0;">
<img src="${lh}" width="${w}" alt="PAFDA Letterhead" style="width:${w}px;height:auto;display:block;margin:0 auto;" />
</p>`
    : '';

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

export function buildComposeLetterDocBase64({
  subject,
  body,
  letterNo,
  letterheadDataUrl,
  letterheadWidth = 0,
  letterheadHeight = 0,
}) {
  const html = buildComposeLetterDocHtml({
    subject,
    body,
    letterNo,
    letterheadDataUrl,
    letterheadWidth,
    letterheadHeight,
  });
  const safe = String(subject || 'letter')
    .replace(/[^\w\-]+/g, '-')
    .slice(0, 40);
  const filename = `compose-${safe || 'letter'}-${new Date().toISOString().slice(0, 10)}.doc`;
  const base64 = Buffer.from(`\ufeff${html}`, 'utf8').toString('base64');
  return { filename, base64, html };
}
