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

export function splitInvoiceDescription(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*])\s*/, '').trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const parts = raw
    .split(/\s*(?:,|;|&|\band\b)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [raw];
}

export function purchaseItemsFromInvoiceFields(fields = {}) {
  const rawItems = Array.isArray(fields.items) ? fields.items : [];
  const mapped = rawItems
    .map((row) =>
      syncPurchaseItemTotals({
        description: String(row?.description ?? '').trim(),
        quantity: String(row?.quantity ?? '').trim(),
        unitCost: row?.unitCost ?? '',
        totalCost: row?.totalCost ?? '',
      }),
    )
    .filter((row) => String(row.description || '').trim());

  if (mapped.length === 1) {
    const parts = splitInvoiceDescription(mapped[0].description);
    if (parts.length > 1) {
      return parts.map((description) =>
        syncPurchaseItemTotals({
          ...emptyPurchaseItem(),
          description,
        }),
      );
    }
  }

  if (mapped.length) {
    if (mapped.length === 1 && !mapped[0].totalCost && fields.amountPkr) {
      mapped[0] = syncPurchaseItemTotals({
        ...mapped[0],
        totalCost: fields.amountPkr,
      });
    }
    return mapped;
  }

  const parts = splitInvoiceDescription(fields.description);
  if (parts.length > 1) {
    return parts.map((description) =>
      syncPurchaseItemTotals({
        ...emptyPurchaseItem(),
        description,
      }),
    );
  }

  const fallback = syncPurchaseItemTotals({
    ...emptyPurchaseItem(),
    description: String(fields.description ?? '').trim(),
    quantity: String(fields.quantity ?? '').trim(),
    totalCost: fields.amountPkr || '',
  });
  return String(fallback.description || '').trim() ? [fallback] : [emptyPurchaseItem()];
}

function firstSignatory(requestedSignatories = []) {
  return Array.isArray(requestedSignatories) ? requestedSignatories[0] : requestedSignatories || null;
}

/** Requester name from form field or purchase-slip initiator signature settings. */
export function resolveRequestedByName(purchaseSlip, requestedSignatories = []) {
  const requested = purchaseSlip?.requestedBy || {};
  const fromField = String(requested.name ?? requested.names ?? '').trim();
  if (fromField) return fromField;
  return String(firstSignatory(requestedSignatories)?.name ?? '').trim();
}

export function resolveRequestedByDesignation(purchaseSlip, requestedSignatories = []) {
  const requested = purchaseSlip?.requestedBy || {};
  const fromField = String(requested.designation ?? '').trim();
  if (fromField) return fromField;
  return String(firstSignatory(requestedSignatories)?.designation ?? '').trim();
}

export function resolveRequestedByDate(purchaseSlip) {
  const requested = purchaseSlip?.requestedBy || {};
  const date = String(requested.date ?? purchaseSlip?.date ?? '').trim();
  return date ? resolvePurchaseDateLine(date) : '—';
}

export function resolveApproverSignatory(purchaseSlip, approverSignatory) {
  const approved = purchaseSlip?.approvedBy || {};
  return {
    name: String(approved.name ?? '').trim() || String(approverSignatory?.name ?? '').trim(),
    designation:
      String(approved.designation ?? '').trim() ||
      String(approverSignatory?.designation ?? '').trim(),
    date: approved.date ? resolvePurchaseDateLine(approved.date) : '',
  };
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
  approverSignatory = null,
}) {
  const ps = purchaseSlip || {};
  const requestedName = resolveRequestedByName(ps, requestedSignatories);
  const requestedDesignation = resolveRequestedByDesignation(ps, requestedSignatories);
  const requestedDate = resolveRequestedByDate(ps);
  const approved = resolveApproverSignatory(ps, approverSignatory);

  let html = `<p style="margin:12pt 0 6pt 0; font-weight:bold;">Justification</p>
<p style="margin:0 0 18pt 0; line-height:1.5;">${escapePurchaseHtml(ps.justification || '—')}</p>`;

  html += buildSignatoryBlockHtml({
    title: 'Requested By:',
    name: requestedName,
    designation: requestedDesignation,
    date: requestedDate,
  });

  html += buildSignatoryBlockHtml({
    title: 'Approved by (Section Head):',
    name: approved.name,
    designation: approved.designation,
    date: approved.date,
  });

  return html;
}
