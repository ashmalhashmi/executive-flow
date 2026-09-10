import { jsPDF } from 'jspdf';
import {
  FILE_LABEL_BORDERS,
  FILE_LABEL_TITLE,
  PAFDA_LABEL_IDENTITY,
  fileLabelTypeFromPt,
  getFileLabelBox,
  resolveFileLabelFormat,
} from '../constants/labelTemplates';
import { fileLabelFilenameStem, normalizeFileLabelDesignation } from './fileLabelEntries';

function setPdfDash(doc, dash) {
  if (typeof doc.setLineDashPattern === 'function') {
    doc.setLineDashPattern(dash || [], 0);
  } else if (typeof doc.setLineDash === 'function') {
    doc.setLineDash(dash || [], 0);
  }
}

function drawFileLabelPdfBorder(doc, x, y, w, h, spec) {
  const kind = spec?.kind || 'solid';
  if (kind === 'none' || (!spec?.pdfWidth && kind !== 'corners')) return;

  const forest = PAFDA_LABEL_IDENTITY.colors.forestRgb;
  const gold = PAFDA_LABEL_IDENTITY.colors.goldRgb;
  doc.setDrawColor(...forest);

  if (kind === 'dashed' || kind === 'dotted') {
    doc.setLineWidth(spec.pdfWidth);
    setPdfDash(doc, spec.pdfDash || [2.2, 1.4]);
    doc.rect(x, y, w, h, 'S');
    setPdfDash(doc, []);
    return;
  }

  if (kind === 'rounded') {
    doc.setLineWidth(spec.pdfWidth);
    const r = spec.pdfRadius || 2.5;
    doc.roundedRect(x, y, w, h, r, r, 'S');
    return;
  }

  if (kind === 'double') {
    doc.setLineWidth(spec.pdfWidth);
    doc.rect(x, y, w, h, 'S');
    const g = spec.pdfInnerGap || 1.2;
    doc.setDrawColor(...gold);
    doc.setLineWidth(spec.pdfInnerWidth || 0.28);
    doc.rect(x + g, y + g, w - g * 2, h - g * 2, 'S');
    return;
  }

  if (kind === 'triple') {
    doc.setLineWidth(spec.pdfWidth);
    doc.rect(x, y, w, h, 'S');
    const g1 = spec.pdfInnerGap || 1.15;
    const g2 = spec.pdfMidGap || 2.25;
    doc.setDrawColor(...gold);
    doc.setLineWidth(spec.pdfInnerWidth || 0.28);
    doc.rect(x + g1, y + g1, w - g1 * 2, h - g1 * 2, 'S');
    doc.setDrawColor(...forest);
    doc.rect(x + g2, y + g2, w - g2 * 2, h - g2 * 2, 'S');
    return;
  }

  if (kind === 'corners') {
    const len = spec.pdfCornerLen || 8;
    doc.setLineWidth(spec.pdfWidth || 0.7);
    doc.line(x, y, x + len, y);
    doc.line(x, y, x, y + len);
    doc.line(x + w, y, x + w - len, y);
    doc.line(x + w, y, x + w, y + len);
    doc.line(x, y + h, x + len, y + h);
    doc.line(x, y + h, x, y + h - len);
    doc.line(x + w, y + h, x + w - len, y + h);
    doc.line(x + w, y + h, x + w, y + h - len);
    return;
  }

  if (spec.pdfWidth > 0) {
    doc.setLineWidth(spec.pdfWidth);
    doc.rect(x, y, w, h, 'S');
  }
}

function drawTrackedCentered(doc, text, cx, y, trackingMm) {
  const chars = String(text).split('');
  const widths = chars.map((ch) => doc.getTextWidth(ch));
  const total = widths.reduce((a, b) => a + b, 0) + trackingMm * Math.max(0, chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    doc.text(ch, x, y);
    x += widths[i] + trackingMm;
  });
}

function drawGoldDivider(doc, cx, y, widthMm) {
  const gold = PAFDA_LABEL_IDENTITY.colors.goldRgb;
  doc.setDrawColor(...gold);
  doc.setFillColor(...gold);
  doc.setLineWidth(0.32);
  const half = widthMm / 2;
  const gap = 2.4;
  doc.line(cx - half, y, cx - gap, y);
  doc.line(cx + gap, y, cx + half, y);
  const s = 0.72;
  doc.rect(cx - s, y - s, s * 2, s * 2, 'F');
}

