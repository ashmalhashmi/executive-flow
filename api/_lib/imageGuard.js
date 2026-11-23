const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 4_500_000;

export function assertImagePayload(imageBase64, imageMimeType) {
  const mime = String(imageMimeType || '').trim().toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, error: 'Unsupported image type. Use JPG, PNG, or WebP.' };
  }

  const raw = String(imageBase64 || '').replace(/\s/g, '');
  if (!raw) return { ok: false, error: 'Image data missing' };
  if (!/^[A-Za-z0-9+/]+=*$/.test(raw)) {
    return { ok: false, error: 'Image data is not valid base64' };
  }

  const bytes = Math.floor((raw.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Image too large' };
  }

  return {
    ok: true,
    imageBase64: raw,
    imageMimeType: mime === 'image/jpg' ? 'image/jpeg' : mime,
  };
}
