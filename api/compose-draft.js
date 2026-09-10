import {
  COMPOSE_DRAFT_SYSTEM_PROMPT,
  COMPOSE_IMPROVE_SYSTEM_PROMPT,
  COMPOSE_EXTRACT_REF_SYSTEM_PROMPT,
  buildComposeDraftUserPrompt,
  buildComposeImproveUserPrompt,
  parseComposeSlotsJson,
  parseComposeReferenceJson,
} from './_lib/composeDraft.js';

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

async function callGemini({ apiKey, systemAndUser, imageBase64, imageMimeType }) {
  const model = getGeminiModel();
  const parts = [{ text: systemAndUser }];

  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: imageMimeType || 'image/jpeg',
        data: imageBase64,
      },
    });
  }

  const generationConfig = {
    temperature: 0.35,
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

  const rawText =
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  if (!rawText.trim()) throw new Error('AI ne koi jawab nahi diya');
  return rawText;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI not configured — set GEMINI_API_KEY',
      code: 'NO_API_KEY',
    });
  }

  try {
    const {
      action = 'generate',
      intent,
      draftBody = '',
      slots: incomingSlots = null,
      imageBase64 = '',
      imageMimeType = 'image/jpeg',
    } = req.body || {};

    if (action === 'extract-reference') {
      if (!String(imageBase64).trim() && !String(draftBody).trim()) {
        return res.status(400).json({ error: 'Reference image or text required' });
      }
      const raw = await callGemini({
        apiKey,
        systemAndUser: `${COMPOSE_EXTRACT_REF_SYSTEM_PROMPT}\n\nExtract reference fields from this letter.`,
        imageBase64: imageBase64 || undefined,
        imageMimeType,
      });
      const parsed = parseComposeReferenceJson(raw);
      if (!parsed) throw new Error('AI reference extract invalid JSON');
      return res.status(200).json({ ...parsed, via: 'ai' });
    }

    if (action === 'improve') {
      if (!incomingSlots && !String(draftBody).trim()) {
        return res.status(400).json({ error: 'slots or draftBody required for improve' });
      }
      const raw = await callGemini({
        apiKey,
        systemAndUser: `${COMPOSE_IMPROVE_SYSTEM_PROMPT}\n\n${buildComposeImproveUserPrompt({
          intent,
          draftBody,
          slots: incomingSlots || {},
        })}`,
      });
      const slots = parseComposeSlotsJson(raw);
      if (!slots) throw new Error('AI improve response invalid slot JSON');
      return res.status(200).json({
        subject: slots.subject,
        addressee: slots.addressee,
        slots,
        via: 'ai',
      });
    }

    // generate — slot JSON only
    if (!intent || typeof intent !== 'object') {
      return res.status(400).json({ error: 'intent object required' });
    }
    const core = String(intent.coreIdeas || '').trim();
    if (!core) {
      return res.status(400).json({ error: 'coreIdeas (Intent) required' });
    }

    const raw = await callGemini({
      apiKey,
      systemAndUser: `${COMPOSE_DRAFT_SYSTEM_PROMPT}\n\n${buildComposeDraftUserPrompt(intent)}`,
    });
    const slots = parseComposeSlotsJson(raw);
    if (!slots) throw new Error('AI response valid slot JSON nahi thi');
    return res.status(200).json({
      subject: slots.subject,
      addressee: slots.addressee,
      slots,
      via: 'ai',
    });
  } catch (err) {
    return res.status(502).json({
      error: err.message || 'Compose AI failed',
    });
  }
}
