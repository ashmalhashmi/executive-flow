/** Server-only — Vercel Node ESM safe (no src/ imports). */

export const DAK_EXTRACT_SYSTEM_PROMPT = `You are a dak / outward dispatch register OCR engine for Executive Flow (Pakistan government office — PAFDA-style).

TASK: Read a photo of a handwritten or printed OUTWARD DAK REGISTER page and extract EVERY visible data row into JSON.

REGISTER COLUMNS (match manual register headers exactly):
- registerSr — serial number from Sr# column (integer)
- subject — file subject / matter
- forwardedDate — date dispatched / outward / forwarded
- receivedDate — date received (if column exists; else "")
- designation — marked to / sent to (office, name, designation)

RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no commentary.
2. Schema:
{
  "rows": [
    {
      "registerSr": "number or empty",
      "subject": "string",
      "forwardedDate": "string (YYYY-MM-DD preferred, or DD-MM-YYYY)",
      "receivedDate": "string or empty",
      "designation": "string"
    }
  ]
}
3. Extract ALL complete rows visible on the page — top to bottom. Do not skip rows.
4. Copy registerSr EXACTLY as printed in the Sr# column — this must match the manual register.
5. Copy text AS-IS — do not rewrite subject or marked to.
6. Pakistan dates: DD-MM-YYYY or DD/MM/YYYY → convert to YYYY-MM-DD when confident.
7. Do not invent data — skip blank rows; use "" for unreadable cells in an otherwise valid row.
8. designation = recipient (TO whom dak was sent) — not sender.
9. Strip column headers (Sr, Subject, Date, Marked To, etc.) — data rows only.
10. If image is a single letter (not register), return one row with empty registerSr.`;

export function buildDakExtractUserPrompt() {
  return `Extract all dak register rows from this image. Return JSON with "rows" array only. Include registerSr from Sr# column.`;
}

export function stripJsonFences(text) {
  let value = String(text || '').trim();
  if (value.startsWith('```')) {
    value = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return value.trim();
}

function normalizeIsoDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dash = s.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/);
  if (dash) {
    const dd = Number(dash[1]);
    const mm = Number(dash[2]);
    const yyyy = Number(dash[3]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const dd = Number(slash[1]);
    const mm = Number(slash[2]);
    const yyyy = Number(slash[3]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }

  return s;
}

function parseRegisterSr(raw) {
  const n = Number.parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function normalizeExtractedDak(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const registerSr = parseRegisterSr(raw.registerSr ?? raw.sr ?? raw.serialNo ?? raw.serial);
  return {
    registerSr: registerSr > 0 ? registerSr : 0,
    subject: String(raw.subject ?? raw.Subject ?? raw.matter ?? '').trim(),
    forwardedDate: normalizeIsoDate(
      raw.forwardedDate ?? raw.dispatchDate ?? raw.dispatchedDate ?? raw.date,
    ),
    receivedDate: normalizeIsoDate(raw.receivedDate ?? raw.dateReceived),
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

function collectRowArrays(parsed) {
  if (!parsed || typeof parsed !== 'object') return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.rows)) return parsed.rows;
  if (Array.isArray(parsed.entries)) return parsed.entries;
  if (Array.isArray(parsed.data)) return parsed.data;
  if (Array.isArray(parsed.items)) return parsed.items;
  return [];
}

export function normalizeExtractedDakRows(raw) {
  const arrays = collectRowArrays(raw);
  if (arrays.length) {
    return arrays.map(normalizeExtractedDak).filter(rowHasContent);
  }

  const single = normalizeExtractedDak(raw);
  return single && rowHasContent(single) ? [single] : [];
}

export function parseExtractedDakJson(raw) {
  const cleaned = stripJsonFences(raw);
  if (!cleaned) return [];

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const arr = JSON.parse(arrayMatch[0]);
        if (Array.isArray(arr)) {
          return arr.map(normalizeExtractedDak).filter(rowHasContent);
        }
      } catch {
        /* fall through */
      }
    }

    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!objectMatch) return [];
    try {
      parsed = JSON.parse(objectMatch[0]);
    } catch {
      return [];
    }
  }

  return normalizeExtractedDakRows(parsed);
}

export function extractGeminiText(data) {
  const candidate = data?.candidates?.[0];
  if (!candidate) return { text: '', reason: 'no_candidate' };

  const parts = candidate.content?.parts || [];
  const text = parts.map((part) => part.text || '').join('').trim();
  const reason =
    candidate.finishReason ||
    data?.promptFeedback?.blockReason ||
    (text ? '' : 'empty_response');

  return { text, reason };
}
