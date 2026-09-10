import {
  PETTY_INVOICE_SYSTEM_PROMPT,
  buildPettyInvoiceUserPrompt,
  parsePettyInvoiceJson,
  extractGeminiText,
} from './_lib/pettyInvoiceExtract.js';
import { uploadPettyInvoicePhoto } from './_lib/pettyInvoiceStorage.js';

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

async function callGemini({ apiKey, imageBase64, imageMimeType, textHint }) {
  const model = getGeminiModel();
  const parts = [
    {
      text: `${PETTY_INVOICE_SYSTEM_PROMPT}\n\n${buildPettyInvoiceUserPrompt(textHint)}`,
    },
  ];
  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: imageMimeType || 'image/jpeg',
        data: imageBase64,
      },
    });
  }

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
      reason ? `AI ne jawab nahi diya (${reason})` : 'AI ne invoice parse nahi ki — clear photo try karein',
    );
  }

  const fields = parsePettyInvoiceJson(rawText);
  if (!fields) {
    throw new Error('AI response valid JSON nahi thi — dubara scan karein');
  }

  return fields;
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
    const { imageBase64 = '', imageMimeType = 'image/jpeg', textHint = '' } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'Invoice ki photo required' });
    }

    if (String(imageBase64).length > 4_500_000) {
      return res.status(413).json({
        error: 'Photo bahut bari hai — dubara scan karein',
        code: 'PAYLOAD_TOO_LARGE',
      });
    }

    const uploadResult = await uploadPettyInvoicePhoto({ imageBase64, imageMimeType });
    const invoicePhotoUrl = uploadResult.ok ? uploadResult.invoicePhotoUrl : '';
    const storageWarning = uploadResult.ok
      ? ''
      : uploadResult.error || 'Invoice photo cloud par save nahi hui';

    const fields = await callGemini({
      apiKey,
      imageBase64,
      imageMimeType,
      textHint: String(textHint || '').trim(),
    });

    return res.status(200).json({
      ok: true,
      via: 'ai',
      model: getGeminiModel(),
      fields,
      invoicePhotoUrl,
      ...(storageWarning ? { storageWarning } : {}),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Extraction failed' });
  }
}
