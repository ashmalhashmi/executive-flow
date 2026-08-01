/** Contact Database only — indexed local search. */

import { normalizePhoneDigits, getContactEmails, getContactPhones, getContactContactNos } from '../../utils/contactEntries';
import {
  CONTACT_SEARCH_FIELDS,
  FIELD_ALIAS_TOKENS,
  contactFieldValue,
  contactMatchesParsedQuery,
  parseContactSearchQuery,
} from './searchQuery';

export const ALL_DEPARTMENTS_ID = 'all';
export const UNASSIGNED_DEPARTMENT_ID = 'unassigned';

function tokenizeContactText(value) {
  return String(value ?? '')
    .toLowerCase()
    .split(/[^a-z0-9@.+]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function getDepartmentLabel(contact) {
  return (
    String(contact?.department ?? '').trim() ||
    String(contact?.designation ?? '').trim() ||
    'Unassigned'
  );
}

export function getDepartmentId(label) {
  const normalized = String(label ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || UNASSIGNED_DEPARTMENT_ID;
}

export function buildContactSearchIndex(contacts) {
  const active = (contacts || [])
    .filter((c) => c.status !== 'archived')
    .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
  const byId = new Map();
  const tokenToIds = new Map();
  const departmentToContactIds = new Map([[ALL_DEPARTMENTS_ID, []]]);
  const departmentLabels = new Map();
  const fieldTokenToIds = Object.fromEntries(
    CONTACT_SEARCH_FIELDS.map((field) => [field, new Map()]),
  );

  const linkToken = (token, id, field = null) => {
    const key = String(token ?? '').toLowerCase();
    if (!key) return;
    if (!tokenToIds.has(key)) tokenToIds.set(key, new Set());
    tokenToIds.get(key).add(id);
    if (field && fieldTokenToIds[field]) {
      if (!fieldTokenToIds[field].has(key)) fieldTokenToIds[field].set(key, new Set());
      fieldTokenToIds[field].get(key).add(id);
    }
  };

  const indexField = (field, value, id) => {
    if (!value) return;
    linkToken(String(value).toLowerCase(), id, field);
    for (const token of tokenizeContactText(value)) {
      linkToken(token, id, field);
    }
    for (const alias of FIELD_ALIAS_TOKENS[field] || []) {
      linkToken(alias, id, field);
    }
  };

  for (const contact of active) {
    byId.set(contact.id, contact);

    const departmentLabel = getDepartmentLabel(contact);
    const departmentId = getDepartmentId(departmentLabel);
    departmentLabels.set(departmentId, departmentLabel);
    departmentToContactIds.get(ALL_DEPARTMENTS_ID).push(contact.id);
    if (!departmentToContactIds.has(departmentId)) departmentToContactIds.set(departmentId, []);
    departmentToContactIds.get(departmentId).push(contact.id);

    indexField('name', contact.name, contact.id);
    indexField('department', contact.department, contact.id);
    indexField('designation', contact.designation, contact.id);
    for (const email of getContactEmails(contact)) {
      indexField('email', email, contact.id);
    }
    indexField('website', contact.website, contact.id);
    indexField('address', contact.address, contact.id);

    const indexPhoneField = (field, phone, id) => {
      indexField(field, phone, id);
      const digits = normalizePhoneDigits(phone);
      if (!digits) return;
      linkToken(digits, id, field);
      linkToken(digits.slice(-4), id, field);
      if (digits.startsWith('92')) linkToken(`0${digits.slice(2)}`, id, field);
    };

    for (const phone of getContactPhones(contact)) {
      indexPhoneField('phone', phone, contact.id);
    }
    for (const contactNo of getContactContactNos(contact)) {
      indexPhoneField('contactNo', contactNo, contact.id);
    }
  }

  const orderedIds = departmentToContactIds.get(ALL_DEPARTMENTS_ID);
  const departmentOptions = [...departmentLabels.entries()]
    .map(([id, label]) => ({
      id,
      label,
      count: departmentToContactIds.get(id)?.length ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    byId,
    tokenToIds,
    fieldTokenToIds,
    orderedIds,
    departmentToContactIds,
    departmentOptions,
  };
}

export function getContactIdsForDepartment(index, departmentId = ALL_DEPARTMENTS_ID) {
  const key = departmentId || ALL_DEPARTMENTS_ID;
  return index.departmentToContactIds.get(key) || [];
}

function collectIdsForTerm(index, term, fieldScopes = []) {
  const matches = new Set();
  const lower = term.toLowerCase();
  const digitTerm = term.replace(/\D/g, '');

  const maps =
    fieldScopes.length > 0
      ? fieldScopes.map((field) => index.fieldTokenToIds[field]).filter(Boolean)
      : [index.tokenToIds];

  for (const tokenMap of maps) {
    for (const [token, ids] of tokenMap) {
      if (token.includes(lower) || (digitTerm && token.includes(digitTerm))) {
        for (const id of ids) matches.add(id);
      }
    }
  }

  return matches;
}

function idsToContacts(index, ids) {
  return ids.map((id) => index.byId.get(id)).filter(Boolean);
}

export function searchContactsIndex(index, query, options = {}) {
  const parsed = parseContactSearchQuery(query);
  const candidateIds = options.candidateIds || index.orderedIds;
  const candidateSet = new Set(candidateIds);

  if (!parsed.raw) {
    return idsToContacts(index, candidateIds);
  }

  if (!parsed.textTerms.length && parsed.fieldScopes.length) {
    return idsToContacts(index, candidateIds)
      .filter((contact) =>
        parsed.fieldScopes.some((field) => contactFieldValue(contact, field)),
      );
  }

  const terms = parsed.textTerms.length ? parsed.textTerms : [parsed.raw.toLowerCase()];
  let resultIds = null;

  for (const term of terms) {
    const termMatches = collectIdsForTerm(index, term, parsed.fieldScopes);
    resultIds =
      resultIds === null
        ? termMatches
        : new Set([...resultIds].filter((id) => termMatches.has(id)));
    if (!resultIds.size) return [];
  }

  const rank = new Map(index.orderedIds.map((id, i) => [id, i]));
  return [...resultIds]
    .filter((id) => candidateSet.has(id))
    .sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0))
    .map((id) => index.byId.get(id))
    .filter((contact) => contactMatchesParsedQuery(contact, parsed));
}
