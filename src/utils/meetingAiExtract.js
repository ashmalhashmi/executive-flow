import { getTodayISO } from './dates.js';
import { compressDataUrlToJpeg } from './imageDataUrlResize.js';
import { authorizedJsonHeaders, errorIfUnauthenticated, LOGIN_REQUIRED } from './apiAuth';

const MAX_UPLOAD_BASE64_CHARS = 3_500_000;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Photo read nahi hui'));
    reader.readAsDataURL(file);
  });
}

function isHeicFile(file) {
  const type = String(file?.type ?? '').toLowerCase();
  const name = String(file?.name ?? '').toLowerCase();
  return type.includes('heic') || type.includes('heif') || /\.heic$|\.heif$/.test(name);
}

async function prepareImagePayload(imageFile) {
  if (isHeicFile(imageFile)) {
    throw new Error('HEIC photo support nahi — JPEG photo attach karein');
  }
  const dataUrl = await readFileAsDataUrl(imageFile);
  const compressed = await compressDataUrlToJpeg(dataUrl, 1400, 0.8);
  const uploadDataUrl = compressed?.dataUrl || dataUrl;
  const match = uploadDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Photo format theek nahi — JPG try karein');
  if (match[2].length > MAX_UPLOAD_BASE64_CHARS) {
    throw new Error('Photo bahut bari hai — chhoti clear photo try karein');
  }
  return { imageBase64: match[2], imageMimeType: match[1] || 'image/jpeg' };
}

function formatApiError(res, data, rawText) {
  if (data?.code === 'NO_API_KEY') return 'AI configure nahi — OPENAI_API_KEY Vercel par set karein.';
  if (data?.error) return String(data.error);
  if (res.status === 413) return 'Photo bari hai — chhoti photo try karein';
  if (res.status === 504 || res.status === 408) return 'AI timeout — dubara try karein';
  if (rawText && !rawText.trim().startsWith('{')) {
    return `Server error (${res.status}) — thodi der baad try karein`;
  }
  return `AI extract fail (HTTP ${res.status})`;
}

async function postExtract(body) {
  const { headers, token } = await authorizedJsonHeaders();
  if (!token) throw Object.assign(new Error(LOGIN_REQUIRED), { code: 'LOGIN_REQUIRED' });

  let res;
  let rawText = '';
  try {
    res = await fetch('/api/extract-meeting', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...body, todayISO: getTodayISO(), purpose: 'meeting' }),
    });
    rawText = await res.text();
  } catch {
    throw new Error('Network error — internet check karke dubara try karein');
  }

  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(formatApiError(res, {}, rawText));
  }
  if (!res.ok) {
    const authError = errorIfUnauthenticated(res, data);
    if (authError) throw authError;
    const err = new Error(formatApiError(res, data, rawText));
    err.invitationImageRef = String(data.invitationImageRef || '').trim();
    err.storageWarning = String(data.storageWarning || '').trim();
    throw err;
  }
  return data;
}

export async function fillMeetingFromBrief(brief) {
  const note = String(brief || '').trim();
  if (note.length < 3) {
    throw new Error('Jagah, waqt, aur topic likhein');
  }
  const data = await postExtract({ brief: note });
  return {
    fields: data.fields || {},
    invitationImageRef: '',
    storageWarning: '',
  };
}

export async function fillMeetingFromInvite(imageFile) {
  if (!imageFile) throw new Error('Invitation ki photo attach karein');
  const image = await prepareImagePayload(imageFile);
  const data = await postExtract(image);
  return {
    fields: data.fields || {},
    invitationImageRef: String(data.invitationImageRef || '').trim(),
    storageWarning: String(data.storageWarning || '').trim(),
  };
}
