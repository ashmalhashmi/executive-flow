import { jsPDF } from 'jspdf';
import { getContactEmails, getContactPhones, getContactContactNos } from './contactEntries';
import autoTable from 'jspdf-autotable';

const PAGE = {
  width: 210,
  marginX: 12,
  marginTop: 18,
};

export function downloadContactDatabasePdf(contacts) {
  const rows = [...(contacts || [])]
    .filter((c) => c.status !== 'archived')
    .sort((a, b) => a.name.localeCompare(b.name));

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'Contact Database', subject: 'Contacts' });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  let y = PAGE.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Contact Database', PAGE.marginX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()} · ${rows.length} contacts`, PAGE.marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Sr#', 'Name', 'Department', 'Designation', 'Phone', 'Contact No', 'Email', 'Website', 'Address']],
    body: rows.map((c, i) => [
      String(i + 1),
      c.name || '—',
      c.department || '—',
      c.designation || '—',
      getContactPhones(c).join(', ') || '—',
      getContactContactNos(c).join(', ') || '—',
      getContactEmails(c).join(', ') || '—',
      c.website || '—',
      c.address || '—',
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 19 },
      5: { cellWidth: 19 },
      6: { cellWidth: 27 },
      7: { cellWidth: 24 },
      8: { cellWidth: contentWidth - 9 - 24 - 20 - 20 - 19 - 19 - 27 - 24 },
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
    tableWidth: contentWidth,
  });

  doc.save(`contact-database-${new Date().toISOString().slice(0, 10)}.pdf`);
}
