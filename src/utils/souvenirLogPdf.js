import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDate } from './dates';
import { normalizeSouvenirLogEntries } from './souvenirLog';

const PAGE = {
  width: 210,
  marginX: 15,
  marginTop: 18,
};

export function downloadSouvenirLogPdf(souvenirs) {
  const rows = normalizeSouvenirLogEntries(souvenirs).sort((a, b) =>
    `${b.date || ''}`.localeCompare(`${a.date || ''}`),
  );

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'Souvenir Log', subject: 'Souvenirs' });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  let y = PAGE.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Souvenir Log', PAGE.marginX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE.marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Meeting Title', 'Meeting Date', 'Souvenirs']],
    body: rows.map((row) => [row.meeting, formatDisplayDate(row.date), row.detail]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 54 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: contentWidth - 54 - 30 },
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
    tableWidth: contentWidth,
  });

  doc.save(`souvenir-log-${new Date().toISOString().slice(0, 10)}.pdf`);
}
