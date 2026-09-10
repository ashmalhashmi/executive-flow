import { compressDataUrlToJpeg } from './imageDataUrlResize.js';

const MAX_UPLOAD_BASE64_CHARS = 3_500_000;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Invoice read nahi hui'));
    reader.readAsDataURL(file);
  });
}

async function prepareImagePayload(imageFile) {
  const dataUrl = await readFileAsDataUrl(imageFile);
  let uploadDataUrl = dataUrl;
  try {
    const compressed = await compressDataUrlToJpeg(dataUrl, 1200, 0.82);
    uploadDataUrl = compressed.dataUrl;
  } catch {
    /* use original */
  }

  const match = uploadDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invoice format theek nahi — JPG try karein');
  if (match[2].length > MAX_UPLOAD_BASE64_CHARS) {
    throw new Error('Photo bahut bari hai — dubara scan karein');
  }

  return {
    imageBase64: match[2],
    imageMimeType: match[1] || 'image/jpeg',
  };
}

export async function extractPettyInvoiceWithAi({ imageFile, textHint = '' }) {
  if (!imageFile) {
    throw new Error('Pehle invoice ki photo lein');
  }

  const { imageBase64, imageMimeType } = await prepareImagePayload(imageFile);

  const res = await fetch('/api/extract-petty-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, imageMimeType, textHint }),
  });

  const rawText = await res.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(`Server error (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.error || `AI extract fail (HTTP ${res.status})`);
  }

  return {
    fields: data.fields || {},
    invoicePhotoUrl: String(data.invoicePhotoUrl ?? '').trim(),
    storageWarning: String(data.storageWarning ?? '').trim(),
    via: data.via || 'ai',
  };
}
