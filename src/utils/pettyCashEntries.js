import { getTodayISO } from './dates';
import {
  computePurchaseItemsTotal,
  emptyPurchaseItem,
  normalizePurchaseItems,
  parsePurchaseNumber,
} from './pettyCashPurchaseSlip';
import {
  emptySatisfactoryNoteFields,
  normalizeSatisfactoryItems,
} from './pettyCashSatisfactoryNote';

export function emptyPurchaseSlip() {
  return {
    date: getTodayISO(),
    items: [emptyPurchaseItem()],
    justification: '',
    requestedBy: { name: '', date: getTodayISO() },
    approvedBy: { name: '', date: '' },
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
  const requested = p.requestedBy && typeof p.requestedBy === 'object' ? p.requestedBy : {};
  const approved = p.approvedBy && typeof p.approvedBy === 'object' ? p.approvedBy : {};

  return {
    date: String(p.date ?? '').trim() || getTodayISO(),
    items,
    totalEstimatedCost,
    justification: String(p.justification ?? '').trim(),
    requestedBy: {
      name: String(requested.name ?? requested.names ?? '').trim(),
      date: String(requested.date ?? '').trim() || String(p.date ?? '').trim() || getTodayISO(),
    },
    approvedBy: {
      name: String(approved.name ?? '').trim(),
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

export function normalizePettyCashCase(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const caseNo = String(raw.caseNo ?? '').trim();
  if (!caseNo) return null;

  const purchase = raw.purchaseSlip || raw.purchase || {};
  const satisfactory = raw.satisfactoryNote || raw.satisfactory || {};

  return {
    id: raw.id || `pc-case-${Date.now()}`,
    caseNo,
    meetingId: String(raw.meetingId ?? '').trim(),
    meetingTitle: String(raw.meetingTitle ?? '').trim(),
    meetingDate: String(raw.meetingDate ?? '').trim(),
    invoicePhotoUrl: String(raw.invoicePhotoUrl ?? '').trim(),
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
  const received = s.receivedBy && typeof s.receivedBy === 'object' ? s.receivedBy : {};
  const verified = s.verifiedBy && typeof s.verifiedBy === 'object' ? s.verifiedBy : {};
  const legacyDate = String(s.date ?? '').trim();

  return {
    items: normalizeSatisfactoryItems(s.items, s, purchaseSlip),
    receivedBy: {
      name: String(received.name ?? '').trim(),
      date: String(received.date ?? '').trim() || legacyDate || getTodayISO(),
    },
    verifiedBy: {
      name: String(verified.name ?? '').trim(),
      date: String(verified.date ?? '').trim(),
    },
  };
}
