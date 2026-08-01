import {
  EXPENDITURE_CATEGORIZE_SYSTEM_PROMPT,
  buildExpenditureCategorizeUserPrompt,
  categorizeExpenditureLocally,
  parseCategorizedExpenditureJson,
} from './_lib/expenditureCategorize.js';

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

async function callGemini({ apiKey, description }) {
  const model = getGeminiModel();
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
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${EXPENDITURE_CATEGORIZE_SYSTEM_PROMPT}\n\n${buildExpenditureCategorizeUserPrompt(description)}`,
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

  const parsed = parseCategorizedExpenditureJson(rawText);
  if (!parsed) throw new Error('AI response valid JSON nahi thi');

  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const description = String(req.body?.description || '').trim();
  if (!description) {
    return res.status(400).json({ error: 'description required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const local = categorizeExpenditureLocally(description);
    return res.status(200).json({
      ok: true,
      via: 'local',
      warning: 'AI not configured — local rules used',
      ...local,
    });
  }

  try {
    const result = await callGemini({ apiKey, description });
    return res.status(200).json({
      ok: true,
      via: 'ai',
      model: getGeminiModel(),
      category: result.category,
      confidence: result.confidence,
    });
  } catch (err) {
    const local = categorizeExpenditureLocally(description);
    return res.status(200).json({
      ok: true,
      via: 'local',
      warning: err.message || 'AI failed — local rules used',
      category: local.category,
      confidence: local.confidence,
    });
  }
}
