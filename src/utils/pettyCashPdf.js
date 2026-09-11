import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDate, getTodayISO } from './dates';
import { loadPafdaLetterheadDataUrl } from './composeLetterheadImage';
import { loadReceivingNoteSignatureDataUrl } from './receivingNoteSignatureImage';
import {
  computePurchaseItemsTotal,
  formatPurchaseMoney,
  normalizePurchaseItems,
  resolveApproverSignatory,
  resolveRequestedByDate,
  resolveRequestedByDesignation,
  resolveRequestedByName,
} from './pettyCashPurchaseSlip';
import {
  resolveSatisfactoryReceivedDesignation,
  resolveSatisfactoryReceivedName,
  resolveSatisfactoryVerifier,
} from './pettyCashSatisfactoryNote';
import { PETTY_CASH_BLANK } from './pettyCashDocFormat';

const PAGE = { width: 210, height: 297, marginX: 18, marginTop: 14, line: 6 };
const SIG_IMG_W = 48;
const SIG_IMG_H = 18;

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

async function drawLetterhead(doc, leftX, contentWidth, yStart) {
  let y = yStart;
  try {
    const dataUrl = await loadPafdaLetterheadDataUrl();
    const imgH = 28;
    doc.addImage(dataUrl, 'PNG', leftX, y, contentWidth, imgH, undefined, 'FAST');
    y += imgH + 8;
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PUNJAB AGRICULTURE, FOOD & DRUG AUTHORITY', PAGE.width / 2, y, {
      align: 'center',
    });
    y += 10;
  }
  return y;
}

async function drawSignatureBlock(doc, signatories, leftX, rightX, y, label) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(label, leftX, y);
  y += PAGE.line + 2;

  const list = Array.isArray(signatories) ? signatories : signatories ? [signatories] : [];
  let drewImage = false;

  try {
    if (list.some((s) => s?.useSignatureImage)) {
      const sigUrl = await loadReceivingNoteSignatureDataUrl();
      doc.addImage(sigUrl, 'PNG', leftX, y, SIG_IMG_W, SIG_IMG_H, undefined, 'FAST');
      y += SIG_IMG_H + 4;
      drewImage = true;
    }
  } catch {
    /* typed only */
  }

  if (!drewImage) {
    doc.setDrawColor(80);
    doc.line(leftX, y + 2, leftX + 70, y + 2);
    y += 10;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const sig of list) {
    const name = String(sig?.name ?? '').trim();
    const des = String(sig?.designation ?? '').trim();
    if (name) {
      doc.text(name, leftX, y);
      y += PAGE.line;
    }
    if (des) {
      doc.text(des, leftX, y);
      y += PAGE.line;
    }
  }
  return y + 4;
}

function drawTableRows(doc, rows, leftX, y, contentWidth) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const [label, value] of rows) {
    if (y > PAGE.height - 30) {
      doc.addPage();
      y = PAGE.marginTop;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, leftX, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(String(value || '—'), contentWidth - 55);
    doc.text(lines, leftX + 52, y);
    y += Math.max(PAGE.line, lines.length * PAGE.line) + 2;
  }
  return y;
}

function drawInlineSignatureLine(doc, leftX, y) {
  doc.setDrawColor(80);
  doc.line(leftX, y + 2, leftX + 70, y + 2);
  return y + 10;
}

function formatPdfField(value) {
  const text = String(value ?? '').trim();
  return text && text !== '—' ? text : PETTY_CASH_BLANK;
}

