import { resizeDataUrlToFit } from './imageDataUrlResize';

/** Match PDF signature block: 48mm × 18mm at 96 DPI */
export const RECEIVING_NOTE_SIGNATURE_WORD_MAX_PX = {
  width: Math.round((48 / 25.4) * 96),
  height: Math.round((18 / 25.4) * 96),
};

/**
 * Load Receiving Note handwritten signature PNG as data URL.
 */
export async function loadReceivingNoteSignatureDataUrl() {
  const res = await fetch('/receiving-note-signature.png');
  if (!res.ok) throw new Error('Signature image load fail');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Signature image read fail'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Signature sized for Word — full PNG is huge; Word ignores CSS width on .doc HTML.
 */
export async function loadReceivingNoteSignatureForWord() {
  const full = await loadReceivingNoteSignatureDataUrl();
  const { width, height } = RECEIVING_NOTE_SIGNATURE_WORD_MAX_PX;
  return resizeDataUrlToFit(full, width, height);
}
