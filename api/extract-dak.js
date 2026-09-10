import {
  DAK_EXTRACT_SYSTEM_PROMPT,
  buildDakExtractUserPrompt,
  parseExtractedDakJson,
  extractGeminiText,
} from './_lib/dakExtract.js';
import { uploadDakScanPhoto } from './_lib/dakScanStorage.js';

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

async function callGemini({ apiKey, imageBase64, imageMimeType }) {
  if (!imageBase64) {
    throw new Error('Image required');
  }

  const model = getGeminiModel();
  const parts = [
    {
      text: `${DAK_EXTRACT_SYSTEM_PROMPT}\n\n${buildDakExtractUserPrompt()}`,
    },
    {
      inline_data: {
        mime_type: imageMimeType || 'image/jpeg',
        data: imageBase64,
      },
    },
  ];

  const generationConfig = {
    temperature: 0.1,
    responseMimeType: 'application/json',
  };

  if (model.includes('2.5-flash')) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini API error (${res.status})`);
  }

  const { text: rawText, reason } = extractGeminiText(data);
  if (!rawText) {
    throw new Error(
      reason && reason !== 'empty_response'
        ? `AI ne jawab nahi diya (${reason})`
        : 'AI ne koi text nahi diya — clear register photo try karein',
    );
  }

  const rows = parseExtractedDakJson(rawText);
  if (!rows.length) {
    throw new Error(
      'AI ne register rows parse nahi ki — seedhi clear photo / ek page try karein',
    );
  }

  return rows;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI extraction not configured — set GEMINI_API_KEY in Vercel env',
      code: 'NO_API_KEY',
    });
  }

  try {
    const { imageBase64 = '', imageMimeType = 'image/jpeg' } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'Register / letter ki photo required' });
    }

    if (String(imageBase64).length > 4_500_000) {
      return res.status(413).json({
        error: 'Photo bahut bari hai — thori door se / clear light mein dubara scan karein',
        code: 'PAYLOAD_TOO_LARGE',
      });
    }

    const uploadResult = await uploadDakScanPhoto({ imageBase64, imageMimeType });
    const scanPhotoUrl = uploadResult.ok ? uploadResult.scanPhotoUrl : '';
    const storageWarning = uploadResult.ok
      ? ''
      : uploadResult.error || 'Scan photo cloud par save nahi hui';

    const rows = await callGemini({ apiKey, imageBase64, imageMimeType });
    if (!rows.length) {
      return res.status(422).json({
        error: 'AI ne koi row nahi padhi — clear photo / register page try karein',
      });
    }

    return res.status(200).json({
      ok: true,
      via: 'ai',
      model: getGeminiModel(),
      rows,
      scanPhotoUrl,
      ...(storageWarning ? { storageWarning } : {}),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Extraction failed' });
  }
}
