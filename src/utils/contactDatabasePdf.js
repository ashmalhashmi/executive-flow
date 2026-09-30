import { jsPDF } from 'jspdf';
import { getContactEmails, getContactPhones, getContactContactNos } from './contactEntries';
import { getContactCategoryLabel } from './contactCategories';

const PAGE = {
  width: 210,
  height: 297,
  marginX: 14,
  marginTop: 16,
  marginBottom: 16,
};

function ensureSpace(doc, y, needed) {
  if (y + needed <= PAGE.height - PAGE.marginBottom) return y;
  doc.addPage();
  return PAGE.marginTop;
}

function wrapLines(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text || '').trim(), maxWidth).filter(Boolean);
}

function buildContactBlocks(doc, contacts, contentWidth) {
  const innerWidth = contentWidth - 6;
  const lineH = 4.2;

  return contacts.map((contact, index) => {
    const phones = getContactPhones(contact);
    const alts = getContactContactNos(contact);
    const emails = getContactEmails(contact);
    const category = getContactCategoryLabel(contact.category);
    const orgLine = [contact.department, contact.designation].filter(Boolean).join('  ·  ');
    const phoneLine = [
      phones.length ? `Mobile: ${phones.join(', ')}` : '',
      alts.length ? `Office: ${alts.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('   ');

    const lines = [];
    lines.push({
      kind: 'title',
      left: `${index + 1}.  ${contact.name || '—'}`,
      right: category,
    });
    if (orgLine) lines.push({ kind: 'muted', text: orgLine });
    if (phoneLine) lines.push({ kind: 'body', text: phoneLine });
    if (emails.length) lines.push({ kind: 'body', text: `Email: ${emails.join(', ')}` });
    if (contact.website) lines.push({ kind: 'link', text: `Web: ${contact.website}` });
    if (contact.address) lines.push({ kind: 'body', text: `Address: ${contact.address}` });

    // Measure wrapped height
    let height = 3.5 * 2; // padding
    for (const row of lines) {
      if (row.kind === 'title') {
        height += 5.5;
        continue;
      }
      const wrapped = wrapLines(doc, row.text, innerWidth);
      height += Math.max(wrapped.length, 1) * lineH + 1.1;
    }
    height = Math.max(height, 16);

    return { lines, height, innerWidth, lineH };
  });
}

function buildContactDatabaseDoc(contacts) {
  const rows = [...(contacts || [])]
    .filter((c) => c.status !== 'archived')
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'Contact Database', subject: 'External contacts' });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  let y = PAGE.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text('Contact Database', PAGE.marginX, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Generated ${new Date().toLocaleString()}  ·  ${rows.length} contact${rows.length === 1 ? '' : 's'}`,
    PAGE.marginX,
    y,
  );
  y += 4;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(PAGE.marginX, y, PAGE.marginX + contentWidth, y);
  y += 6;

  if (!rows.length) {
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('No contacts to export.', PAGE.marginX, y);
  }

  // Font size for measurement pass
  doc.setFontSize(9);
  const blocks = buildContactBlocks(doc, rows, contentWidth);

  blocks.forEach((block) => {
    y = ensureSpace(doc, y, block.height + 3.5);

    // Card background + border
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(PAGE.marginX, y, contentWidth, block.height, 1.8, 1.8, 'FD');

    let cursor = y + 3.5 + 3.8;
    const textX = PAGE.marginX + 3;

    for (const row of block.lines) {
      if (row.kind === 'title') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(25, 25, 25);
        doc.text(row.left, textX, cursor);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(40, 90, 110);
        doc.text(row.right, PAGE.marginX + contentWidth - 3, cursor, { align: 'right' });
        cursor += 5.5;
        continue;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (row.kind === 'muted') doc.setTextColor(75, 75, 75);
      else if (row.kind === 'link') doc.setTextColor(40, 90, 110);
      else doc.setTextColor(35, 35, 35);

      const wrapped = wrapLines(doc, row.text, block.innerWidth);
      doc.text(wrapped, textX, cursor);
      cursor += Math.max(wrapped.length, 1) * block.lineH + 1.1;
    }

    y += block.height + 3.5;
  });

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${p} of ${pageCount}`, PAGE.width / 2, PAGE.height - 8, { align: 'center' });
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `contact-database-${dateStamp}.pdf`;
  return { doc, rows, filename };
}

/** Same PDF as Download — base64 for Resend email attachment. */
export function buildContactDatabasePdfBase64(contacts) {
  const { doc, rows, filename } = buildContactDatabaseDoc(contacts);
  const dataUri = doc.output('datauristring');
  const base64 = String(dataUri).includes(',')
    ? String(dataUri).split(',')[1]
    : String(dataUri);
  return {
    base64,
    filename,
    count: rows.length,
  };
}

export function downloadContactDatabasePdf(contacts) {
  const { doc, filename } = buildContactDatabaseDoc(contacts);
  doc.save(filename);
}