/**
 * Official 3-tier PAFDA plate, centered on A4.
 * `copies` → that many identical pages (one plate per page).
 */
export async function buildFileLabelPdf({ name, ...formatRaw }) {
  const identity = PAFDA_LABEL_IDENTITY;
  const title = normalizeFileLabelDesignation(name) || '—';
  const format = resolveFileLabelFormat(formatRaw);
  const type = fileLabelTypeFromPt(format.fontSize);
  const box = getFileLabelBox(format.orientation);
  const isPortrait = format.orientation === 'portrait';
  const cellW = box.widthMm;
  const cellH = box.heightMm;
  const pageOrient = box.page;
  const pageW = pageOrient === 'landscape' ? 297 : 210;
  const pageH = pageOrient === 'landscape' ? 210 : 297;
  const x = (pageW - cellW) / 2;
  const y = (pageH - cellH) / 2;
  const pad = 5;
  const innerW = cellW - pad * 2;
  const cx = x + cellW / 2;
  const copies = format.copies;

  const doc = new jsPDF({ orientation: pageOrient, unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `${FILE_LABEL_TITLE} — ${title}`,
    subject: `${identity.acronym} — ${identity.legalName}`,
  });

  const acrPt = isPortrait ? 11 : 14;
  const legalPt = isPortrait ? 6.2 : 7.5;
  const desigPt = isPortrait ? Math.min(type.pdfPt, 16) : type.pdfPt;
  const acrH = acrPt * 0.38;
  const legalLineH = legalPt * 0.4;
  const desigLineH = desigPt * 0.42;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(legalPt);
  const legalLines = doc.splitTextToSize(identity.legalName, innerW);
  const legalH = legalLines.length * legalLineH;

  doc.setFont('helvetica', format.nameWeight === 'regular' ? 'normal' : 'bold');
  doc.setFontSize(desigPt);
  const desigLines = doc.splitTextToSize(title, innerW);
  const desigH = desigLines.length * desigLineH;

  const divH = 3.4;
  const stackH = acrH + 1.35 + legalH + 2.1 + divH + 2.4 + desigH;
  const contentTop = y + Math.max(pad, (cellH - stackH) / 2);

  const drawPlate = () => {
    drawFileLabelPdfBorder(doc, x, y, cellW, cellH, FILE_LABEL_BORDERS[format.border]);
    let cy = contentTop;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(acrPt);
    doc.setTextColor(...identity.colors.forestRgb);
    cy += acrH * 0.92;
    drawTrackedCentered(doc, identity.acronym, cx, cy, isPortrait ? 0.42 : 0.68);
    cy += 1.35;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(legalPt);
    doc.setTextColor(...identity.colors.slateRgb);
    legalLines.forEach((line) => {
      cy += legalLineH;
      doc.text(line, cx, cy, { align: 'center' });
    });
    cy += 2.1;

    drawGoldDivider(doc, cx, cy + 0.8, Math.min(innerW * 0.48, isPortrait ? 28 : 52));
    cy += divH + 2.4;

    doc.setFont('helvetica', format.nameWeight === 'regular' ? 'normal' : 'bold');
    doc.setFontSize(desigPt);
    doc.setTextColor(...identity.colors.inkRgb);
    desigLines.forEach((line) => {
      cy += desigLineH;
      doc.text(line, cx, cy, { align: 'center' });
    });
  };

  for (let i = 0; i < copies; i += 1) {
    if (i > 0) doc.addPage();
    drawPlate();
  }

  const stem = fileLabelFilenameStem(title);
  const filename = `file-label-${stem}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return { doc, filename };
}

export async function downloadFileLabelPdf(options) {
  const { doc, filename } = await buildFileLabelPdf(options);
  doc.save(filename);
  return filename;
}

/** Same PDF as Download — base64 for Resend email attachment. */
export async function buildFileLabelPdfBase64(options) {
  const { doc, filename } = await buildFileLabelPdf(options);
  const dataUri = doc.output('datauristring');
  const base64 = String(dataUri).includes(',')
    ? String(dataUri).split(',')[1]
    : String(dataUri);
  return { base64, filename };
}

/** @deprecated use downloadFileLabelPdf */
export async function downloadLabelPdf(options) {
  return downloadFileLabelPdf({ name: options?.fields?.line1 || options?.name, ...options });
}
