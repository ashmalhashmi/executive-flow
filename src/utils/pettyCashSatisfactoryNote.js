import { formatDisplayDate, getTodayISO } from './dates';
import {
  buildSignatoryBlockHtml,
  escapePettyCashHtml,
  PETTY_CASH_TABLE_CELL,
  pettyCashHeadCellStyle,
} from './pettyCashDocFormat';

export const DEFAULT_SATISFACTORY_REMARKS =
  'The above-mentioned goods/services have been received in satisfactory condition and conform to the purchase requirements.';

export function emptySatisfactoryItem() {
  return {
    description: '',
    qtyReceived: '',
    condition: 'Satisfactory',
    remarks: DEFAULT_SATISFACTORY_REMARKS,
  };
}

export function emptySatisfactoryNoteFields() {
  return {
    items: [emptySatisfactoryItem()],
    receivedBy: { name: '', date: getTodayISO() },
    verifiedBy: { name: '', date: '' },
  };
}

export function normalizeSatisfactoryItems(rawItems, legacyNote = {}, purchaseSlip = {}) {
  if (Array.isArray(rawItems) && rawItems.length) {
    return rawItems.map((row) => ({
      description: String(row?.description ?? '').trim(),
      qtyReceived: String(row?.qtyReceived ?? row?.quantity ?? '').trim(),
      condition: String(row?.condition ?? '').trim() || 'Satisfactory',
      remarks: String(row?.remarks ?? '').trim() || DEFAULT_SATISFACTORY_REMARKS,
    }));
  }

  const statement = String(legacyNote.statement ?? '').trim();
  if (statement && !Array.isArray(rawItems)) {
    return [
      {
        description: '',
        qtyReceived: '',
        condition: 'Satisfactory',
        remarks: statement || DEFAULT_SATISFACTORY_REMARKS,
      },
    ];
  }

  const purchaseItems = purchaseSlip?.items;
  if (Array.isArray(purchaseItems) && purchaseItems.length) {
    return purchaseItems.map((row) => ({
      description: '',
      qtyReceived: String(row?.quantity ?? '').trim(),
      condition: 'Satisfactory',
      remarks: DEFAULT_SATISFACTORY_REMARKS,
    }));
  }

  return [emptySatisfactoryItem()];
}

export function resolveSatisfactoryReceivedName(note, requestorSignatories = []) {
  const received = note?.receivedBy || {};
  const fromField = String(received.name ?? '').trim();
  if (fromField) return fromField;
  const sig = Array.isArray(requestorSignatories) ? requestorSignatories[0] : null;
  return String(sig?.name ?? '').trim();
}

export function resolveSatisfactoryDateLine(dateISO) {
  const dateRaw = String(dateISO || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    try {
      return formatDisplayDate(dateRaw);
    } catch {
      return dateRaw;
    }
  }
  return dateRaw || '—';
}

function escapeHtml(value) {
  return escapePettyCashHtml(value);
}

export function buildSatisfactoryItemsTableHtml(items) {
  const rows = Array.isArray(items) ? items : [emptySatisfactoryItem()];
  const cell = PETTY_CASH_TABLE_CELL;
  const headCell = pettyCashHeadCellStyle(cell);

  const body = rows
    .map((row) => `<tr>
<td style="${cell}">${escapeHtml(row.description ?? '')}</td>
<td style="${cell}; text-align:center;">${escapeHtml(row.qtyReceived || '—')}</td>
<td style="${cell}">${escapeHtml(row.condition || '—')}</td>
<td style="${cell}">${escapeHtml(row.remarks || '—')}</td>
</tr>`)
    .join('');

  return `<table style="width:100%; border-collapse:collapse; margin:12pt 0 18pt 0;">
<thead><tr>
<th style="${headCell}">Item Description</th>
<th style="${headCell}; width:14%;">Qty Received</th>
<th style="${headCell}; width:18%;">Condition</th>
<th style="${headCell}; width:22%;">Remarks</th>
</tr></thead><tbody>${body}</tbody></table>`;
}

export function buildSatisfactoryNoteFooterHtml({
  satisfactoryNote,
  requestorSignatories = [],
}) {
  const sn = satisfactoryNote || {};
  const received = sn.receivedBy || {};
  const verified = sn.verifiedBy || {};
  const receivedName = resolveSatisfactoryReceivedName(sn, requestorSignatories);
  const receivedDate = received.date ? resolveSatisfactoryDateLine(received.date) : '—';
  const verifiedName = String(verified.name ?? '').trim();
  const verifiedDate = verified.date ? resolveSatisfactoryDateLine(verified.date) : '—';

  return `${buildSignatoryBlockHtml({
    title: 'Received &amp; Verified By (End User / Requestor):',
    name: receivedName,
    date: receivedDate,
  })}${buildSignatoryBlockHtml({
    title: 'Verified By (Section Head):',
    name: verifiedName,
    date: verifiedDate,
  })}`;
}

export function satisfactoryItemsFromPurchase(purchaseSlip) {
  const items = purchaseSlip?.items;
  if (!Array.isArray(items) || !items.length) return [emptySatisfactoryItem()];
  return items.map((row) => ({
    description: '',
    qtyReceived: String(row?.quantity ?? '').trim(),
    condition: 'Satisfactory',
    remarks: DEFAULT_SATISFACTORY_REMARKS,
  }));
}
