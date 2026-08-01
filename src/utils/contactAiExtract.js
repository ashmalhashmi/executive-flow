import {
  standardizeContactRecord,
  standardizeEmails,
  standardizePhoneList,
} from './contactEntries.js';

export const CONTACT_EXTRACT_SYSTEM_PROMPT = `You are a contact-data extraction engine for Executive Flow (Pakistan government / corporate contacts).

TASK: Convert messy OCR text, visiting-card dumps, WhatsApp forwards, or PDF copy-paste into ONE clean contact JSON object.

RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no commentary.
2. Schema: name, department, designation, phones[], contactNos[], emails[], website, address.
3. Split multiple numbers — NEVER merge. Mobile 03xx → phones. Landline 0xx → contactNos.
4. Strip OCR noise labels. Pakistan phone format. Do not invent missing data.`;

export function buildContactExtractUserPrompt(rawText) {
  return `Extract contact fields from this messy input:\n\n---\n${String(rawText || '').trim()}\n---\n\nReturn JSON only.`;
}

export function stripJsonFences(text) {
  let value = String(text || '').trim();
  if (value.startsWith('```')) {
    value = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return value.trim();
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

  if (!parsed || typeof parsed !== 'object') return null;
  return normalizeExtractedContact(parsed);
}

export function normalizeExtractedContact(raw) {
  const phones = standardizePhoneList(
    Array.isArray(raw.phones) ? raw.phones : raw.phone ? [raw.phone] : [],
  );
  const contactNos = standardizePhoneList(
    Array.isArray(raw.contactNos)
      ? raw.contactNos
      : raw.contactNo
        ? [raw.contactNo]
        : [],
  );
  const emails = standardizeEmails(Array.isArray(raw.emails) ? raw.emails : raw.email);

  return {
    name: String(raw.name ?? '').trim(),
    department: String(raw.department ?? '').trim(),
    designation: String(raw.designation ?? '').trim(),
    phones,
    contactNos,
    emails,
    website: String(raw.website ?? '').trim(),
    address: String(raw.address ?? '').trim(),
  };
}

export function extractedContactToForm(extracted) {
  const contact = normalizeExtractedContact(extracted || {});
  return {
    name: contact.name,
    department: contact.department,
    designation: contact.designation,
    phone: contact.phones.join(', '),
    contactNo: contact.contactNos.join(', '),
    email: contact.emails.join(', '),
    website: contact.website,
    address: contact.address,
  };
}

export function formFieldsToContactPayload(form) {
  const phones = standardizePhoneList(form.phone);
  const contactNos = standardizePhoneList(form.contactNo);
  const emails = standardizeEmails(form.email);

  return {
    name: String(form.name ?? '').trim(),
    department: String(form.department ?? '').trim(),
    designation: String(form.designation ?? '').trim(),
    phones,
    phone: phones[0] || '',
    contactNos,
    contactNo: contactNos[0] || '',
    emails,
    email: emails[0] || '',
    website: String(form.website ?? '').trim(),
    address: String(form.address ?? '').trim(),
  };
}

export function validateContactFormFields(form) {
  const errors = {};
  if (!String(form.name ?? '').trim()) errors.name = 'Naam zaroori hai';

  const emails = standardizeEmails(form.email);
  const parsedEmailCount = String(form.email ?? '')
    .split(/[,;\n]+/)
    .map((v) => v.trim())
    .filter(Boolean).length;
  if (form.email?.trim() && emails.length !== parsedEmailCount) {
    errors.email = 'Har email valid honi chahiye';
  }

  const phones = standardizePhoneList(form.phone);
  const contactNos = standardizePhoneList(form.contactNo);
  if (!phones.length && !contactNos.length && !emails.length) {
    errors.phone = 'Kam az kam phone, contact no ya email chahiye';
  }

  return errors;
}

const PHONE_RE =
  /(?:\+92[\s-]?)?0?3\d{2}[\s-]?\d{7}|(?:\+92[\s-]?)?0\d{2,3}[\s-]?\d{6,8}|\+92[\s-]?\d{2,3}[\s-]?\d{6,8}/g;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const URL_RE = /https?:\/\/[^\s]+|www\.[a-z0-9.-]+\.[a-z]{2,}[^\s]*/gi;

export function extractContactLocally(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;

  const emails = [...new Set((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))];
  const websites = text.match(URL_RE) || [];

  const phoneHits = [];
  let match;
  const phoneRe = new RegExp(PHONE_RE.source, PHONE_RE.flags);
  while ((match = phoneRe.exec(text)) !== null) {
    phoneHits.push(match[0]);
  }

  const phones = [];
  const contactNos = [];
  for (const hit of phoneHits) {
    const digits = hit.replace(/\D/g, '');
    const isMobile = digits.startsWith('03') || (digits.startsWith('923') && digits.length >= 12);
    const list = isMobile ? phones : contactNos;
    for (const n of standardizePhoneList([hit])) {
      if (!list.includes(n)) list.push(n);
    }
  }

  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  let name = '';
  let designation = '';
  let department = '';
  const designationHints =
    /\b(director|manager|secretary|officer|assistant|ceo|cfo|gm|dg|ps|pa|advisor|consultant|head|chief|president|chairman|minister|deputy|additional|joint)\b/i;

  for (const line of lines) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line)) continue;
    if (!name && line.length >= 3 && line.length <= 60) {
      name = line.replace(/^(mr\.?|mrs\.?|ms\.?|dr\.?)\s+/i, '').trim();
      continue;
    }
    if (!designation && designationHints.test(line)) {
      designation = line;
      continue;
    }
    if (
      !department &&
      /\b(ministry|department|dept|division|section|bureau|authority|board|commission|corp|ltd|limited|bank)\b/i.test(
        line,
      )
    ) {
      department = line;
    }
  }

  const addressLines = lines.filter(
    (line) =>
      line !== name &&
      line !== designation &&
      line !== department &&
      !EMAIL_RE.test(line) &&
      !URL_RE.test(line) &&
      !PHONE_RE.test(line) &&
      line.length > 12,
  );

  return normalizeExtractedContact({
    name,
    department,
    designation,
    phones,
    contactNos,
    emails,
    website: websites[0] || '',
    address: addressLines.slice(0, 2).join(', '),
  });
}

