import { formatPKR } from './currency';
import { formatDisplayDate } from './dates';
import {
  buildSignatoryBlockHtml,
  escapePettyCashHtml,
  PETTY_CASH_TABLE_CELL,
  pettyCashHeadCellStyle,
} from './pettyCashDocFormat';

export function emptyPurchaseItem() {
  return {
    description: '',
    quantity: '',
    unitCost: '',
    totalCost: '',
  };
}

export function parsePurchaseNumber(raw) {
  const n = Number(String(raw ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function computePurchaseItemTotal(quantity, unitCost) {
  const qty = parsePurchaseNumber(quantity);
  const unit = parsePurchaseNumber(unitCost);
  if (!qty || !unit) return 0;
  return Math.round(qty * unit * 100) / 100;
}

export function computePurchaseItemsTotal(items) {
  return (items || []).reduce((sum, row) => {
    const explicit = parsePurchaseNumber(row?.totalCost);
    if (explicit > 0) return sum + explicit;
    return sum + computePurchaseItemTotal(row?.quantity, row?.unitCost);
  }, 0);
}

export function syncPurchaseItemTotals(item) {
  const row = { ...item };
  const computed = computePurchaseItemTotal(row.quantity, row.unitCost);
  if (computed > 0) {
    row.totalCost = computed;
  }
  return row;
}

export function normalizePurchaseItems(rawItems, legacyPurchase = {}) {
  if (Array.isArray(rawItems) && rawItems.length) {
    return rawItems.map((row) => {
      const item = {
        description: String(row?.description ?? '').trim(),
        quantity: String(row?.quantity ?? '').trim(),
        unitCost: parsePurchaseNumber(row?.unitCost) || '',
        totalCost: parsePurchaseNumber(row?.totalCost) || '',
      };
      const computed = computePurchaseItemTotal(item.quantity, item.unitCost);
      if (computed > 0) item.totalCost = computed;
      return item;
    });
  }

  const desc = String(legacyPurchase.description ?? '').trim();
  const qty = String(legacyPurchase.quantity ?? '').trim();
  const amount = parsePurchaseNumber(legacyPurchase.amountPkr);
  if (desc || qty || amount) {
    return [
      {
        description: desc,
        quantity: qty,
        unitCost: '',
        totalCost: amount || '',
      },
    ];
  }
  return [emptyPurchaseItem()];
}

export function formatPurchaseMoney(value) {
  const n = parsePurchaseNumber(value);
  if (!n) return '—';
  return formatPKR(n);
}

export function resolvePurchaseDateLine(dateISO) {
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

/** Requester name from form field or purchase-slip initiator signature settings. */
export function resolveRequestedByName(purchaseSlip, requestedSignatories = []) {
  const requested = purchaseSlip?.requestedBy || {};
  const fromField = String(requested.name ?? requested.names ?? '').trim();
  if (fromField) return fromField;
  const sig = Array.isArray(requestedSignatories) ? requestedSignatories[0] : null;
  return String(sig?.name ?? '').trim();
}

export function resolveRequestedByDate(purchaseSlip) {
  const requested = purchaseSlip?.requestedBy || {};
  const date = String(requested.date ?? purchaseSlip?.date ?? '').trim();
  return date ? resolvePurchaseDateLine(date) : '—';
}

function escapePurchaseHtml(value) {
  return escapePettyCashHtml(value);
}

export function buildPurchaseItemsTableHtml(items) {
  const rows = normalizePurchaseItems(items);
  const total = computePurchaseItemsTotal(rows);
  const cell = PETTY_CASH_TABLE_CELL;
  const headCell = pettyCashHeadCellStyle(cell);

  let body = rows
    .map((row, index) => {
      const totalCell =
        row.totalCost
          ? formatPurchaseMoney(row.totalCost)
          : formatPurchaseMoney(computePurchaseItemTotal(row.quantity, row.unitCost));
      return `<tr>
<td style="${cell}; text-align:center; width:8%;">${index + 1}</td>
<td style="${cell}">${escapePurchaseHtml(row.description || '—')}</td>
<td style="${cell}; text-align:center;">${escapePurchaseHtml(row.quantity || '—')}</td>
<td style="${cell}; text-align:right;">${formatPurchaseMoney(row.unitCost)}</td>
<td style="${cell}; text-align:right;">${totalCell}</td>
</tr>`;
    })
    .join('');

  body += `<tr>
<td colspan="4" style="${headCell}; text-align:right;">Total Estimated Cost (Rs.)</td>
<td style="${headCell}; text-align:right;">${formatPurchaseMoney(total)}</td>
</tr>`;

  return `<table style="width:100%; border-collapse:collapse; margin:12pt 0 18pt 0;">
<thead>
<tr>
<th style="${headCell}; width:8%;">Sr. No.</th>
<th style="${headCell}">Item Description</th>
<th style="${headCell}; width:14%;">Quantity</th>
<th style="${headCell}; width:18%;">Estimated Unit Cost (Rs.)</th>
<th style="${headCell}; width:18%;">Estimated Total Cost (Rs.)</th>
</tr>
</thead>
<tbody>${body}</tbody>
</table>`;
}

export function buildPurchaseSlipFooterHtml({
  purchaseSlip,
  requestedSignatories = [],
}) {
  const ps = purchaseSlip || {};
  const approved = ps.approvedBy || {};
  const requestedName = resolveRequestedByName(ps, requestedSignatories);
  const requestedDate = resolveRequestedByDate(ps);
  const approvedName = String(approved.name ?? '').trim();
  const approvedDate = approved.date ? resolvePurchaseDateLine(approved.date) : '—';

  let html = `<p style="margin:12pt 0 6pt 0; font-weight:bold;">Justification</p>
<p style="margin:0 0 18pt 0; line-height:1.5;">${escapePurchaseHtml(ps.justification || '—')}</p>`;

  html += buildSignatoryBlockHtml({
    title: 'Requested By:',
    name: requestedName,
    date: requestedDate,
  });

  html += buildSignatoryBlockHtml({
    title: 'Approved by (Section Head):',
    name: approvedName,
    date: approvedDate,
  });

  return html;
}
