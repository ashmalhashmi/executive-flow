import { formatDisplayDate, getTodayISO } from './dates';
import {
  buildPurchaseItemsTableHtml,
  buildPurchaseSlipFooterHtml,
} from './pettyCashPurchaseSlip';
import {
  buildSatisfactoryItemsTableHtml,
  buildSatisfactoryNoteFooterHtml,
} from './pettyCashSatisfactoryNote';
import { buildOfficialHeaderHtml, PETTY_CASH_DOC_TITLE_STYLE } from './pettyCashDocFormat';
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveDateLine(dateISO) {
  const dateRaw = String(dateISO || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    try {
      return formatDisplayDate(dateRaw);
    } catch {
      return dateRaw;
    }
  }
  return dateRaw || formatDisplayDate(getTodayISO());
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

function buildSignatoriesHtml(signatories, signatureDataUrl, signatureWidth, signatureHeight) {
  const list = Array.isArray(signatories) ? signatories : [];
  const src = String(signatureDataUrl || '').trim();
  const w = Number(signatureWidth) || 0;
  const h = Number(signatureHeight) || 0;
  let html = '';

  for (const sig of list) {
    const name = String(sig?.name ?? '').trim();
    const des = String(sig?.designation ?? '').trim();
    if (!name) continue;

    if (sig.useSignatureImage && src.startsWith('data:image/') && w > 0 && h > 0) {
      html += `<p style="text-align:right; margin:16pt 0 2pt 0;">
<img src="${src}" width="${w}" height="${h}" alt="Signature" style="width:${w}px;height:${h}px;" />
</p>`;
    }
    html += `<p style="text-align:right; margin:0; font-family:'Times New Roman',Times,serif; font-size:12pt;">${escapeHtml(name)}</p>`;
    if (des) {
      html += `<p style="text-align:right; margin:0; font-family:'Times New Roman',Times,serif; font-size:11pt;">${escapeHtml(des)}</p>`;
    }
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

export function buildPurchaseSlipDocHtml({
  purchaseSlip,
  signatories = [],
  approverSignatory = null,
}) {
  const ps = purchaseSlip || {};

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Purchase Slip (Petty Cash)</title>
</head>
<body style="font-family:'Times New Roman',Times,serif; font-size:12pt; margin:36pt;">
${buildOfficialHeaderHtml()}
<p style="${PETTY_CASH_DOC_TITLE_STYLE}">Purchase Slip (Petty Cash)</p>
${buildPurchaseItemsTableHtml(ps.items)}
${buildPurchaseSlipFooterHtml({
  purchaseSlip: ps,
  requestedSignatories: signatories,
  approverSignatory,
})}
</body></html>`;
}

export function buildSatisfactoryNoteDocHtml({
  satisfactoryNote,
  letterheadDataUrl = '',
  letterheadWidth = 0,
  letterheadHeight = 0,
  signatories = [],
  sectionHeadSignatory = null,
}) {
  const sn = satisfactoryNote || {};

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Satisfactory Note</title>
</head>
<body style="font-family:'Times New Roman',Times,serif; font-size:12pt; margin:36pt;">
${buildLetterheadHtml(letterheadDataUrl, letterheadWidth, letterheadHeight)}
<p style="${PETTY_CASH_DOC_TITLE_STYLE}">Satisfactory Note</p>
${buildSatisfactoryItemsTableHtml(sn.items)}
${buildSatisfactoryNoteFooterHtml({
  satisfactoryNote: sn,
  requestorSignatories: signatories,
  sectionHeadSignatory,
})}
</body></html>`;
}

export function buildRefreshmentReceivingDocHtml({
  noteNo,
  meetingTitle,
  meetingDate,
  note,
  letterheadDataUrl = '',
  letterheadWidth = 0,
  letterheadHeight = 0,
  issuerSignatory = null,
  signatureDataUrl = '',
  signatureWidth = 0,
  signatureHeight = 0,
}) {
  const n = note || {};
  const rows = [
    tableRow('Note No.', noteNo || '—'),
    tableRow('Date', resolveDateLine(n.date)),
    tableRow('Meeting', meetingTitle || '—'),
    tableRow('Meeting Date', meetingDate ? resolveDateLine(meetingDate) : '—'),
    tableRow('Items Issued', n.itemsIssued || '—'),
    tableRow('Quantity', n.quantity || '—'),
    tableRow('Purpose', n.purpose || meetingTitle || '—'),
    tableRow('Receiver Name', n.receiverName || '—'),
    tableRow('Receiver Designation', n.receiverDesignation || '—'),
  ].join('');

  const issuerHtml = issuerSignatory
    ? buildSignatoriesHtml([issuerSignatory], signatureDataUrl, signatureWidth, signatureHeight)
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Receiving Note — ${escapeHtml(noteNo)}</title>
</head>
<body style="font-family:'Times New Roman',Times,serif; font-size:12pt; margin:36pt;">
${buildLetterheadHtml(letterheadDataUrl, letterheadWidth, letterheadHeight)}
<p style="text-align:center; font-size:14pt; font-weight:bold; margin:48pt 0 18pt 0;">Receiving Note</p>
<p style="text-align:center; font-size:11pt; margin:0 0 24pt 0;">(Refreshment / items issued from office)</p>
<table style="width:100%; border-collapse:collapse; margin:0 0 18pt 0;">${rows}</table>
<p style="margin:18pt 0 6pt 0;">Received the above items for official use.</p>
${issuerHtml}
</body></html>`;
}

export function downloadWordHtml(html, filename) {
  const blob = new Blob([`\ufeff${html}`], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  link.click();
  URL.revokeObjectURL(url);
}
