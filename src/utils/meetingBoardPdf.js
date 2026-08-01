import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayTime } from './dates';

const PAGE = {
  width: 210,
  height: 297,
  marginX: 15,
  marginTop: 18,
  marginBottom: 15,
};

function formatBoardDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function downloadMeetingBoardPdf({ dateISO, meetings }) {
  const sorted = [...meetings].sort((a, b) => a.time.localeCompare(b.time));
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.setProperties({
    title: formatBoardDate(dateISO),
    subject: 'Meetings',
  });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  let y = PAGE.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(formatBoardDate(dateISO), PAGE.marginX, y);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text(`Total meetings: ${sorted.length}`, PAGE.marginX, y);
  y += 8;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(PAGE.marginX, y, PAGE.marginX + contentWidth, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Sr#', 'Meeting', 'Time', 'Venue']],
    body: sorted.map((meeting, index) => [
      String(index + 1),
      meeting.title,
      formatDisplayTime(meeting.time),
      meeting.location?.trim() || '—',
    ]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 11,
      cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
      overflow: 'linebreak',
      lineColor: [160, 160, 160],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11,
      halign: 'center',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 76 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: contentWidth - 14 - 76 - 30 },
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX, top: PAGE.marginTop },
    tableWidth: contentWidth,
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageNumber = data.pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${pageNumber} of ${pageCount}`,
        PAGE.width / 2,
        PAGE.height - 8,
        { align: 'center' },
      );
    },
  });

  doc.save(`meeting-board-${dateISO}.pdf`);
}
