import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAGE = {
  width: 210,
  marginX: 15,
  marginTop: 18,
};

function statusLabel(status) {
  if (status === 'received') return 'Received';
  if (status === 'cancelled') return 'Cancelled';
  return 'Pending';
}

export function downloadOrderHistoryPdf(orders) {
  const rows = [...orders]
    .filter((o) => o.status !== 'cancelled')
    .sort((a, b) => `${b.placedDate}`.localeCompare(`${a.placedDate}`));

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'Order History', subject: 'Orders' });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  let y = PAGE.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Order History', PAGE.marginX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE.marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Qty', 'Placed Date', 'Status / Date']],
    body: rows.map((o) => {
      const base = statusLabel(o.status);
      const received =
        o.status === 'received' && o.receivedAt
          ? `${base} — ${new Date(o.receivedAt).toLocaleDateString()}`
          : base;
      return [o.item, String(o.quantity), o.placedDate || '', received];
    }),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 11, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: contentWidth - 22 - 28 - 38 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 38, halign: 'center' },
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
    tableWidth: contentWidth,
  });

  doc.save(`order-history-${new Date().toISOString().slice(0, 10)}.pdf`);
}
