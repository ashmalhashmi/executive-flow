import { jsPDF } from 'jspdf';
import { formatDisplayDate, getTodayISO } from './dates';
import { loadPafdaLetterheadDataUrl } from './composeLetterheadImage';
import { loadReceivingNoteSignatureDataUrl } from './receivingNoteSignatureImage';

const PAGE = { width: 210, height: 297, marginX: 18, marginTop: 14, line: 6 };
const SIGNATURE = 'Ashmal Hashmi, PS to DG PAFDA';
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

/**
 * Receiving Note PDF
 * - PAFDA header top
 * - Date + Order No. on the RIGHT
 * - Vendor separate
 * - Title + statement in the MID of the page
 * - Small gap then handwritten signature image + typed name on the RIGHT
 */
export async function downloadOrderReceivingNotePdf({
  orderNo,
  dateISO,
  vendor,
  statement,
  itemsReceived,
  fileBaseName = '',
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `Receiving Note — ${orderNo || 'Order'}`,
    subject: 'PAFDA Order Receiving Note',
  });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  const leftX = PAGE.marginX;
  const rightX = PAGE.width - PAGE.marginX;
  let y = PAGE.marginTop;

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
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Govt. of the Punjab', PAGE.width / 2, y, { align: 'center' });
    y += 10;
  }

  const dateLine = resolveDateLine(dateISO);
  const orderLabel = String(orderNo || '').trim() || '________________';
  const vendorLabel = String(vendor || '').trim();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Date: ${dateLine}`, rightX, y, { align: 'right' });
  y += PAGE.line;
  doc.text(`Order No.: ${orderLabel}`, rightX, y, { align: 'right' });
  y += PAGE.line + 2;

  if (vendorLabel) {
    doc.text(`Vendor: ${vendorLabel}`, leftX, y, { align: 'left' });
    y += PAGE.line;
  }

  const bodyText =
    String(statement || '').trim() ||
    String(itemsReceived || '').trim() ||
    '—';
  const bodyLines = doc.splitTextToSize(bodyText, contentWidth);
  const titleH = 8;
  const bodyH = bodyLines.length * PAGE.line;
  const sigBlockH = SIG_IMG_H + PAGE.line * 2 + 6;
  const gapAfterStatement = 12;

  const midTarget = PAGE.height / 2 - 10;
  const blockTop = Math.max(y + 8, midTarget - (titleH + bodyH) / 2);
  y = blockTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Receiving Note', PAGE.width / 2, y, { align: 'center' });
  y += titleH;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  for (const line of bodyLines) {
    if (y > PAGE.height - 40) {
      doc.addPage();
      y = PAGE.marginTop;
    }
    doc.text(line, leftX, y);
    y += PAGE.line;
  }

  y += gapAfterStatement;
  if (y + sigBlockH > PAGE.height - PAGE.marginX) {
    doc.addPage();
    y = PAGE.marginTop + 20;
  }

  try {
    const sigDataUrl = await loadReceivingNoteSignatureDataUrl();
    doc.addImage(sigDataUrl, 'PNG', rightX - SIG_IMG_W, y, SIG_IMG_W, SIG_IMG_H, undefined, 'FAST');
    y += SIG_IMG_H + 2;
  } catch {
    // typed name still prints below
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const sigLines = SIGNATURE.split(',').map((p) => p.trim());
  doc.text(sigLines[0] || SIGNATURE, rightX, y, { align: 'right' });
  if (sigLines[1]) {
    y += PAGE.line;
    doc.text(sigLines.slice(1).join(', '), rightX, y, { align: 'right' });
  }

  const safe =
    String(fileBaseName || '').trim() ||
    String(orderNo || 'order')
      .replace(/[^\w\-]+/g, '-')
      .slice(0, 40);
  doc.save(`receiving-note-${safe}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export const RECEIVING_NOTE_SIGNATURE = SIGNATURE;