function drawSignatoryBlock(doc, leftX, y, title, { name, designation, date }) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, leftX, y);
  y += PAGE.line + 2;
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${formatPdfField(name)}`, leftX, y);
  y += PAGE.line;
  doc.text(`Designation: ${formatPdfField(designation)}`, leftX, y);
  y += PAGE.line;
  doc.text(`Date: ${formatPdfField(date)}`, leftX, y);
  y += PAGE.line;
  const sigName = String(name ?? '').trim();
  const sigDes = String(designation ?? '').trim();
  doc.text('Signature:', leftX, y);
  if (sigName || sigDes) {
    const identity = [sigName, sigDes].filter(Boolean).join(', ');
    doc.text(identity, leftX + 28, y);
    y += PAGE.line;
  } else {
    y = drawInlineSignatureLine(doc, leftX + 28, y);
  }
  return y + 6;
}

export async function downloadPurchaseSlipPdf({
  purchaseSlip,
  signatories,
  approverSignatory,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const contentWidth = PAGE.width - PAGE.marginX * 2;
  const leftX = PAGE.marginX;
  let y = await drawLetterhead(doc, leftX, contentWidth, PAGE.marginTop);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Purchase Slip (Petty Cash)', PAGE.width / 2, y, { align: 'center' });
  y += 10;

  const ps = purchaseSlip || {};
  const items = normalizePurchaseItems(ps.items, ps);
  const total = computePurchaseItemsTotal(items);
  const body = items.map((row, index) => [
    String(index + 1),
    row.description || '—',
    row.quantity || '—',
    formatPurchaseMoney(row.unitCost),
    row.totalCost
      ? formatPurchaseMoney(row.totalCost)
      : formatPurchaseMoney((Number(row.quantity) || 0) * (Number(row.unitCost) || 0)),
  ]);
  body.push(['', '', '', 'Total Estimated Cost (Rs.)', formatPurchaseMoney(total)]);

  autoTable(doc, {
    startY: y + 4,
    head: [
      [
        'Sr. No.',
        'Item Description',
        'Quantity',
        'Estimated Unit Cost (Rs.)',
        'Estimated Total Cost (Rs.)',
      ],
    ],
    body,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [245, 245, 245], textColor: 20, fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14 },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: leftX, right: PAGE.marginX },
  });

  y = doc.lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Justification', leftX, y);
  y += PAGE.line;
  doc.setFont('helvetica', 'normal');
  const justLines = doc.splitTextToSize(String(ps.justification || '—'), contentWidth);
  doc.text(justLines, leftX, y);
  y += justLines.length * PAGE.line + 8;

  y = drawSignatoryBlock(doc, leftX, y, 'Requested By:', {
    name: resolveRequestedByName(ps, signatories),
    designation: resolveRequestedByDesignation(ps, signatories),
    date: resolveRequestedByDate(ps),
  });

  const approved = resolveApproverSignatory(ps, approverSignatory);
  y = drawSignatoryBlock(doc, leftX, y, 'Approved by (Section Head):', {
    name: approved.name,
    designation: approved.designation,
    date: approved.date,
  });

  doc.save('purchase-slip-petty-cash.pdf');
}

export async function downloadSatisfactoryNotePdf({
  satisfactoryNote,
  signatories,
  sectionHeadSignatory,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const contentWidth = PAGE.width - PAGE.marginX * 2;
  const leftX = PAGE.marginX;
  let y = await drawLetterhead(doc, leftX, contentWidth, PAGE.marginTop);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Satisfactory Note', PAGE.width / 2, y, { align: 'center' });
  y += 10;

  const sn = satisfactoryNote || {};
  const items = Array.isArray(sn.items) ? sn.items : [];
  const body = items.map((row) => [
    row.description ?? '',
    row.qtyReceived || '—',
    row.condition || '—',
    row.remarks || '—',
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Item Description', 'Qty Received', 'Condition', 'Remarks']],
    body: body.length ? body : [['—', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [245, 245, 245], textColor: 20, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'center' } },
    margin: { left: leftX, right: PAGE.marginX },
  });

  y = doc.lastAutoTable.finalY + 8;

  const received = sn.receivedBy || {};
  const verified = resolveSatisfactoryVerifier(sn, sectionHeadSignatory);

  y = drawSignatoryBlock(doc, leftX, y, 'Received & Verified By (End User / Requestor):', {
    name: resolveSatisfactoryReceivedName(sn, signatories),
    designation: resolveSatisfactoryReceivedDesignation(sn, signatories),
    date: received.date ? resolveDateLine(received.date) : '',
  });

  drawSignatoryBlock(doc, leftX, y, 'Verified By (Section Head):', {
    name: verified.name,
    designation: verified.designation,
    date: verified.date,
  });

  doc.save('satisfactory-note.pdf');
}

export async function downloadRefreshmentReceivingPdf({
  noteNo,
  meetingTitle,
  meetingDate,
  note,
  issuerSignatory,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const contentWidth = PAGE.width - PAGE.marginX * 2;
  const leftX = PAGE.marginX;
  const rightX = PAGE.width - PAGE.marginX;
  let y = await drawLetterhead(doc, leftX, contentWidth, PAGE.marginTop);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Receiving Note', PAGE.width / 2, y + 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text('(Refreshment / items issued from office)', PAGE.width / 2, y + 28, { align: 'center' });
  y += 40;

  const n = note || {};
  y = drawTableRows(
    doc,
    [
      ['Note No.', noteNo],
      ['Date', resolveDateLine(n.date)],
      ['Meeting', meetingTitle],
      ['Items', n.itemsIssued],
      ['Quantity', n.quantity],
      ['Purpose', n.purpose],
      ['Receiver', n.receiverName],
      ['Designation', n.receiverDesignation],
    ],
    leftX,
    y,
    contentWidth,
  );

  y += 8;
  doc.text('Received the above items for official use.', leftX, y);
  y += 12;
  if (issuerSignatory) {
    await drawSignatureBlock(doc, issuerSignatory, leftX, rightX, y, 'Signature');
  }

  doc.save(`refreshment-receiving-${noteNo || 'note'}.pdf`);
}
