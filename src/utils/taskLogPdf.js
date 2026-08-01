import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDate, formatDisplayTime } from './dates';
import { taskStatusLabel } from './taskEntries';

const PAGE = {
  width: 210,
  marginX: 15,
  marginTop: 18,
};

function sortTasks(entries) {
  return [...(entries || [])]
    .filter((t) => t.status !== 'cancelled')
    .sort((a, b) => {
      const statusOrder = (s) => (s === 'active' ? 0 : 1);
      const byStatus = statusOrder(a.status) - statusOrder(b.status);
      if (byStatus !== 0) return byStatus;
      return `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`);
    });
}

export function downloadTaskLogPdf(taskEntries) {
  const rows = sortTasks(taskEntries);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'Task Log', subject: 'Tasks' });

  const contentWidth = PAGE.width - PAGE.marginX * 2;
  let y = PAGE.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Task Log', PAGE.marginX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE.marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Sr#', 'Task', 'Date', 'Time', 'Status']],
    body: rows.map((t, i) => [
      String(i + 1),
      t.title || '—',
      t.date ? formatDisplayDate(t.date) : '—',
      t.time ? formatDisplayTime(t.time) : '—',
      taskStatusLabel(t.status),
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [180, 83, 9], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: contentWidth - 10 - 28 - 22 - 22 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: PAGE.marginX, right: PAGE.marginX },
    tableWidth: contentWidth,
  });

  doc.save(`task-log-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadSingleTaskPdf(entry) {
  if (!entry) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: entry.title, subject: 'Task' });

  let y = PAGE.marginTop;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Task', PAGE.marginX, y);
  y += 10;

  const lines = [
    ['Task', entry.title || '—'],
    ['Date', entry.date ? formatDisplayDate(entry.date) : '—'],
    ['Time', entry.time ? formatDisplayTime(entry.time) : '—'],
    ['Status', taskStatusLabel(entry.status)],
  ];

  doc.setFontSize(11);
  lines.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(`${label}:`, PAGE.marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(String(value), PAGE.marginX + 28, y);
    y += 8;
  });

  const safeTitle = (entry.title || 'task').replace(/[^\w\-]+/g, '-').slice(0, 40);
  doc.save(`task-${safeTitle}-${entry.date || 'export'}.pdf`);
}
