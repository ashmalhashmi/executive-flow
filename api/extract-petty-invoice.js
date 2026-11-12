import {
  PETTY_INVOICE_SYSTEM_PROMPT,
  buildPettyInvoiceUserPrompt,
  parsePettyInvoiceJson,
  extractGeminiText,
} from './_lib/pettyInvoiceExtract.js';
import { uploadPettyInvoicePhoto } from './_lib/pettyInvoiceStorage.js';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

async function callOpenAI({ apiKey, imageBase64, imageMimeType, textHint }) {
  const model = getOpenAIModel();
  const content = [
    { type: 'input_text', text: buildPettyInvoiceUserPrompt(textHint) },
    {
      type: 'input_image',
      image_url: `data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}`,
      detail: 'high',
    },
  ];

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model,
      instructions: PETTY_INVOICE_SYSTEM_PROMPT,
      input: [{ role: 'user', content }],
      store: false,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI error (${res.status})`);
  }

  const parts = (data.output || [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content || []);
  const rawText = parts
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text || '')
    .join('');
  if (!rawText.trim()) {
    throw new Error('AI ne invoice parse nahi ki — clear photo try karein');
  }

  const fields = parsePettyInvoiceJson(rawText);
  if (!fields) {
    throw new Error('AI response valid JSON nahi thi — dubara scan karein');
  }
  return { fields, model };
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
  return { fields, model };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!openAiKey && !geminiKey) {
    return res.status(503).json({
      error: 'AI extraction not configured — set OPENAI_API_KEY in Vercel env',
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

    const extracted = openAiKey
      ? await callOpenAI({
        apiKey: openAiKey,
        imageBase64,
        imageMimeType,
        textHint: String(textHint || '').trim(),
      })
      : await callGemini({
        apiKey: geminiKey,
        imageBase64,
        imageMimeType,
        textHint: String(textHint || '').trim(),
      });

    return res.status(200).json({
      ok: true,
      via: 'ai',
      model: extracted.model,
      fields: extracted.fields,
      invoicePhotoUrl,
      ...(storageWarning ? { storageWarning } : {}),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Extraction failed' });
  }
}
