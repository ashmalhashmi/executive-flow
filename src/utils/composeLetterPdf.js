import { jsPDF } from 'jspdf';
import { formatDisplayDate, getTodayISO } from './dates';
import { loadPafdaLetterheadDataUrl } from './composeLetterheadImage';

const PAGE = { width: 210, marginX: 18, marginTop: 14, line: 6 };

/**
 * Pull No. / Date from draft body so PDF/Word header stays left-aligned even after edits.
 */
export function extractComposeLetterHeader(body, letterNoHint) {
  const text = String(body || '');
  const noMatch = text.match(/^(?:No\.|File No\.)\s*(.*)$/im);
  const dateMatch = text.match(/^Date:\s*(.*)$/im);

  const letterNo =
    String(letterNoHint || '').trim() ||
    (noMatch ? String(noMatch[1] || '').trim() : '');

  const dateLine =
    (dateMatch ? String(dateMatch[1] || '').trim() : '') || formatDisplayDate(getTodayISO());

  const rest = text
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (/^(?:No\.|File No\.)\s*/i.test(t)) return false;
      if (/^Date:\s*/i.test(t)) return false;
      return true;
    })
    .join('\n')
    .replace(/^\s+/, '');

  return { letterNo, dateLine, rest, noLabel: noMatch?.[0]?.startsWith('File') ? 'File No.' : 'No.' };
}

function extractHeader(body, letterNoHint) {
  return extractComposeLetterHeader(body, letterNoHint);
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1];
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Govt-style PDF: optional PAFDA letterhead, then Letter No. and Date on the LEFT.
 * Optional reference attachment appended (image page or note for PDF file).
 */
export async function downloadComposeLetterPdf({
  subject,
  body,
  letterNo,
  referenceAttachment,
  attachPafdaHeader = false,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: subject || 'Composed Letter',
    subject: 'Executive Flow Compose',
  });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  const leftX = PAGE.marginX;
  let y = PAGE.marginTop;

  if (attachPafdaHeader) {
    try {
      const dataUrl = await loadPafdaLetterheadDataUrl();
      const imgH = 28;
      doc.addImage(dataUrl, 'PNG', leftX, y, contentWidth, imgH, undefined, 'FAST');
      y += imgH + 6;
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('PUNJAB AGRICULTURE, FOOD & DRUG AUTHORITY', PAGE.width / 2, y, {
        align: 'center',
      });
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Govt. of the Punjab', PAGE.width / 2, y, { align: 'center' });
      y += 8;
    }
  }

  const header = extractHeader(body, letterNo);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  if (header.letterNo) {
    const noLabel = String(body || '').match(/^File No\./im) ? 'File No.' : 'No.';
    doc.text(`${noLabel} ${header.letterNo}`, leftX, y, { align: 'left' });
    y += PAGE.line;
  }
  doc.text(`Date: ${header.dateLine}`, leftX, y, { align: 'left' });
  y += PAGE.line + 4;

  const lines = doc.splitTextToSize(header.rest || '', contentWidth);
  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = PAGE.marginTop;
    }
    doc.text(line, leftX, y, { align: 'left' });
    y += PAGE.line;
  }

  const att = referenceAttachment;
  if (att?.dataUrl && att?.name) {
    doc.addPage();
    y = PAGE.marginTop;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Enclosure — Referenced letter', leftX, y, { align: 'left' });
    y += PAGE.line + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`File: ${att.name}`, leftX, y, { align: 'left' });
    y += PAGE.line + 4;

    const mime = String(att.mimeType || '');
    if (mime.startsWith('image/')) {
      try {
        const format = mime.includes('png') ? 'PNG' : 'JPEG';
        const maxW = contentWidth;
        const maxH = 240;
        doc.addImage(att.dataUrl, format, leftX, y, maxW, maxH, undefined, 'FAST');
      } catch {
        doc.text('(Image enclosure could not be embedded — print separately.)', leftX, y);
      }
    } else if (mime === 'application/pdf') {
      doc.text(
        'Referenced letter is a PDF file. This export notes the enclosure;',
        leftX,
        y,
      );
      y += PAGE.line;
      doc.text(
        'please attach the original PDF when dispatching (or print both).',
        leftX,
        y,
      );
      void dataUrlToUint8Array(att.dataUrl);
    } else {
      doc.text('Enclosure on file — attach original when dispatching.', leftX, y);
    }
  }

  const safe = String(subject || 'letter')
    .replace(/[^\w\-]+/g, '-')
    .slice(0, 40);
  doc.save(`compose-${safe}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
