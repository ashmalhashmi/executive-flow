import { resizeDataUrlToFit } from './imageDataUrlResize';

/** Official PAFDA wordmark — operator-supplied PNG, never stretched. */
export const PAFDA_LOGO_PATH = '/pafda-logo.png';

let cachedFull = null;
let cachedWord = null;

export async function loadPafdaLogoDataUrl() {
  if (cachedFull) return cachedFull;
  const res = await fetch(PAFDA_LOGO_PATH);
  if (!res.ok) throw new Error('PAFDA logo load fail');
  const blob = await res.blob();
  cachedFull = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('PAFDA logo read fail'));
    reader.readAsDataURL(blob);
  });
  return cachedFull;
}

/**
 * Word-sized logo — explicit px, landscape box so the wordmark keeps its shape.
 */
export async function loadPafdaLogoForWord(maxWidth = 168, maxHeight = 72) {
  if (cachedWord && cachedWord.maxWidth === maxWidth && cachedWord.maxHeight === maxHeight) {
    return cachedWord;
  }
  const full = await loadPafdaLogoDataUrl();
  try {
    const fitted = await resizeDataUrlToFit(full, maxWidth, maxHeight);
    cachedWord = { ...fitted, maxWidth, maxHeight };
    return cachedWord;
  } catch {
    return { dataUrl: full, width: maxWidth, height: maxHeight, maxWidth, maxHeight };
  }
}
