/** Server-only — Vercel Node ESM safe (no src/ imports). */

export const CONTACT_EXTRACT_SYSTEM_PROMPT = `You are a contact-data extraction engine for Executive Flow (Pakistan government / corporate contacts).

TASK: Convert messy OCR text, visiting-card dumps, WhatsApp forwards, or PDF copy-paste into ONE clean contact JSON object.

RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no commentary.
2. Use this exact schema:
{
  "name": "string (required if identifiable)",
  "department": "string (ministry, dept, org unit)",
  "designation": "string (job title)",
  "phones": ["string"] (mobile / cell / WhatsApp — Pakistan 03xx or +92 3xx),
  "contactNos": ["string"] (office / landline / PABX / alternate — 0xx city codes),
  "emails": ["string"],
  "website": "string (full URL if present)",
  "address": "string (postal / office address)"
}
3. Split multiple numbers correctly — NEVER merge two numbers into one string.
4. Mobile numbers (03xx) go in "phones". Landline / office (051-, 042-, etc.) go in "contactNos".
5. Strip OCR noise: logos, slogans, "Tel:", "Fax:", "Mob:", "Cell:", "Email:" labels — keep values only.
6. If a field is missing or unreadable, use "" or [] — do not invent data.
7. Names: prefer the person's name, not company name alone — but include org in department if clear.
8. Pakistan context: normalize phones as readable strings (e.g. 0300-1234567, 051-1234567).
9. Multiple emails → all in emails array.`;

export function buildContactExtractUserPrompt(rawText) {
  return `Extract contact fields from this messy input:

---
${String(rawText || '').trim()}
---

Return JSON only.`;
}

export function stripJsonFences(text) {
  let value = String(text || '').trim();
  if (value.startsWith('```')) {
    value = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return value.trim();
}

function asStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  const single = String(value ?? '').trim();
  return single ? [single] : [];
}

export function normalizeRawExtractedContact(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    name: String(raw.name ?? '').trim(),
    department: String(raw.department ?? '').trim(),
    designation: String(raw.designation ?? '').trim(),
    phones: asStringArray(raw.phones ?? raw.phone),
    contactNos: asStringArray(raw.contactNos ?? raw.contactNo),
    emails: asStringArray(raw.emails ?? raw.email).map((e) => e.toLowerCase()),
    website: String(raw.website ?? '').trim(),
    address: String(raw.address ?? '').trim(),
  };
}

export function parseExtractedContactJson(raw) {
  const cleaned = stripJsonFences(raw);
  if (!cleaned) return null;

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  return normalizeRawExtractedContact(parsed);
}
