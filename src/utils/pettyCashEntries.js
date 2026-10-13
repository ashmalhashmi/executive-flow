import { getTodayISO } from './dates';
import {
  computePurchaseItemsTotal,
  emptyPurchaseItem,
  emptyRequestedByPerson,
  normalizePurchaseItems,
  normalizeRequestedByList,
  parsePurchaseNumber,
} from './pettyCashPurchaseSlip';
import {
  emptySatisfactoryNoteFields,
  normalizeReceivedByList,
  normalizeSatisfactoryItems,
} from './pettyCashSatisfactoryNote';

export function emptyPurchaseSlip() {
  return {
    date: getTodayISO(),
    items: [emptyPurchaseItem()],
    justification: '',
    requestedBy: [emptyRequestedByPerson()],
    approvedBy: { name: '', designation: '', date: '' },
    vendor: '',
    invoiceNo: '',
    description: '',
    quantity: '',
    amountPkr: '',
    paymentMode: 'Petty Cash',
    preparedBy: '',
  };
}

export function emptySatisfactoryNote() {
  return emptySatisfactoryNoteFields();
}

export function emptyRefreshmentNote() {
  return {
    date: getTodayISO(),
    meetingId: '',
    meetingTitle: '',
    meetingDate: '',
    itemsIssued: '',
    quantity: '',
    purpose: '',
    receiverName: '',
    receiverDesignation: '',
    issuedByName: '',
    issuedByDesignation: '',
  };
}

function normalizePurchaseSlipFields(purchase) {
  const p = purchase && typeof purchase === 'object' ? purchase : {};
  const items = normalizePurchaseItems(p.items, p);
  const totalEstimatedCost = computePurchaseItemsTotal(items);
  const approved = p.approvedBy && typeof p.approvedBy === 'object' ? p.approvedBy : {};
  const requestedBy = normalizeRequestedByList(p.requestedBy);

  return {
    date: String(p.date ?? '').trim() || getTodayISO(),
    items,
    totalEstimatedCost,
    justification: String(p.justification ?? '').trim(),
    requestedBy,
    approvedBy: {
      name: String(approved.name ?? '').trim(),
      designation: String(approved.designation ?? '').trim(),
      date: String(approved.date ?? '').trim(),
    },
    vendor: String(p.vendor ?? '').trim(),
    invoiceNo: String(p.invoiceNo ?? '').trim(),
    description: String(p.description ?? '').trim(),
    quantity: String(p.quantity ?? '').trim(),
    amountPkr: parseAmount(p.amountPkr) || totalEstimatedCost || '',
    paymentMode: String(p.paymentMode ?? 'Petty Cash').trim(),
    preparedBy: String(p.preparedBy ?? '').trim(),
  };
}

function parseAmount(raw) {
  return parsePurchaseNumber(raw);
}

export function generatePettyCaseNo(cases) {
  const year = new Date().getFullYear();
  const prefix = `PC-${year}-`;
  let max = 0;
  for (const c of cases || []) {
    const no = String(c.caseNo ?? '');
    if (!no.startsWith(prefix)) continue;
    const seq = parseInt(no.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/** One or more invoice page photos — keeps legacy invoicePhotoUrl in sync as first URL. */
export function normalizeInvoicePhotoUrls(raw) {
  const fromArray = Array.isArray(raw?.invoicePhotoUrls)
    ? raw.invoicePhotoUrls.map((u) => String(u ?? '').trim()).filter(Boolean)
    : [];
  const single = String(raw?.invoicePhotoUrl ?? '').trim();
  const urls = [];
  const seen = new Set();
  for (const url of [...fromArray, ...(single ? [single] : [])]) {
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export function normalizePettyCashCase(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const caseNo = String(raw.caseNo ?? '').trim();
  if (!caseNo) return null;

  const purchase = raw.purchaseSlip || raw.purchase || {};
  const satisfactory = raw.satisfactoryNote || raw.satisfactory || {};
  const invoicePhotoUrls = normalizeInvoicePhotoUrls(raw);

  return {
    id: raw.id || `pc-case-${Date.now()}`,
    caseNo,
    meetingId: String(raw.meetingId ?? '').trim(),
    meetingTitle: String(raw.meetingTitle ?? '').trim(),
    meetingDate: String(raw.meetingDate ?? '').trim(),
    invoicePhotoUrl: invoicePhotoUrls[0] || '',
    invoicePhotoUrls,
    purchaseSlip: normalizePurchaseSlipFields(purchase),
    satisfactoryNote: normalizeSatisfactoryNoteFields(satisfactory, purchase),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export function normalizePettyCashCaseList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizePettyCashCase).filter(Boolean);
}

export function normalizeRefreshmentNote(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const itemsIssued = String(raw.itemsIssued ?? '').trim();
  if (!itemsIssued) return null;

  return {
    id: raw.id || `pc-refresh-${Date.now()}`,
    noteNo: String(raw.noteNo ?? '').trim(),
    meetingId: String(raw.meetingId ?? '').trim(),
    meetingTitle: String(raw.meetingTitle ?? '').trim(),
    meetingDate: String(raw.meetingDate ?? '').trim(),
    date: String(raw.date ?? '').trim() || getTodayISO(),
    itemsIssued,
    quantity: String(raw.quantity ?? '').trim(),
    purpose: String(raw.purpose ?? '').trim(),
    receiverName: String(raw.receiverName ?? '').trim(),
    receiverDesignation: String(raw.receiverDesignation ?? '').trim(),
    issuedByName: String(raw.issuedByName ?? '').trim(),
    issuedByDesignation: String(raw.issuedByDesignation ?? '').trim(),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeRefreshmentNoteList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeRefreshmentNote).filter(Boolean);
}

export function generateRefreshmentNoteNo(notes) {
  const year = new Date().getFullYear();
  const prefix = `RN-${year}-`;
  let max = 0;
  for (const n of notes || []) {
    const no = String(n.noteNo ?? '');
    if (!no.startsWith(prefix)) continue;
    const seq = parseInt(no.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function normalizeSatisfactoryNoteFields(satisfactory, purchaseSlip) {
  const s = satisfactory && typeof satisfactory === 'object' ? satisfactory : {};
  const verified = s.verifiedBy && typeof s.verifiedBy === 'object' ? s.verifiedBy : {};

  return {
    items: normalizeSatisfactoryItems(s.items, s, purchaseSlip),
    receivedBy: normalizeReceivedByList(s.receivedBy),
    verifiedBy: {
      name: String(verified.name ?? '').trim(),
      designation: String(verified.designation ?? '').trim(),
      date: String(verified.date ?? '').trim(),
    },
  };
}
