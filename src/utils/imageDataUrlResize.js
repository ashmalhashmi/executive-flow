/**
 * Resize a data-URL image in the browser (for Word .doc — Word ignores CSS on embedded images).
 * @returns {{ dataUrl: string, width: number, height: number }}
 */
export function resizeDataUrlToFit(dataUrl, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const src = String(dataUrl || '').trim();
    if (!src.startsWith('data:image/')) {
      reject(new Error('Invalid image data URL'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width || 1;
      const naturalH = img.naturalHeight || img.height || 1;
      const scale = Math.min(maxWidth / naturalW, maxHeight / naturalH, 1);
      const width = Math.max(1, Math.round(naturalW * scale));
      const height = Math.max(1, Math.round(naturalH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width,
        height,
      });
    };
    img.onerror = () => reject(new Error('Image decode fail'));
    img.src = src;
  });
}

/** Scale down to max width only — preserves full letterhead proportions (Compose Desk style). */
export function resizeDataUrlToMaxWidth(dataUrl, maxWidth) {
  return new Promise((resolve, reject) => {
    const src = String(dataUrl || '').trim();
    if (!src.startsWith('data:image/')) {
      reject(new Error('Invalid image data URL'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width || 1;
      const naturalH = img.naturalHeight || img.height || 1;
      const scale = Math.min(maxWidth / naturalW, 1);
      const width = Math.max(1, Math.round(naturalW * scale));
      const height = Math.max(1, Math.round(naturalH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width,
        height,
      });
    };
    img.onerror = () => reject(new Error('Image decode fail'));
    img.src = src;
  });
}

/** Smaller JPEG for AI upload — avoids Vercel 4.5MB body limit on mobile photos. */
export function compressDataUrlToJpeg(dataUrl, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const src = String(dataUrl || '').trim();
    if (!src.startsWith('data:image/')) {
      reject(new Error('Invalid image data URL'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width || 1;
      const naturalH = img.naturalHeight || img.height || 1;
      const scale = Math.min(maxWidth / naturalW, 1);
      const width = Math.max(1, Math.round(naturalW * scale));
      const height = Math.max(1, Math.round(naturalH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', quality),
        width,
        height,
      });
    };
    img.onerror = () => reject(new Error('Image decode fail'));
    img.src = src;
  });
}
