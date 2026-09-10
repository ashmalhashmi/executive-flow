import { COMPOSE_LETTERHEAD } from '../constants/composeLetterhead';
import { resizeDataUrlToMaxWidth } from './imageDataUrlResize';

/**
 * Load PAFDA letterhead PNG as a data URL (for PDF / Word / email).
 */
export async function loadPafdaLetterheadDataUrl() {
  const path = COMPOSE_LETTERHEAD.imagePath || '/pafda-letterhead.png';
  const res = await fetch(path);
  if (!res.ok) throw new Error('PAFDA letterhead image load fail');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('PAFDA letterhead read fail'));
    reader.readAsDataURL(blob);
  });
}

/** Strip data-url prefix → raw base64 (for Resend / API). */
export function dataUrlToBase64(dataUrl) {
  const parts = String(dataUrl || '').split(',');
  return parts[1] || '';
}

/**
 * Max width for Word .doc (A4 with ~1" margins). Compose used 640px which crops edges.
 */
export const PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX = 590;

/**
 * Same PAFDA image as Compose Desk — scaled to fit Word printable width (no edge crop).
 */
export async function loadPafdaLetterheadForWord() {
  const full = await loadPafdaLetterheadDataUrl();
  return resizeDataUrlToMaxWidth(full, PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX);
}

/** @deprecated use loadPafdaLetterheadForWord */
export async function loadPafdaLetterheadForReceivingNoteWord() {
  return loadPafdaLetterheadForWord();
}