export async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function extractContactWithAi({ text, imageFile }) {
  const rawText = String(text || '').trim();
  const body = { text: rawText };

  if (imageFile) {
    body.imageBase64 = await fileToBase64(imageFile);
    body.imageMimeType = imageFile.type || 'image/jpeg';
  }

  if (!rawText && !body.imageBase64) {
    throw new Error('Text paste karein ya card ki photo upload karein');
  }

  try {
    const res = await fetch('/api/extract-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const apiUnavailable =
        res.status === 503 || res.status === 500 || data.code === 'NO_API_KEY';

      if (apiUnavailable) {
        if (!rawText) {
          throw new Error(
            data.error ||
              'AI configure nahi — GEMINI_API_KEY Vercel par set karein (scripts/setup-gemini-env.ps1)',
          );
        }
        return {
          contact: extractContactLocally(rawText),
          via: 'local',
          warning:
            data.error ||
            'AI unavailable — basic local parse. GEMINI_API_KEY set karein for full AI + card photo.',
        };
      }
      throw new Error(data.error || 'AI extraction failed');
    }

    const contact = normalizeExtractedContact(data.contact);
    if (!contact.name && !contact.phones.length && !contact.contactNos.length && !contact.emails.length) {
      throw new Error('AI ne koi contact field nahi nikala — text check karein');
    }

    return { contact, via: data.via || 'ai', warning: data.warning || '' };
  } catch (err) {
    if (rawText && err.message !== 'AI configure nahi — GEMINI_API_KEY Vercel par set karein (scripts/setup-gemini-env.ps1)') {
      const local = extractContactLocally(rawText);
      if (local?.name || local?.phones?.length || local?.emails?.length) {
        return { contact: local, via: 'local', warning: err.message || 'AI unavailable — local parse used' };
      }
    }
    throw err;
  }
}

export function previewContactFromForm(form) {
  return standardizeContactRecord({
    id: 'preview',
    ...formFieldsToContactPayload(form),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
