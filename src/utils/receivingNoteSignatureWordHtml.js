import { RECEIVING_NOTE_SIGNATURE } from './orderReceivingNotePdf';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Signature block for Word HTML — explicit width/height (matches resized embed).
 */
export function buildReceivingNoteSignatureWordHtml(signatureDataUrl, width, height) {
  const sigParts = RECEIVING_NOTE_SIGNATURE.split(',').map((p) => p.trim());
  const src = String(signatureDataUrl || '').trim();
  const img =
    src.startsWith('data:image/') && width > 0 && height > 0
      ? `<p style="text-align:right; margin:12pt 0 2pt 0;">
<img src="${src}" width="${width}" height="${height}" alt="Signature" style="width:${width}px;height:${height}px;" />
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
