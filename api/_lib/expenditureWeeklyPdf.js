import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDateISO } from './weekRange.js';

function formatPKR(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'Rs. 0';
  return `Rs. ${Math.round(n).toLocaleString('en-PK')}`;
}

function filterByRange(expenditures, startISO, endISO) {
  return [...(expenditures || [])]
    .filter((e) => {
      const date = String(e.date || '');
      return date && date >= startISO && date <= endISO;
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function sumAmount(items) {
  return (items || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

function computeClosing({ openingBalance = 0, openingBalanceDate = '', expenditures = [] }) {
  const opening = Math.max(0, Number(openingBalance) || 0);
  const from = String(openingBalanceDate || '').trim();
  const relevant = (expenditures || []).filter((e) => {
    if (!e.date) return false;
    if (from && e.date < from) return false;
    return true;
  });
  const totalSpent = sumAmount(relevant);
  return { opening, totalSpent, closingBalance: opening - totalSpent };
}

/**
 * Weekly expenditure summary PDF as base64 for email attachment.
 */
export function buildWeeklyExpenditurePdfBase64({
  expenditures,
  openingBalance = 0,
  openingBalanceDate = '',
  weekStart,
  weekEnd,
}) {
  const rows = filterByRange(expenditures, weekStart, weekEnd);
  const weekTotal = sumAmount(rows);
  const { opening, closingBalance } = computeClosing({
    openingBalance,
    openingBalanceDate,
    expenditures,
  });

  const weekLabel = `${formatDisplayDateISO(weekStart)} – ${formatDisplayDateISO(weekEnd)}`;
  const title = `Expenditure Weekly Summary — ${weekLabel}`;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title, subject: 'Weekly Expenditure' });

  const marginX = 15;
  const contentWidth = 210 - marginX * 2;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Expenditure Weekly Summary', marginX, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Week: ${weekLabel}`, marginX, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`, marginX, y);
  y += 5;
  doc.text(`Opening Balance: ${formatPKR(opening)}`, marginX, y);
  y += 4;
  doc.text(`This week total: ${formatPKR(weekTotal)} (${rows.length} entries)`, marginX, y);
  y += 4;
  doc.text(`Closing Balance (overall): ${formatPKR(closingBalance)}`, marginX, y);
  y += 6;

  if (!rows.length) {
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text('No expenditures recorded this week.', marginX, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Sr#', 'Description', 'Category', 'Date', 'Amount (PKR)']],
      body: rows.map((e, i) => [
        String(i + 1),
        e.description || '—',
        e.category || 'Other',
        formatDisplayDateISO(e.date),
        formatPKR(e.amount),
      ]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: contentWidth - 12 - 28 - 28 - 34 },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 28, halign: 'center' },
        4: { cellWidth: 34, halign: 'right' },
      },
      margin: { left: marginX, right: marginX },
      tableWidth: contentWidth,
    });
  }

  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';
  return {
    base64,
    filename: `expenditure-weekly-${weekStart}_to_${weekEnd}.pdf`,
    title,
    weekLabel,
    weekTotal,
    count: rows.length,
    closingBalance,
    rows,
  };
}
