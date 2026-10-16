import { formatDisplayDate } from './dates';
import {
  buildSignatoryBlockHtml,
  escapePettyCashHtml,
  formatPettyCashQuantity,
  formatPettyCashTableMoney,
  PETTY_CASH_TABLE_CELL,
  PETTY_CASH_TABLE_STYLE,
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

export function emptyRequestedByPerson() {
  return { name: '', designation: '', date: '' };
}

/** Always an array — legacy single object becomes one person. */
export function normalizeRequestedByList(raw) {
  if (Array.isArray(raw)) {
    const list = raw
      .filter((row) => row && typeof row === 'object')
      .map((row) => ({
        name: String(row.name ?? row.names ?? '').trim(),
        designation: String(row.designation ?? '').trim(),
        date: String(row.date ?? '').trim(),
      }));
    return list.length ? list : [emptyRequestedByPerson()];
  }
  if (raw && typeof raw === 'object') {
    return [
      {
        name: String(raw.name ?? raw.names ?? '').trim(),
        designation: String(raw.designation ?? '').trim(),
        date: String(raw.date ?? '').trim(),
      },
    ];
  }
  return [emptyRequestedByPerson()];
}

export function parsePurchaseNumber(raw) {
  const cleaned = String(raw ?? '')
    .replace(/\brs\.?\s*/gi, '')
    .replace(/,/g, '')
    .replace(/[^\d.]/g, '');
  const n = Number(cleaned);
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
  return formatPettyCashTableMoney(value);
}

export function formatPurchaseQuantity(value) {
  return formatPettyCashQuantity(value);
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

function purchaseItemDedupeKey(row) {
  return [
    String(row?.description ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' '),
    String(row?.quantity ?? '').trim().toLowerCase(),
    String(parsePurchaseNumber(row?.unitCost) || ''),
    String(parsePurchaseNumber(row?.totalCost) || ''),
  ].join('|');
}

/** Append scanned page items onto an existing draft — skip exact duplicate rows. */
export function mergePurchaseItemsFromScan(existingItems, incomingItems) {
  const base = Array.isArray(existingItems) ? existingItems.filter((row) => String(row?.description ?? '').trim()) : [];
  const incoming = Array.isArray(incomingItems)
    ? incomingItems.filter((row) => String(row?.description ?? '').trim())
    : [];
  if (!incoming.length) return base.length ? base : [emptyPurchaseItem()];

  const seen = new Set(base.map(purchaseItemDedupeKey));
  const merged = [...base];
  for (const row of incoming) {
    const key = purchaseItemDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(syncPurchaseItemTotals({ ...emptyPurchaseItem(), ...row }));
  }
  return merged.length ? merged : [emptyPurchaseItem()];
}

/** Prefer existing vendor/invoice meta; take the larger grand-total when both pages report one. */
export function mergePurchaseSlipFieldsFromScan(existingSlip, fields, mode = 'append') {
  const prev = existingSlip && typeof existingSlip === 'object' ? existingSlip : {};
  const nextItems = purchaseItemsFromInvoiceFields(fields);
  const items =
    mode === 'append'
      ? mergePurchaseItemsFromScan(prev.items, nextItems)
      : nextItems.length
        ? nextItems
        : [emptyPurchaseItem()];

  const prevAmount = parsePurchaseNumber(prev.amountPkr);
  const nextAmount = parsePurchaseNumber(fields.amountPkr);
  const amountPkr =
    mode === 'append'
      ? Math.max(prevAmount, nextAmount) || prevAmount || nextAmount || ''
      : nextAmount || prevAmount || '';

  return {
    ...prev,
    vendor: mode === 'append' ? String(prev.vendor || fields.vendor || '').trim() : String(fields.vendor || prev.vendor || '').trim(),
    invoiceNo:
      mode === 'append'
        ? String(prev.invoiceNo || fields.invoiceNo || '').trim()
        : String(fields.invoiceNo || prev.invoiceNo || '').trim(),
    date: mode === 'append' ? String(prev.date || fields.date || '').trim() : String(fields.date || prev.date || '').trim(),
    paymentMode:
      mode === 'append'
        ? String(prev.paymentMode || fields.paymentMode || 'Petty Cash').trim()
        : String(fields.paymentMode || prev.paymentMode || 'Petty Cash').trim(),
    items,
    description:
      mode === 'append'
        ? String(prev.description || fields.description || '').trim()
        : String(fields.description || prev.description || '').trim(),
    quantity:
      mode === 'append'
        ? String(prev.quantity || fields.quantity || '').trim()
        : String(fields.quantity || prev.quantity || '').trim(),
    amountPkr: amountPkr || '',
  };
}

/** Resolved requesters for PDF / Word — only what the user filled (no signature autofill). */
export function resolveRequestedByPeople(purchaseSlip, _requestedSignatories = []) {
  const list = normalizeRequestedByList(purchaseSlip?.requestedBy);
  return list.map((person) => {
    const dateRaw = String(person.date ?? '').trim();
    return {
      name: String(person.name ?? '').trim(),
      designation: String(person.designation ?? '').trim(),
      date: dateRaw ? resolvePurchaseDateLine(dateRaw) : '—',
    };
  });
}

/** Requester name from form field or purchase-slip initiator signature settings. */
export function resolveRequestedByName(purchaseSlip, requestedSignatories = []) {
  return resolveRequestedByPeople(purchaseSlip, requestedSignatories)[0]?.name || '';
}

export function resolveRequestedByDesignation(purchaseSlip, requestedSignatories = []) {
  return resolveRequestedByPeople(purchaseSlip, requestedSignatories)[0]?.designation || '';
}

export function resolveRequestedByDate(purchaseSlip) {
  return resolveRequestedByPeople(purchaseSlip)[0]?.date || '—';
}

export function resolveApproverSignatory(purchaseSlip, _approverSignatory) {
  const approved = purchaseSlip?.approvedBy || {};
  return {
    name: String(approved.name ?? '').trim(),
    designation: String(approved.designation ?? '').trim(),
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
<td style="${cell}; text-align:center;">${escapePurchaseHtml(formatPurchaseQuantity(row.quantity))}</td>
<td style="${cell}; text-align:right;">${formatPurchaseMoney(row.unitCost)}</td>
<td style="${cell}; text-align:right;">${totalCell}</td>
</tr>`;
    })
    .join('');

  body += `<tr>
<td colspan="4" style="${headCell}; text-align:right;">Total Estimated Cost (Rs.)</td>
<td style="${headCell}; text-align:right;">${formatPurchaseMoney(total)}</td>
</tr>`;

  return `<table style="${PETTY_CASH_TABLE_STYLE}">
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
  const requesters = resolveRequestedByPeople(ps, requestedSignatories);
  const approved = resolveApproverSignatory(ps, approverSignatory);

  let html = `<p style="margin:8pt 0 4pt 0; font-weight:bold; font-family:'Times New Roman',Times,serif; font-size:11pt;">Justification</p>
<p style="margin:0 0 10pt 0; line-height:1.35; font-family:'Times New Roman',Times,serif; font-size:11pt;">${escapePurchaseHtml(ps.justification || '—')}</p>`;

  requesters.forEach((person, index) => {
    html += buildSignatoryBlockHtml({
      title: index === 0 ? 'Requested By:' : `Requested By (${index + 1}):`,
      name: person.name,
      designation: person.designation,
      date: person.date,
    });
  });

  html += buildSignatoryBlockHtml({
    title: 'Approved by (Section Head):',
    name: approved.name,
    designation: approved.designation,
    date: approved.date,
  });

  return html;
}
