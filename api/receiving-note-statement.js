const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

const SYSTEM = `You write a single formal English paragraph for a Pakistani government office Receiving Note (PAFDA).
Rules:
- Output STRICT JSON only: {"statement":"..."}
- One polished paragraph only (2–4 sentences max).
- Confirm goods received; mention Order No. and Vendor if provided.
- Do not invent quantities or items not in the user notes.
- No salutation, no signature, no bullet list, no title.`;

function buildUserPrompt({ orderNo, vendor, itemsReceived, date }) {
  return [
    'Write the receiving statement from these facts:',
    `Order No.: ${orderNo || '(none)'}`,
    `Vendor: ${vendor || '(none)'}`,
    `Date: ${date || '(none)'}`,
    `Items / qty notes from operator:`,
    String(itemsReceived || '').trim() || '(none)',
  ].join('\n');
}

function parseStatement(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return '';
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return '';
    const parsed = JSON.parse(text.slice(start, end + 1));
    return String(parsed?.statement || '').trim();
  } catch {
    return '';
  }
}

function localStatement({ orderNo, vendor, itemsReceived }) {
  const items = String(itemsReceived || '').trim() || 'the ordered goods';
  const ord = String(orderNo || '').trim();
  const ven = String(vendor || '').trim();
  let s = 'It is hereby confirmed that the following have been received';
  if (ord) s += ` against Order No. ${ord}`;
  if (ven) s += ` from ${ven}`;
  s += `: ${items.replace(/\s+/g, ' ').trim()}.`;
  return s;
}

/**
 * POST /api/receiving-note-statement
 * Body: { orderNo, vendor, itemsReceived, date? }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const orderNo = String(body.orderNo || '').trim();
  const vendor = String(body.vendor || '').trim();
  const itemsReceived = String(body.itemsReceived || '').trim();
  const date = String(body.date || '').trim();

  if (!itemsReceived) {
    return res.status(400).json({ error: 'itemsReceived required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      statement: localStatement({ orderNo, vendor, itemsReceived }),
      via: 'template',
      code: 'NO_API_KEY',
    });
  }

  try {
    const model = getGeminiModel();
    const generationConfig = {
      temperature: 0.3,
      responseMimeType: 'application/json',
    };
    if (model.includes('2.5-flash')) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${SYSTEM}\n\n${buildUserPrompt({ orderNo, vendor, itemsReceived, date })}`,
              },
            ],
          },
        ],
        generationConfig,
      }),
    });

    const data = await geminiRes.json().catch(() => ({}));
    if (!geminiRes.ok) {
      throw new Error(data?.error?.message || `Gemini API error (${geminiRes.status})`);
    }

    const rawText =
      data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
    const statement = parseStatement(rawText);
    if (!statement) throw new Error('AI statement invalid JSON');

    return res.status(200).json({ statement, via: 'ai' });
  } catch (err) {
    return res.status(200).json({
      statement: localStatement({ orderNo, vendor, itemsReceived }),
      via: 'template',
      warning: err.message || 'AI failed — local statement used.',
    });
  }
}
