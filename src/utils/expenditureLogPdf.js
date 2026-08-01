import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDate, getYearMonth } from './dates';
import { formatPKR } from './currency';
import { normalizeExpenditureCategory } from '../constants/expenditureCategories';
import {
  computeExpenditureBalance,
  filterExpendituresByRange,
  lastDayOfMonthISO,
  sumExpenditures,
} from './expenditureAnalytics';

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

function filterByMonth(expenditures, year, monthIndex) {
  const month = monthIndex + 1;
  return [...(expenditures || [])]
    .filter((e) => {
      const { year: y, month: m } = getYearMonth(e.date || '');
      return y === year && m === month;
    })
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));
}

export function downloadExpenditureLogPdf({
  expenditures,
  openingBalance,
  openingBalanceDate = '',
  year,
  monthIndex,
}) {
  const rows = filterByMonth(expenditures, year, monthIndex);
  const monthTotal = sumExpenditures(rows);
  const monthEnd = lastDayOfMonthISO(year, monthIndex + 1);
  const throughMonth = filterExpendituresByRange(
    expenditures,
    openingBalanceDate || '0000-01-01',
    monthEnd,
  );
  const { closingBalance } = computeExpenditureBalance({
    openingBalance,
    openingBalanceDate,
    expenditures: throughMonth,
  });
  const selectedMonth = monthLabel(year, monthIndex);
  const openingDateLabel = openingBalanceDate
    ? formatDisplayDate(openingBalanceDate)
    : '—';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `Expenditure Log - ${selectedMonth}`, subject: 'Expenditure' });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  let y = PAGE.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`Expenditure Log — ${selectedMonth}`, PAGE.marginX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE.marginX, y);
  y += 5;
  doc.text(
    `Opening Balance: ${formatPKR(openingBalance)} (effective from ${openingDateLabel})`,
    PAGE.marginX,
    y,
  );
  y += 4;
  doc.text(`This month total: ${formatPKR(monthTotal)}`, PAGE.marginX, y);
  y += 4;
  doc.text(`Closing Balance (through ${selectedMonth}): ${formatPKR(closingBalance)}`, PAGE.marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Sr#', 'Description', 'Category', 'Date', 'Amount (PKR)']],
    body: rows.map((e, i) => [
      String(i + 1),
      e.description || '—',
      normalizeExpenditureCategory(e.category),
      formatDisplayDate(e.date),
      formatPKR(e.amount),
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: contentWidth - 12 - 28 - 30 - 36 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 36, halign: 'right' },
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
    tableWidth: contentWidth,
  });

  const yyyymm = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  doc.save(`expenditure-log-${yyyymm}.pdf`);
}
