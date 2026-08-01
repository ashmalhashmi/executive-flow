import {
  CONTACT_EXTRACT_SYSTEM_PROMPT,
  buildContactExtractUserPrompt,
  parseExtractedContactJson,
} from './_lib/contactExtract.js';

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

async function callGemini({ apiKey, text, imageBase64, imageMimeType }) {
  const model = getGeminiModel();
  const parts = [
    {
      text: `${CONTACT_EXTRACT_SYSTEM_PROMPT}\n\n${buildContactExtractUserPrompt(text || '(see image)')}`,
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

  // 2.5 Flash only: disable thinking for cheaper/faster extraction.
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

  const rawText =
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  if (!rawText.trim()) throw new Error('AI ne koi jawab nahi diya');

  const contact = parseExtractedContactJson(rawText);
  if (!contact) throw new Error('AI response valid JSON nahi thi');

  return contact;
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
    const { text = '', imageBase64 = '', imageMimeType = 'image/jpeg' } = req.body || {};
    if (!String(text).trim() && !imageBase64) {
      return res.status(400).json({ error: 'text ya image required' });
    }

    const contact = await callGemini({ apiKey, text, imageBase64, imageMimeType });
    return res.status(200).json({ ok: true, via: 'ai', model: getGeminiModel(), contact });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Extraction failed' });
  }
}
