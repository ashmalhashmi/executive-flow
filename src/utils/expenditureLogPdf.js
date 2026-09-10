import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDate, getTodayISO } from './dates';
import { formatPKR } from './currency';
import {
  filterExpendituresByRange,
  groupExpendituresByCategoryBlocks,
  sumExpenditures,
} from './expenditureAnalytics';

const PAGE = {
  width: 210,
  marginX: 15,
  marginTop: 18,
};

/**
 * Expenditure PDF: opening date → today, grouped by category with subtotals.
 */
export function downloadExpenditureLogPdf({
  expenditures,
  openingBalance,
  openingBalanceDate = '',
}) {
  const today = getTodayISO();
  const rangeStart = String(openingBalanceDate || '').trim() || '0000-01-01';
  const rows = filterExpendituresByRange(expenditures, rangeStart, today);
  const totalSpent = sumExpenditures(rows);
  const opening = Math.max(0, Number(openingBalance) || 0);
  const closingBalance = opening - totalSpent;
  const blocks = groupExpendituresByCategoryBlocks(rows);

  const openingDateLabel = openingBalanceDate
    ? formatDisplayDate(openingBalanceDate)
    : '—';
  const todayLabel = formatDisplayDate(today);
  const rangeLabel =
    openingBalanceDate
      ? `${openingDateLabel} – ${todayLabel}`
      : `through ${todayLabel}`;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `Expenditure Log — ${rangeLabel}`,
    subject: 'Expenditure',
  });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  let y = PAGE.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Expenditure Log', PAGE.marginX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE.marginX, y);
  y += 5;
  doc.text(`Date range: ${rangeLabel}`, PAGE.marginX, y);
  y += 7;

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Summary', PAGE.marginX, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`1) Opening Balance: ${formatPKR(opening)}`, PAGE.marginX, y);
  y += 5;
  doc.text(`2) Total Expenditure (Date Range): ${formatPKR(totalSpent)}`, PAGE.marginX, y);
  y += 5;
  doc.text(`3) Closing Balance: ${formatPKR(closingBalance)}`, PAGE.marginX, y);
  y += 8;

  if (!blocks.length) {
    doc.setTextColor(100, 100, 100);
    doc.text('No expenditures in this date range.', PAGE.marginX, y);
  } else {
    let sr = 1;
    for (const block of blocks) {
      if (y > 260) {
        doc.addPage();
        y = PAGE.marginTop;
      }

      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(block.category, PAGE.marginX, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [['Sr#', 'Description', 'Date', 'Amount (PKR)']],
        body: [
          ...block.items.map((e) => [
            String(sr++),
            e.description || '—',
            formatDisplayDate(e.date),
            formatPKR(e.amount),
          ]),
          [
            {
              content: `Subtotal — ${block.category}`,
              colSpan: 3,
              styles: { fontStyle: 'bold', halign: 'right' },
            },
            {
              content: formatPKR(block.subtotal),
              styles: { fontStyle: 'bold', halign: 'right' },
            },
          ],
        ],
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: contentWidth - 14 - 32 - 36 },
          2: { cellWidth: 32, halign: 'center' },
          3: { cellWidth: 36, halign: 'right' },
        },
        margin: { left: PAGE.marginX, right: PAGE.marginX },
        tableWidth: contentWidth,
      });

      y = (doc.lastAutoTable?.finalY || y) + 8;
    }
  }

  doc.save(`expenditure-log-${today}.pdf`);
}
