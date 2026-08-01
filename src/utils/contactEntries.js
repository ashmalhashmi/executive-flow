/** Contact normalization, deduplication — shared contact data layer. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;

function isGoogleSearchUrl(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  return (
    (host === 'google.com' || host.endsWith('.google.com')) &&
    url.pathname === '/search' &&
    url.searchParams.has('q')
  );
}

export function normalizePhoneDigits(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return digits;
}

/** Consistent display format — PK mobile, landline, international. */
export function standardizePhoneDisplay(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  const intl = normalizePhoneDigits(trimmed);

  if (intl.startsWith('92') && intl.length === 12 && intl[2] === '3') {
    return `+92 ${intl.slice(2, 5)} ${intl.slice(5)}`;
  }

  if (digits.startsWith('03') && digits.length === 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  if (digits.startsWith('0') && digits.length >= 10 && digits.length <= 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  if (intl.startsWith('92') && intl.length >= 10) {
    return `+${intl.slice(0, 2)} ${intl.slice(2)}`;
  }

  return trimmed;
}

/** Split on comma/semicolon/newline before digit normalization — avoids merging multiple numbers. */
export function parsePhonesInput(raw) {
  if (Array.isArray(raw)) {
    return raw.map((value) => String(value ?? '').trim()).filter(Boolean);
  }
  return String(raw ?? '')
    .split(/[,;\n]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function standardizePhoneList(raw) {
  const unique = [];
  const seen = new Set();

  for (const part of parsePhonesInput(raw)) {
    const display = standardizePhoneDisplay(part);
    if (!display) continue;
    const digits = normalizePhoneDigits(display);
    if (!digits || digits.length < 7) continue;
    if (seen.has(digits)) continue;
    seen.add(digits);
    unique.push(display);
  }

  return unique;
}

export function getContactPhones(contact) {
  if (Array.isArray(contact?.phones) && contact.phones.length) {
    return standardizePhoneList(contact.phones);
  }
  return standardizePhoneList(contact?.phone);
}

export function getContactContactNos(contact) {
  if (Array.isArray(contact?.contactNos) && contact.contactNos.length) {
    return standardizePhoneList(contact.contactNos);
  }
  return standardizePhoneList(contact?.contactNo);
}

export function formatPhonesForForm(contact) {
  return getContactPhones(contact).join(', ');
}

export function formatContactNosForForm(contact) {
  return getContactContactNos(contact).join(', ');
}

export function parseEmailsInput(raw) {
  if (Array.isArray(raw)) {
    return raw.map((value) => String(value ?? '').trim().toLowerCase()).filter(Boolean);
  }
  return String(raw ?? '')
    .split(/[,;\n]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function standardizeEmails(raw) {
  const unique = [];
  const seen = new Set();

  for (const candidate of parseEmailsInput(raw)) {
    if (!EMAIL_RE.test(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    unique.push(candidate);
  }

  return unique;
}

export function getContactEmails(contact) {
  if (Array.isArray(contact?.emails) && contact.emails.length) {
    return standardizeEmails(contact.emails);
  }
  return standardizeEmails(contact?.email);
}

export function formatEmailsForForm(contact) {
  return getContactEmails(contact).join(', ');
}

export function standardizeEmail(raw) {
  const [first] = standardizeEmails(raw);
  return first || '';
}

export function standardizeWebsite(raw) {
  let value = String(raw ?? '').trim();
  if (!value) return '';
  if (!/^https?:\/\//i.test(value) && URL_RE.test(value)) {
    value = `https://${value}`;
  }
  try {
    const url = new URL(value);
    if (isGoogleSearchUrl(url)) return '';
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href.replace(/\/$/, '');
    }
  } catch {
    /* keep trimmed value */
  }
  return value;
}

export function standardizeContactRecord(contact) {
  if (!contact || typeof contact !== 'object') return null;

  const name = String(contact.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name) return null;

  const emails = standardizeEmails(contact.emails ?? contact.email);
  const phones = standardizePhoneList(contact.phones ?? contact.phone);
  const contactNos = standardizePhoneList(contact.contactNos ?? contact.contactNo);

  return {
    id: String(contact.id || `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    name,
    phones,
    phone: phones[0] || '',
    emails,
    email: emails[0] || '',
    department: String(contact.department ?? '').trim(),
    designation: String(contact.designation ?? '').trim(),
    contactNos,
    contactNo: contactNos[0] || '',
    website: standardizeWebsite(contact.website),
    address: String(contact.address ?? '').trim(),
    status: contact.status === 'archived' ? 'archived' : 'active',
    createdAt: contact.createdAt || new Date().toISOString(),
    updatedAt: contact.updatedAt || contact.createdAt || new Date().toISOString(),
  };
}

export function normalizeContactList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(standardizeContactRecord).filter(Boolean);
}

function pickRicherString(a, b) {
  const left = String(a ?? '').trim();
  const right = String(b ?? '').trim();
  if (!left) return right;
  if (!right) return left;
  return right.length > left.length ? right : left;
}

function preferContactId(a, b) {
  const aManual = !String(a?.id ?? '').startsWith('contact-csv-');
  const bManual = !String(b?.id ?? '').startsWith('contact-csv-');
  if (aManual && !bManual) return a.id;
  if (bManual && !aManual) return b.id;
  return a.id;
}

/** Merge two records — keep the fullest field values. */
export function mergeContactRecords(primary, secondary) {
  const a = standardizeContactRecord(primary);
  const b = standardizeContactRecord(secondary);
  if (!a) return b;
  if (!b) return a;

  const aUpdated = Date.parse(a.updatedAt) || 0;
  const bUpdated = Date.parse(b.updatedAt) || 0;
  const newer = bUpdated > aUpdated ? b : a;
  const older = newer === b ? a : b;

  const mergedEmails = [...new Set([...getContactEmails(a), ...getContactEmails(b)])];
  const mergedPhones = standardizePhoneList([...getContactPhones(a), ...getContactPhones(b)]);
  const mergedContactNos = standardizePhoneList([...getContactContactNos(a), ...getContactContactNos(b)]);

  return {
    id: preferContactId(a, b),
    name: pickRicherString(a.name, b.name),
    phones: mergedPhones,
    phone: mergedPhones[0] || '',
    emails: mergedEmails,
    email: mergedEmails[0] || '',
    department: pickRicherString(a.department, b.department),
    designation: pickRicherString(a.designation, b.designation),
    contactNos: mergedContactNos,
    contactNo: mergedContactNos[0] || '',
    website: pickRicherString(a.website, b.website),
    address: pickRicherString(a.address, b.address),
    status: a.status === 'archived' || b.status === 'archived' ? 'archived' : 'active',
    createdAt:
      (Date.parse(a.createdAt) || Infinity) < (Date.parse(b.createdAt) || Infinity)
        ? a.createdAt
        : b.createdAt,
    updatedAt: new Date(Math.max(aUpdated, bUpdated) || Date.now()).toISOString(),
  };
}

/** Dedupe keys — same mobile, office line, or email = same person. */
export function getContactDedupeKeys(contact) {
  const keys = new Set();
  const record = standardizeContactRecord(contact);
  if (!record) return [];

  const mobileDigits = new Set();
  for (const phone of getContactPhones(record)) {
    const mobile = normalizePhoneDigits(phone);
    if (mobile.length >= 10) {
      keys.add(`phone:${mobile}`);
      mobileDigits.add(mobile);
    }
  }
  for (const contactNo of getContactContactNos(record)) {
    const office = normalizePhoneDigits(contactNo);
    if (office.length >= 7 && !mobileDigits.has(office)) keys.add(`office:${office}`);
  }
  for (const email of getContactEmails(record)) {
    keys.add(`email:${email}`);
  }

  return [...keys];
}

export function contactsShareDedupeKey(a, b) {
  const aKeys = new Set(getContactDedupeKeys(a));
  return getContactDedupeKeys(b).some((key) => aKeys.has(key));
}

export function findDuplicateContact(contacts, payload, excludeId = '') {
  const probe = standardizeContactRecord({
    ...payload,
    id: excludeId || 'probe',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (!probe) return null;

  const probeKeys = getContactDedupeKeys(probe);
  if (!probeKeys.length) return null;

  for (const contact of contacts || []) {
    if (contact.id === excludeId || contact.status === 'archived') continue;
    if (contactsShareDedupeKey(probe, contact)) return contact;
  }
  return null;
}

/** Remove / merge repeat entries — newest richest record wins per dedupe key. */
export function dedupeContactList(contacts) {
  const sorted = [...(contacts || [])]
    .map(standardizeContactRecord)
    .filter(Boolean)
    .sort((a, b) => (Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0));

  const keyOwners = new Map();
  const mergedById = new Map();

  for (const contact of sorted) {
    const keys = getContactDedupeKeys(contact);
    let ownerId = null;

    for (const key of keys) {
      if (keyOwners.has(key)) {
        ownerId = keyOwners.get(key);
        break;
      }
    }

    if (ownerId && mergedById.has(ownerId)) {
      const merged = mergeContactRecords(mergedById.get(ownerId), contact);
      mergedById.set(merged.id, merged);
      for (const key of getContactDedupeKeys(merged)) {
        keyOwners.set(key, merged.id);
      }
      if (merged.id !== ownerId) {
        mergedById.delete(ownerId);
      }
      continue;
    }

    mergedById.set(contact.id, contact);
    for (const key of keys) {
      keyOwners.set(key, contact.id);
    }
  }

  return [...mergedById.values()].sort(
    (a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0),
  );
}

export function prepareContactStore(raw) {
  return dedupeContactList(normalizeContactList(raw));
}

export function buildContactCardText(contact) {
  const lines = [`👤 ${contact.name}`];
  if (contact.department) lines.push(`🏢 ${contact.department}`);
  if (contact.designation) lines.push(`💼 ${contact.designation}`);
  const phones = getContactPhones(contact);
  const contactNos = getContactContactNos(contact);
  if (phones.length) lines.push(`📱 ${phones.join(', ')}`);
  if (contactNos.length) lines.push(`☎️ ${contactNos.join(', ')}`);
  const emails = getContactEmails(contact);
  if (emails.length) lines.push(`✉️ ${emails.join(', ')}`);
  if (contact.website) lines.push(`🌐 ${contact.website}`);
  if (contact.address) lines.push(`📍 ${contact.address}`);
  return lines.join('\n');
}

/** Contacts created via CSV/JSON file import */
export function isFileImportedContact(contact) {
  return String(contact?.id ?? '').startsWith('contact-csv-');
}

export function countFileImportedContacts(contacts) {
  return (contacts || []).filter(isFileImportedContact).length;
}

export function withoutFileImportedContacts(contacts) {
  return (contacts || []).filter((c) => !isFileImportedContact(c));
}
