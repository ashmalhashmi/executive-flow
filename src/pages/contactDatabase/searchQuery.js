/** Contact Database only — search query optimization. */

export const CONTACT_SEARCH_FIELDS = [
  'name',
  'department',
  'designation',
  'phone',
  'contactNo',
  'email',
  'website',
  'address',
];

const PHRASE_INTENTS = [
  { pattern: /\bofficial\s+website\b/gi, fields: ['website'] },
  { pattern: /\bofficial\s+site\b/gi, fields: ['website'] },
  { pattern: /\bdepartment\b/gi, fields: ['department'] },
  { pattern: /\bdept\.?\b/gi, fields: ['department'] },
  { pattern: /\bcontact\s+number\b/gi, fields: ['phone', 'contactNo'] },
  { pattern: /\bcontact\s+no\.?\b/gi, fields: ['contactNo', 'phone'] },
  { pattern: /\boffice\s+number\b/gi, fields: ['contactNo'] },
  { pattern: /\bphone\s+number\b/gi, fields: ['phone'] },
  { pattern: /\bweb\s*site\b/gi, fields: ['website'] },
  { pattern: /\bwebsite\b/gi, fields: ['website'] },
  { pattern: /\bdesignation\b/gi, fields: ['designation'] },
  { pattern: /\bemail\b/gi, fields: ['email'] },
  { pattern: /\baddress\b/gi, fields: ['address'] },
  { pattern: /\bnaam\b/gi, fields: ['name'] },
  { pattern: /\bphone\b/gi, fields: ['phone'] },
  { pattern: /\bmobile\b/gi, fields: ['phone'] },
];

export const FIELD_ALIAS_TOKENS = {
  name: ['name', 'naam', 'person'],
  department: ['department', 'dept', 'section', 'division', 'branch', 'ministry', 'organization'],
  designation: ['designation', 'title', 'post', 'rank', 'role', 'manzil', 'mansab'],
  phone: ['phone', 'mobile', 'cell', 'mob', 'whatsapp', 'cellphone'],
  contactNo: ['contact', 'number', 'contactno', 'office', 'landline', 'tel', 'alternate', 'ext'],
  email: ['email', 'mail', 'e-mail', 'inbox'],
  website: ['website', 'web', 'site', 'url', 'official', 'homepage', 'portal'],
  address: ['address', 'location', 'pata', 'office-address'],
};

export function parseContactSearchQuery(rawQuery) {
  let working = String(rawQuery ?? '').trim();
  const fieldScopes = new Set();
  const matchedPhrases = [];

  for (const { pattern, fields } of PHRASE_INTENTS) {
    pattern.lastIndex = 0;
    if (!pattern.test(working)) continue;
    pattern.lastIndex = 0;
    working = working.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
    for (const field of fields) fieldScopes.add(field);
    matchedPhrases.push(pattern.source);
  }

  const textTerms = working
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1);

  return {
    raw: String(rawQuery ?? '').trim(),
    textTerms,
    fieldScopes: [...fieldScopes],
    matchedPhrases,
  };
}

export function contactFieldValue(contact, field) {
  if (!contact) return '';
  return String(contact[field] ?? '').trim();
}

export function contactMatchesParsedQuery(contact, parsed) {
  const scopes =
    parsed.fieldScopes.length > 0 ? parsed.fieldScopes : CONTACT_SEARCH_FIELDS;

  if (!parsed.textTerms.length) {
    return scopes.some((field) => contactFieldValue(contact, field));
  }

  return parsed.textTerms.every((term) =>
    scopes.some((field) => {
      const value = contactFieldValue(contact, field).toLowerCase();
      const digitTerm = term.replace(/\D/g, '');
      if (value.includes(term)) return true;
      if (digitTerm && value.replace(/\D/g, '').includes(digitTerm)) return true;
      return false;
    }),
  );
}
