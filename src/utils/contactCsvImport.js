import { parseCsvText } from './csvImport';
import { normalizeContactList } from './contactEntries';

/** UI + import — har field ka label aur required flag */
export const CONTACT_IMPORT_FIELDS = [
  { key: 'name', label: 'Naam', required: true },
  { key: 'phone', label: 'Phone (mobile)', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'department', label: 'Department', required: false },
  { key: 'designation', label: 'Designation', required: false },
  { key: 'contactNo', label: 'Contact No (office)', required: false },
  { key: 'website', label: 'Official website', required: false },
  { key: 'address', label: 'Address', required: false },
];

/** Dropdown state — har field → CSV column index as string ('' = not mapped) */
export function emptyContactUiColumnMap() {
  return {
    name: '',
    phone: '',
    email: '',
    department: '',
    designation: '',
    contactNo: '',
    website: '',
    address: '',
  };
}

/** UI string → column index (0-based). Index 0 valid hai — null sirf unmapped ke liye */
export function parseColumnIndex(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Mapping Object: field key → column index (number | null) */
export function indexMappingFromUiColumnMap(uiColumnMap) {
  const mapping = {};
  for (const { key } of CONTACT_IMPORT_FIELDS) {
    mapping[key] = parseColumnIndex(uiColumnMap?.[key]);
  }
  return mapping;
}

export function uiColumnMapFromIndexMapping(indexMapping) {
  const ui = emptyContactUiColumnMap();
  for (const { key } of CONTACT_IMPORT_FIELDS) {
    const idx = indexMapping?.[key];
    ui[key] = idx === null || idx === undefined ? '' : String(idx);
  }
  return ui;
}

function findHeaderIndex(headers, patterns) {
  const lower = headers.map((h) => String(h).trim().toLowerCase());
  for (const pattern of patterns) {
    const idx = lower.findIndex((h) => {
      if (typeof pattern === 'string') return h === pattern || h.includes(pattern);
      return pattern.test(h);
    });
    if (idx >= 0) return idx;
  }
  return null;
}

/** Auto-guess → Index mapping object */
export function guessContactColumnMap(headers) {
  return {
    name: findHeaderIndex(headers, ['naam', 'name', 'contact name', 'person', 'full name']),
    phone: findHeaderIndex(headers, ['phone', 'mobile', 'cell', 'mob', 'whatsapp']),
    email: findHeaderIndex(headers, ['email', 'e-mail', 'mail']),
    department: findHeaderIndex(headers, [
      'department',
      'dept',
      'section',
      'division',
      'branch',
      'ministry',
      'organization',
      'organisation',
      'office',
    ]),
    designation: findHeaderIndex(headers, [
      'designation',
      'title',
      'post',
      'rank',
      'position',
      'role',
    ]),
    contactNo: findHeaderIndex(headers, [
      'contact no',
      'contact number',
      'office',
      'tel',
      'telephone',
      'landline',
      'alternate',
      'alt phone',
      'phone 2',
    ]),
    website: findHeaderIndex(headers, [
      'website',
      'web',
      'url',
      'official website',
      'official site',
      'homepage',
    ]),
    address: findHeaderIndex(headers, ['address', 'location', 'office address', 'addr']),
  };
}

/** Ek cell — mapping index se row se value */
export function readCellAtIndex(row, columnIndex) {
  if (columnIndex === null) return '';
  return String(row[columnIndex] ?? '').trim();
}

/** Row Iterator step: ek CSV row + mapping → contact object ya null */
export function applyIndexMappingToRow(row, mapping, rowIndex, batchId) {
  const name = readCellAtIndex(row, mapping.name);
  if (!name) return null;

  const phone = readCellAtIndex(row, mapping.phone);
  const email = readCellAtIndex(row, mapping.email);
  const contactNo = readCellAtIndex(row, mapping.contactNo);
  if (!phone && !email && !contactNo) return null;

  return {
    id: `contact-csv-${batchId}-${rowIndex}`,
    name,
    phone,
    email,
    department: readCellAtIndex(row, mapping.department),
    designation: readCellAtIndex(row, mapping.designation),
    contactNo,
    website: readCellAtIndex(row, mapping.website),
    address: readCellAtIndex(row, mapping.address),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Row Iterator: har row par mapping apply */
export function iterateRowsToContacts(rows, indexMapping) {
  if (indexMapping.name === null) return [];

  const batchId = Date.now();
  const contacts = [];

  for (let i = 0; i < rows.length; i += 1) {
    const contact = applyIndexMappingToRow(rows[i], indexMapping, i, batchId);
    if (contact) contacts.push(contact);
  }

  return contacts;
}

/** UI column map se import (dropdown values) */
export function rowsToContacts(rows, uiColumnMap) {
  const mapping = indexMappingFromUiColumnMap(uiColumnMap);
  return iterateRowsToContacts(rows, mapping);
}

/** Preview — pehli N rows mapped values (robot mapping verify) */
export function previewMappedContactRows(rows, uiColumnMap, limit = 3) {
  const mapping = indexMappingFromUiColumnMap(uiColumnMap);
  if (mapping.name === null) return [];

  const preview = [];
  for (let i = 0; i < rows.length && preview.length < limit; i += 1) {
    const row = rows[i];
    const name = readCellAtIndex(row, mapping.name);
    if (!name) continue;
    preview.push({
      name,
      phone: readCellAtIndex(row, mapping.phone),
      email: readCellAtIndex(row, mapping.email),
      department: readCellAtIndex(row, mapping.department),
      designation: readCellAtIndex(row, mapping.designation),
      contactNo: readCellAtIndex(row, mapping.contactNo),
      website: readCellAtIndex(row, mapping.website),
      address: readCellAtIndex(row, mapping.address),
    });
  }
  return preview;
}

export function describeIndexMapping(indexMapping, headers) {
  return CONTACT_IMPORT_FIELDS.map(({ key, label }) => {
    const idx = indexMapping[key];
    if (idx === null) return `${label}: —`;
    const header = headers[idx] || `Column ${idx + 1}`;
    return `${label} ← "${header}" (col ${idx + 1})`;
  });
}

export async function readContactCsvFile(file) {
  const text = await file.text();
  return parseCsvText(text);
}

export function parseContactJsonFile(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON file valid nahi — sahi format choose karein');
  }

  if (Array.isArray(parsed)) {
    return normalizeContactList(parsed).map((c, i) => ({
      ...c,
      id: `contact-csv-${Date.now()}-${i}`,
    }));
  }

  const data = parsed.data ?? parsed;
  if (Array.isArray(data?.contacts)) {
    return normalizeContactList(data.contacts).map((c, i) => ({
      ...c,
      id: `contact-csv-${Date.now()}-${i}`,
    }));
  }

  throw new Error('JSON mein contacts array nahi mila');
}

export async function readContactImportFile(file) {
  const name = String(file.name || '').toLowerCase();
  if (name.endsWith('.json')) {
    const text = await file.text();
    const contacts = parseContactJsonFile(text);
    return { type: 'json', headers: [], rows: [], contacts };
  }
  if (name.endsWith('.csv') || file.type.includes('csv') || file.type === 'text/plain') {
    const { headers, rows } = await readContactCsvFile(file);
    return { type: 'csv', headers, rows, contacts: [] };
  }
  throw new Error('Sirf CSV ya JSON file support hai (.csv, .json)');
}
