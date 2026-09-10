import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDate } from './dates';
import { sortDakRegisterEntries } from './dakEntries';

const PAGE = {
  width: 210,
  marginX: 15,
  marginTop: 18,
};

export function downloadDakIssuancePdf(dakEntries) {
  const rows = sortDakRegisterEntries((dakEntries || []).filter((d) => d.status !== 'cancelled'));

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'Dak Issuance Log', subject: 'Dak Issuance' });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  let y = PAGE.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Dak Issuance Log', PAGE.marginX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE.marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Sr#', 'Subject', 'Date (Dispatched)', 'Date Received', 'Marked To']],
    body: rows.map((d) => [
      String(d.registerSr || '—'),
      d.subject || '-',
      d.forwardedDate ? formatDisplayDate(d.forwardedDate) : '-',
      d.receivedDate ? formatDisplayDate(d.receivedDate) : '-',
      d.designation || '-',
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [76, 29, 149], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: contentWidth - 10 - 24 - 24 - 28 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 28 },
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
    tableWidth: contentWidth,
  });

  doc.save(`dak-issuance-log-${new Date().toISOString().slice(0, 10)}.pdf`);
}
