import {
  MUHASABA_SYSTEM_PROMPT,
  buildMuhasabaUserPrompt,
  parseMuhasabaEvaluationJson,
} from './_lib/muhasabaEvaluate.js';

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

async function callGemini({ apiKey, deedText }) {
  const model = getGeminiModel();
  const generationConfig = {
    temperature: 0.4,
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
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${MUHASABA_SYSTEM_PROMPT}\n\n${buildMuhasabaUserPrompt(deedText)}`,
            },
          ],
        },
      ],
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

  const parsed = parseMuhasabaEvaluationJson(rawText);
  if (!parsed) throw new Error('AI response valid JSON nahi thi');
  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const deedText = String(req.body?.deedText || req.body?.deed_text || '').trim();
  if (!deedText) {
    return res.status(400).json({ error: 'deedText required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI not configured — set GEMINI_API_KEY',
      code: 'NO_API_KEY',
    });
  }

  try {
    const result = await callGemini({ apiKey, deedText });
    return res.status(200).json({
      ok: true,
      via: 'ai',
      model: getGeminiModel(),
      ...result,
    });
  } catch (err) {
    return res.status(502).json({
      error: err.message || 'Muhasaba evaluation failed',
      code: 'AI_FAILED',
    });
  }
}
