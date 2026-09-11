/**
 * Petty Cash Word HTML — server (email attach).
 */

import {
  buildOfficialHeaderHtml,
  buildSignatoryBlockHtml,
  escapePettyCashHtml,
  formatPettyCashMoney,
  formatPettyCashQuantity,
  PETTY_CASH_DOC_TITLE_STYLE,
  PETTY_CASH_TABLE_CELL,
  pettyCashHeadCellStyle,
} from './pettyCashDocFormat.js';

function parseNum(raw) {
  const cleaned = String(raw ?? '')
    .replace(/\brs\.?\s*/gi, '')
    .replace(/,/g, '')
    .replace(/[^\d.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function escapeHtml(value) {
  return escapePettyCashHtml(value);
}

function resolveDateLine(dateISO) {
  const dateRaw = String(dateISO || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    const [y, m, d] = dateRaw.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return dateRaw || '—';
}

function normalizeItems(ps) {
  const rawItems = ps?.items;
  if (Array.isArray(rawItems) && rawItems.length) {
    return rawItems.map((row) => ({
      description: String(row?.description ?? '').trim(),
      quantity: String(row?.quantity ?? '').trim(),
      unitCost: parseNum(row?.unitCost),
      totalCost: parseNum(row?.totalCost),
    }));
  }
  const desc = String(ps?.description ?? '').trim();
  const qty = String(ps?.quantity ?? '').trim();
  const amount = parseNum(ps?.amountPkr);
  if (desc || qty || amount) {
    return [{ description: desc, quantity: qty, unitCost: 0, totalCost: amount }];
  }
  return [{ description: '', quantity: '', unitCost: 0, totalCost: 0 }];
}

function itemsTotal(items) {
  return items.reduce((sum, row) => {
    const explicit = parseNum(row.totalCost);
    if (explicit > 0) return sum + explicit;
    const qty = parseNum(row.quantity);
    const unit = parseNum(row.unitCost);
    return sum + (qty && unit ? Math.round(qty * unit * 100) / 100 : 0);
  }, 0);
}

function buildLetterheadHtml(letterheadDataUrl, letterheadWidth = 0, letterheadHeight = 0) {
  const src = String(letterheadDataUrl || '').trim();
  if (!src.startsWith('data:image/')) return '';
  const w = Number(letterheadWidth) || 590;
  const h = Number(letterheadHeight) || 0;
  if (h > 0) {
    return `<p style="text-align:center; margin:0 0 18pt 0;">
<img src="${src}" width="${w}" height="${h}" alt="PAFDA Letterhead" style="width:${w}px;height:${h}px;display:block;margin:0 auto;" />
</p>`;
  }
  return `<p style="text-align:center; margin:0 0 18pt 0;">
<img src="${src}" width="${w}" alt="PAFDA Letterhead" style="width:${w}px;height:auto;display:block;margin:0 auto;" />
</p>`;
}

function buildSignatoryBlock(signatories, signatureDataUrl, signatureWidth, signatureHeight, label) {
  const list = Array.isArray(signatories) ? signatories : signatories ? [signatories] : [];
  const src = String(signatureDataUrl || '').trim();
  const w = Number(signatureWidth) || 0;
  const h = Number(signatureHeight) || 0;
  let html = `<p style="margin:8pt 0 4pt 0;"><strong>${escapeHtml(label)}</strong></p>`;
  if (!list.length) {
    return html + '<p style="margin:0 0 12pt 0;">—</p>';
  }
  for (const sig of list) {
    const name = String(sig?.name ?? '').trim();
    const des = String(sig?.designation ?? '').trim();
    if (sig?.useSignatureImage && src.startsWith('data:image/') && w > 0 && h > 0) {
      html += `<p style="margin:8pt 0 2pt 0;">
<img src="${src}" width="${w}" height="${h}" alt="Signature" style="width:${w}px;height:${h}px;" />
</p>`;
    } else {
      html += `<p style="margin:8pt 0 2pt 0; border-bottom:1px solid #333; min-height:18pt;"></p>`;
    }
    if (name) html += `<p style="margin:0; font-size:11pt;">${escapeHtml(name)}</p>`;
    if (des) html += `<p style="margin:0; font-size:10pt;">${escapeHtml(des)}</p>`;
    html += '<p style="margin:0 0 12pt 0;"></p>';
  }
  return html;
}

function tableRow(label, value) {
  return `<tr>
<td style="border:1px solid #333; padding:6pt 8pt; width:32%; font-weight:bold;">${escapeHtml(label)}</td>
<td style="border:1px solid #333; padding:6pt 8pt;">${escapeHtml(value)}</td>
</tr>`;
}

function resolveRequestedByName(ps, signatories) {
  const requested = ps?.requestedBy || {};
  const fromField = String(requested.name ?? requested.names ?? '').trim();
  if (fromField) return fromField;
  const sig = Array.isArray(signatories) ? signatories[0] : null;
  return String(sig?.name ?? '').trim();
}

function resolveRequestedByDesignation(ps, signatories) {
  const requested = ps?.requestedBy || {};
  const fromField = String(requested.designation ?? '').trim();
  if (fromField) return fromField;
  const sig = Array.isArray(signatories) ? signatories[0] : null;
  return String(sig?.designation ?? '').trim();
}

function resolveApprover(ps, approverSignatory) {
  const approved = ps?.approvedBy || {};
  return {
    name: String(approved.name ?? '').trim() || String(approverSignatory?.name ?? '').trim(),
    designation:
      String(approved.designation ?? '').trim() ||
      String(approverSignatory?.designation ?? '').trim(),
    date: approved.date ? resolveDateLine(approved.date) : '',
  };
}

function buildPurchaseItemsTable(ps) {
  const items = normalizeItems(ps);
  const total = itemsTotal(items);
  const cell = PETTY_CASH_TABLE_CELL;
  const headCell = pettyCashHeadCellStyle(cell);
  let body = items
    .map((row, index) => {
      const rowTotal =
        row.totalCost > 0
          ? formatPettyCashMoney(row.totalCost)
          : formatPettyCashMoney(parseNum(row.quantity) * parseNum(row.unitCost));
      return `<tr>
<td style="${cell}; text-align:center; width:8%;">${index + 1}</td>
<td style="${cell}">${escapeHtml(row.description || '—')}</td>
<td style="${cell}; text-align:center;">${escapeHtml(formatPettyCashQuantity(row.quantity))}</td>
<td style="${cell}; text-align:right;">${formatPettyCashMoney(row.unitCost)}</td>
<td style="${cell}; text-align:right;">${rowTotal}</td>
</tr>`;
    })
    .join('');
  body += `<tr>
<td colspan="4" style="${headCell}; text-align:right;">Total Estimated Cost (Rs.)</td>
<td style="${headCell}; text-align:right;">${formatPettyCashMoney(total)}</td>
</tr>`;
  return `<table style="width:100%; border-collapse:collapse; margin:12pt 0 18pt 0;">
<thead><tr>
<th style="${headCell}; width:8%;">Sr. No.</th>
<th style="${headCell}">Item Description</th>
<th style="${headCell}; width:14%;">Quantity</th>
<th style="${headCell}; width:18%;">Estimated Unit Cost (Rs.)</th>
<th style="${headCell}; width:18%;">Estimated Total Cost (Rs.)</th>
</tr></thead><tbody>${body}</tbody></table>`;
}

function buildPurchaseFooter(ps, signatories, approverSignatory) {
  const requestedName = resolveRequestedByName(ps, signatories);
  const requestedDesignation = resolveRequestedByDesignation(ps, signatories);
  const requestedDate = ps.requestedBy?.date
    ? resolveDateLine(ps.requestedBy.date)
    : ps.date
      ? resolveDateLine(ps.date)
      : '—';
  const approved = resolveApprover(ps, approverSignatory);
  return `<p style="margin:12pt 0 6pt 0; font-weight:bold;">Justification</p>
<p style="margin:0 0 18pt 0; line-height:1.5;">${escapeHtml(ps.justification || '—')}</p>
${buildSignatoryBlockHtml({
  title: 'Requested By:',
  name: requestedName,
  designation: requestedDesignation,
  date: requestedDate,
})}${buildSignatoryBlockHtml({
  title: 'Approved by (Section Head):',
  name: approved.name,
  designation: approved.designation,
  date: approved.date,
})}`;
}

function buildHtml(docType, payload, assets) {
  const lh = assets.letterheadDataUrl || '';
  const lw = assets.letterheadWidth || 0;
  const lhH = assets.letterheadHeight || 0;
  const sigUrl = assets.signatureDataUrl || '';
  const sigW = assets.signatureWidth || 0;
  const sigH = assets.signatureHeight || 0;
  const signatories = payload.signatories || [];
  const approver = payload.approverSignatory || null;
  const issuer = payload.issuerSignatory || null;

  if (docType === 'purchase_slip') {
    const ps = payload.purchaseSlip || {};
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="font-family:'Times New Roman',Times,serif; font-size:12pt; margin:36pt;">
${buildOfficialHeaderHtml({
      logoDataUrl: lh,
      logoWidth: lw,
      logoHeight: lhH,
    })}
<p style="${PETTY_CASH_DOC_TITLE_STYLE}">Purchase Slip (Petty Cash)</p>
${buildPurchaseItemsTable(ps)}
${buildPurchaseFooter(ps, signatories, approver)}
</body></html>`;
  }

  if (docType === 'satisfactory_note') {
    const sn = payload.satisfactoryNote || {};
    const signatories = payload.signatories || [];
    const items = Array.isArray(sn.items) ? sn.items : [];
    const cell = PETTY_CASH_TABLE_CELL;
    const headCell = pettyCashHeadCellStyle(cell);
    const itemBody = items
      .map(
        (row) => `<tr>
<td style="${cell}">${escapeHtml(row.description ?? '')}</td>
<td style="${cell}; text-align:center;">${escapeHtml(row.qtyReceived || '—')}</td>
<td style="${cell}">${escapeHtml(row.condition || '—')}</td>
<td style="${cell}">${escapeHtml(row.remarks || '—')}</td>
</tr>`,
      )
      .join('');
    const itemsTable = `<table style="width:100%; border-collapse:collapse; margin:12pt 0 18pt 0;">
<thead><tr>
<th style="${headCell}">Item Description</th>
<th style="${headCell}; width:14%;">Qty Received</th>
<th style="${headCell}; width:18%;">Condition</th>
<th style="${headCell}; width:22%;">Remarks</th>
</tr></thead><tbody>${itemBody || `<tr><td colspan="4" style="${cell}">—</td></tr>`}</tbody></table>`;

    const received = sn.receivedBy || {};
    const verified = sn.verifiedBy || {};
    const sectionHead = payload.sectionHeadSignatory || approver;
    const receivedName =
      String(received.name ?? '').trim() || String(signatories[0]?.name ?? '').trim();
    const receivedDesignation =
      String(received.designation ?? '').trim() || String(signatories[0]?.designation ?? '').trim();
    const verifiedName =
      String(verified.name ?? '').trim() || String(sectionHead?.name ?? '').trim();
    const verifiedDesignation =
      String(verified.designation ?? '').trim() || String(sectionHead?.designation ?? '').trim();
    const footer = `${buildSignatoryBlockHtml({
      title: 'Received &amp; Verified By (End User / Requestor):',
      name: receivedName,
      designation: receivedDesignation,
      date: received.date ? resolveDateLine(received.date) : '',
    })}${buildSignatoryBlockHtml({
      title: 'Verified By (Section Head):',
      name: verifiedName,
      designation: verifiedDesignation,
      date: verified.date ? resolveDateLine(verified.date) : '',
    })}`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="font-family:'Times New Roman',Times,serif; font-size:12pt; margin:36pt;">
${buildLetterheadHtml(lh, lw, lhH)}
<p style="${PETTY_CASH_DOC_TITLE_STYLE}">Satisfactory Note</p>
${itemsTable}
${footer}
</body></html>`;
  }

  if (docType === 'refreshment_receiving') {
    const n = payload.note || {};
    const rows = [
      tableRow('Note No.', payload.noteNo),
      tableRow('Date', resolveDateLine(n.date)),
      tableRow('Items', n.itemsIssued),
      tableRow('Receiver', n.receiverName),
      tableRow('Designation', n.receiverDesignation),
    ].join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head>
<body style="font-family:'Times New Roman',Times,serif; font-size:12pt; margin:36pt;">
${buildLetterheadHtml(lh, lw, lhH)}
<p style="text-align:center; font-size:14pt; font-weight:bold; margin:48pt 0 18pt 0;">Receiving Note</p>
<table style="width:100%; border-collapse:collapse;">${rows}</table>
${buildSignatoryBlock(issuer ? [issuer] : [], sigUrl, sigW, sigH, 'Signature')}
</body></html>`;
  }

  throw new Error('Unknown doc type');
}

export function buildPettyCashDocBase64({
  docType,
  payload,
  letterheadDataUrl,
  letterheadWidth,
  letterheadHeight,
  signatureDataUrl,
  signatureWidth,
  signatureHeight,
}) {
  const html = buildHtml(docType, payload, {
    letterheadDataUrl,
    letterheadWidth,
    letterheadHeight,
    signatureDataUrl,
    signatureWidth,
    signatureHeight,
  });

  const ref = payload.caseNo || payload.noteNo || 'petty';
  const names = {
    purchase_slip: `purchase-slip-${ref}.doc`,
    satisfactory_note: `satisfactory-note-${ref}.doc`,
    refreshment_receiving: `refreshment-receiving-${ref}.doc`,
  };

  return {
    filename: names[docType] || `petty-cash-${ref}.doc`,
    base64: Buffer.from(`\ufeff${html}`, 'utf8').toString('base64'),
  };
}
