import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDate } from './dates';

const PAGE = {
  width: 210,
  marginX: 15,
  marginTop: 18,
};

function monthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function downloadMonthlyMeetingLogPdf({ meetings, year, monthIndex }) {
  const selectedMonth = monthLabel(year, monthIndex);
  const rows = [...(meetings || [])]
    .filter((m) => {
      const [y, mo] = `${m.date || ''}`.split('-').map(Number);
      return y === year && mo === monthIndex + 1;
    })
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `Meeting Log - ${selectedMonth}`, subject: 'Monthly Meetings' });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  let y = PAGE.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`Meeting Log - ${selectedMonth}`, PAGE.marginX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE.marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Sr#', 'Meeting Title', 'Date']],
    body: rows.map((m, i) => [String(i + 1), m.title || '—', formatDisplayDate(m.date)]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 11, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: contentWidth - 16 - 36 },
      2: { cellWidth: 36, halign: 'center' },
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
    tableWidth: contentWidth,
  });

  const yyyymm = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  doc.save(`meeting-log-${yyyymm}.pdf`);
}
