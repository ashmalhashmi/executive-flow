import { getTodayISO, parseDateAsDmy, normalizeSheetDateIso } from './dates.js';
import { compressDataUrlToJpeg } from './imageDataUrlResize.js';

/** Manual register column headers — same as Dak Issuance Log. */
export const DAK_SCAN_COLUMNS = [
  { key: 'registerSr', label: 'Sr#', required: false },
  { key: 'subject', label: 'Subject', required: true },
  { key: 'forwardedDate', label: 'Date (Dispatched)', required: true, type: 'date' },
  { key: 'receivedDate', label: 'Date Received', required: false, type: 'date' },
  { key: 'designation', label: 'Marked To', required: true },
];

const MAX_UPLOAD_BASE64_CHARS = 3_500_000;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Photo read nahi hui'));
    reader.readAsDataURL(file);
  });
}

function normalizeExtractedDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return parseDateAsDmy(s) || normalizeSheetDateIso(s) || '';
}

function parseRegisterSr(raw) {
  const n = Number.parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function normalizeExtractedDak(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    registerSr: parseRegisterSr(raw.registerSr ?? raw.sr ?? raw.serialNo ?? raw.serial),
    subject: String(raw.subject ?? raw.Subject ?? raw.matter ?? '').trim(),
    forwardedDate: normalizeExtractedDate(
      raw.forwardedDate ?? raw.dispatchDate ?? raw.dispatchedDate ?? raw.date,
    ),
    receivedDate: normalizeExtractedDate(raw.receivedDate ?? raw.dateReceived),
    designation: String(
      raw.designation ?? raw.addressee ?? raw.to ?? raw.recipient ?? raw.markedTo ?? '',
    ).trim(),
  };
}

function rowHasContent(row) {
  return Boolean(
    row?.registerSr ||
      row?.subject ||
      row?.forwardedDate ||
      row?.receivedDate ||
      row?.designation,
  );
}

export function normalizeExtractedDakRows(rows) {
  if (!Array.isArray(rows)) {
    const single = normalizeExtractedDak(rows);
    return single && rowHasContent(single) ? [single] : [];
  }
  return rows.map(normalizeExtractedDak).filter(rowHasContent);
}

let scanRowSeq = 0;

export function extractedRowsToScanDraft(rows) {
  return normalizeExtractedDakRows(rows).map((row) => ({
    id: `scan-${Date.now()}-${scanRowSeq++}`,
    registerSr: row.registerSr ? String(row.registerSr) : '',
    subject: row.subject || '',
    forwardedDate: row.forwardedDate || '',
    receivedDate: row.receivedDate || '',
    designation: row.designation || '',
  }));
}

export function validateScanRow(row) {
  const errors = {};
  if (!String(row.subject ?? '').trim()) errors.subject = 'Subject chahiye';
  if (!String(row.forwardedDate ?? '').trim()) errors.forwardedDate = 'Dispatch date chahiye';
  if (!String(row.designation ?? '').trim()) errors.designation = 'Marked To chahiye';
  return errors;
}

export function scanRowToPayload(row, { scanPhotoUrl = '' } = {}) {
  const registerSr = parseRegisterSr(row.registerSr);
  return {
    registerSr: registerSr > 0 ? registerSr : undefined,
    subject: String(row.subject ?? '').trim(),
    forwardedDate: String(row.forwardedDate ?? '').trim() || getTodayISO(),
    receivedDate: String(row.receivedDate ?? '').trim(),
    designation: String(row.designation ?? '').trim(),
    scanPhotoUrl: String(scanPhotoUrl ?? '').trim(),
  };
}

function isHeicFile(file) {
  const type = String(file?.type ?? '').toLowerCase();
  const name = String(file?.name ?? '').toLowerCase();
  return type.includes('heic') || type.includes('heif') || /\.heic$|\.heif$/.test(name);
}

async function compressForUpload(dataUrl) {
  const qualities = [0.82, 0.72, 0.62];
  let last = null;
  for (const quality of qualities) {
    const compressed = await compressDataUrlToJpeg(dataUrl, 1200, quality);
    last = compressed;
    const base64 = compressed.dataUrl.split(',')[1] || '';
    if (base64.length <= MAX_UPLOAD_BASE64_CHARS) {
      return compressed.dataUrl;
    }
  }
  if (last?.dataUrl) return last.dataUrl;
  throw new Error('Photo compress nahi hui');
}

async function prepareImagePayload(imageFile) {
  if (isHeicFile(imageFile)) {
    throw new Error(
      'iPhone HEIC format — Camera se dubara lo ya Settings → Camera → Formats → Most Compatible (JPEG) ON karein',
    );
  }

  const dataUrl = await readFileAsDataUrl(imageFile);
  let uploadDataUrl = dataUrl;

  try {
    uploadDataUrl = await compressForUpload(dataUrl);
  } catch {
    throw new Error(
      'Photo read/compress nahi hui — seedhi clear JPG photo try karein (register page poori dikhe)',
    );
  }

  const match = uploadDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Photo format theek nahi — JPG try karein');
  }

  if (match[2].length > MAX_UPLOAD_BASE64_CHARS) {
    throw new Error(
      'Photo bahut bari hai — thori door se / kam resolution par dubara scan karein',
    );
  }

  return {
    imageBase64: match[2],
    imageMimeType: match[1] || 'image/jpeg',
  };
}

function formatApiError(res, data, rawText) {
  if (data?.code === 'NO_API_KEY') {
    return 'AI configure nahi — GEMINI_API_KEY Vercel par set karein.';
  }
  if (data?.error) return String(data.error);
  if (res.status === 413) {
    return 'Photo server limit se bari — dubara scan karein (thori door se, clear light)';
  }
  if (res.status === 504 || res.status === 408) {
    return 'AI timeout — sirf ek register page scan karein, phir dubara try karein';
  }
  if (rawText && !rawText.trim().startsWith('{')) {
    return `Server error (${res.status}) — thodi der baad dubara try karein`;
  }
  return `AI extract fail (HTTP ${res.status})`;
}

export async function extractDakWithAi({ imageFile }) {
  if (!imageFile) {
    throw new Error('Pehle register ya letter ki photo lein');
  }

  const { imageBase64, imageMimeType } = await prepareImagePayload(imageFile);

  let res;
  let rawText = '';
  try {
    res = await fetch('/api/extract-dak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, imageMimeType }),
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
    throw new Error(formatApiError(res, data, rawText));
  }

  const rows = normalizeExtractedDakRows(data.rows ?? data.dak ?? []);
  if (!rows.length) {
    throw new Error('AI ne koi row nahi padhi — clear photo / register page seedhi try karein');
  }

  return {
    rows,
    via: data.via || 'ai',
    scanPhotoUrl: String(data.scanPhotoUrl ?? '').trim(),
    storageWarning: String(data.storageWarning ?? '').trim(),
  };
}
