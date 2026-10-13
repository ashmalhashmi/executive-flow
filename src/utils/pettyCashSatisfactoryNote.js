import { formatDisplayDate } from './dates';
import {
  buildSignatoryBlockHtml,
  escapePettyCashHtml,
  PETTY_CASH_TABLE_CELL,
  pettyCashHeadCellStyle,
} from './pettyCashDocFormat';

export const DEFAULT_SATISFACTORY_REMARKS =
  'The above-mentioned goods/services have been received in satisfactory condition and conform to the purchase requirements.';

/** Satisfactory Note does not re-list products — it refers back to the Purchase Slip. */
export const SATISFACTORY_ITEM_DESCRIPTION = 'Mentioned on Purchase Slip';

export function emptySatisfactoryItem() {
  return {
    description: SATISFACTORY_ITEM_DESCRIPTION,
    qtyReceived: '',
    condition: 'Satisfactory',
    remarks: DEFAULT_SATISFACTORY_REMARKS,
  };
}

export function emptySatisfactoryNoteFields() {
  return {
    items: [emptySatisfactoryItem()],
    receivedBy: { name: '', designation: '', date: '' },
    verifiedBy: { name: '', designation: '', date: '' },
  };
}

/** One header + one detail row only — never re-list purchase products. */
export function singleSatisfactoryItem(overrides = {}) {
  const base = emptySatisfactoryItem();
  const patch = overrides && typeof overrides === 'object' ? overrides : {};
  return {
    ...base,
    ...patch,
    description: SATISFACTORY_ITEM_DESCRIPTION,
    qtyReceived: '',
    condition: String(patch.condition ?? base.condition).trim() || 'Satisfactory',
    remarks: String(patch.remarks ?? base.remarks).trim() || DEFAULT_SATISFACTORY_REMARKS,
  };
}

export function normalizeSatisfactoryItems(rawItems, legacyNote = {}, purchaseSlip = {}) {
  if (Array.isArray(rawItems) && rawItems.length) {
    const first = rawItems[0] || {};
    return [
      singleSatisfactoryItem({
        condition: first.condition,
        remarks: first.remarks,
      }),
    ];
  }

  const statement = String(legacyNote.statement ?? '').trim();
  if (statement && !Array.isArray(rawItems)) {
    return [singleSatisfactoryItem({ remarks: statement })];
  }

  const purchaseItems = purchaseSlip?.items;
  if (Array.isArray(purchaseItems) && purchaseItems.length) {
    return [singleSatisfactoryItem()];
  }

  return [singleSatisfactoryItem()];
}

export function resolveSatisfactoryReceivedName(note, _requestorSignatories = []) {
  return String(note?.receivedBy?.name ?? '').trim();
}

export function resolveSatisfactoryReceivedDesignation(note, _requestorSignatories = []) {
  return String(note?.receivedBy?.designation ?? '').trim();
}

export function resolveSatisfactoryVerifier(note, _sectionHeadSignatory) {
  const verified = note?.verifiedBy || {};
  return {
    name: String(verified.name ?? '').trim(),
    designation: String(verified.designation ?? '').trim(),
    date: verified.date ? resolveSatisfactoryDateLine(verified.date) : '',
  };
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
  const row = singleSatisfactoryItem(Array.isArray(items) ? items[0] : null);
  const cell = PETTY_CASH_TABLE_CELL;
  const headCell = pettyCashHeadCellStyle(cell);

  const body = `<tr>
<td style="${cell}">${escapeHtml(SATISFACTORY_ITEM_DESCRIPTION)}</td>
<td style="${cell}; text-align:center;">${escapeHtml(row.qtyReceived || '')}</td>
<td style="${cell}">${escapeHtml(row.condition || '—')}</td>
<td style="${cell}">${escapeHtml(row.remarks || '—')}</td>
</tr>`;

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
  sectionHeadSignatory = null,
}) {
  const sn = satisfactoryNote || {};
  const received = sn.receivedBy || {};
  const receivedName = resolveSatisfactoryReceivedName(sn, requestorSignatories);
  const receivedDesignation = resolveSatisfactoryReceivedDesignation(sn, requestorSignatories);
  const receivedDate = received.date ? resolveSatisfactoryDateLine(received.date) : '—';
  const verified = resolveSatisfactoryVerifier(sn, sectionHeadSignatory);

  return `${buildSignatoryBlockHtml({
    title: 'Received &amp; Verified By (End User / Requestor):',
    name: receivedName,
    designation: receivedDesignation,
    date: receivedDate,
  })}${buildSignatoryBlockHtml({
    title: 'Verified By (Section Head):',
    name: verified.name,
    designation: verified.designation,
    date: verified.date,
  })}`;
}

export function satisfactoryItemsFromPurchase(_purchaseSlip) {
  return [singleSatisfactoryItem()];
}
