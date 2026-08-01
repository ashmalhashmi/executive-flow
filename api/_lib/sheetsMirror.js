/**
 * Google Sheet backup = one correct mirror of app data (not append-forever copies).
 * Analogy: magic box keeps a single accurate drawing, not 10 wrong duplicates.
 */

export const SHEETS_FORMAT_VERSION = 'mirror-v1';

export function dedupeRowsById(rows, idColIndex = 0) {
  const seen = new Set();
  const out = [];
  // Last write wins for duplicate IDs in the payload itself
  for (let i = (rows || []).length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    const id = String(row?.[idColIndex] ?? '').trim();
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const normalized = [...row];
    out.push(normalized);
  }
  return out.reverse();
}

export function snapshotHasAnyDomainData({
  meetings = [],
  souvenirs = [],
  expenditure = {},
  orders = [],
  dak = [],
  tasks = [],
  contacts = [],
}) {
  const expenses = expenditure?.expenditures || [];
  return (
    meetings.length > 0 ||
    souvenirs.length > 0 ||
    expenses.length > 0 ||
    orders.length > 0 ||
    dak.length > 0 ||
    tasks.length > 0 ||
    contacts.length > 0 ||
    Number(expenditure?.openingBalance) > 0
  );
}

export function orderStatusLabel(o) {
  if (o.status === 'received') return 'Received';
  if (o.status === 'cancelled') return 'Cancelled';
  return 'Pending';
}

export function taskStatusLabel(t) {
  if (t.status === 'done') return 'Done';
  if (t.status === 'cancelled') return 'Cancelled';
  return 'Pending';
}

export function contactSheetRow(c) {
  const phones = Array.isArray(c.phones) && c.phones.length
    ? c.phones.join(', ')
    : c.phone || '';
  const emails = Array.isArray(c.emails) && c.emails.length
    ? c.emails.join(', ')
    : c.email || '';
  const contactNos = Array.isArray(c.contactNos) && c.contactNos.length
    ? c.contactNos.join(', ')
    : c.contactNo || '';
  return [
    c.id || '',
    c.name || '',
    phones,
    emails,
    c.designation || '',
    contactNos,
    c.address || '',
  ];
}

export function buildSouvenirDataRows(souvenirs) {
  const rows = [];
  const seenBatches = new Set();
  const legacyGrouped = new Map();

  const pushObj = (id, meeting, date, detail) => {
    if (!detail?.trim()) return;
    rows.push({
      id,
      meeting: meeting || '—',
      date: date || '',
      detail: detail.trim(),
    });
  };

  for (const s of souvenirs || []) {
    if (s.detail?.trim() && s.source === 'calendar-meeting') {
      pushObj(s.id, s.meetingTitle, s.dateDistributed, s.detail);
      continue;
    }
    if (s.presentationBatchId) {
      if (seenBatches.has(s.presentationBatchId)) continue;
      seenBatches.add(s.presentationBatchId);
      const batchItems = souvenirs.filter((x) => x.presentationBatchId === s.presentationBatchId);
      const raw = batchItems.find((x) => x.rawPresentationText)?.rawPresentationText;
      const detail =
        raw?.trim() ||
        batchItems.map((x) => `${x.itemName || ''}: ${x.quantity ?? ''}`).join(', ');
      pushObj(s.presentationBatchId, s.meetingTitle, s.dateDistributed, detail);
      continue;
    }
    if (s.source === 'calendar-meeting' && s.meetingTitle) {
      const key = `${s.meetingTitle}|${s.dateDistributed || ''}`;
      const piece =
        s.rawPresentationText?.trim() ||
        (s.itemName ? `${s.itemName}${s.quantity != null ? `: ${s.quantity}` : ''}` : '');
      if (!piece) continue;
      const existing = legacyGrouped.get(key);
      if (existing) existing.pieces.push(piece);
      else {
        legacyGrouped.set(key, {
          id: s.id,
          meeting: s.meetingTitle,
          date: s.dateDistributed,
          pieces: [piece],
        });
      }
    }
  }

  legacyGrouped.forEach((g) => {
    pushObj(g.id, g.meeting, g.date, g.pieces.join(', '));
  });

  return dedupeRowsById(
    rows.map((r) => [r.id, r.meeting, r.detail, r.date]),
    0,
  );
}

export function expenditureBalanceTotals(expenditure) {
  const opening = Number(expenditure?.openingBalance) || 0;
  const from = String(expenditure?.openingBalanceDate ?? '').trim();
  const items = expenditure?.expenditures || [];
  const total = items.reduce((sum, x) => {
    if (from && x.date && String(x.date) < from) return sum;
    return sum + (Number(x.amount) || 0);
  }, 0);
  return { opening, from, total, closing: opening - total };
}

export const EXPENDITURE_HEADER_ROW = 6;
