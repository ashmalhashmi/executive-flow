/**
 * PAFDA letterhead for Word — same image as Compose Desk, explicit size (Word ignores CSS).
 */
export function buildPafdaLetterheadWordHtml(letterheadDataUrl, width, height) {
  const src = String(letterheadDataUrl || '').trim();
  if (!src.startsWith('data:image/')) return '';

  const w = Number(width) || 590;
  const h = Number(height) || 0;

  if (h > 0) {
    return `<p style="text-align:center; margin:0 0 18pt 0;">
<img src="${src}" width="${w}" height="${h}" alt="PAFDA Letterhead" style="width:${w}px;height:${h}px;display:block;margin:0 auto;" />
</p>`;
  }

  return `<p style="text-align:center; margin:0 0 18pt 0;">
<img src="${src}" width="${w}" alt="PAFDA Letterhead" style="width:${w}px;height:auto;display:block;margin:0 auto;" />
</p>`;
}
