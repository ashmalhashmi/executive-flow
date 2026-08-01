/** Souvenir Log: Sr#, Meeting Title, Souvenirs (exact user text), Date */

export function normalizeSouvenirLogEntries(souvenirs) {
  const rows = [];
  const seenBatches = new Set();
  const legacyGrouped = new Map();

  const pushRow = (id, meeting, date, detail) => {
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
      pushRow(s.id, s.meetingTitle, s.dateDistributed, s.detail);
      continue;
    }

    if (s.presentationBatchId) {
      if (seenBatches.has(s.presentationBatchId)) continue;
      seenBatches.add(s.presentationBatchId);

      const batchItems = souvenirs.filter(
        (x) => x.presentationBatchId === s.presentationBatchId,
      );
      const raw = batchItems.find((x) => x.rawPresentationText)?.rawPresentationText;
      const detail =
        raw?.trim() ||
        batchItems.map((x) => `${x.itemName}: ${x.quantity}`).join(', ');

      pushRow(s.presentationBatchId, s.meetingTitle, s.dateDistributed, detail);
      continue;
    }

    if (s.source === 'calendar-meeting' && s.meetingTitle) {
      const key = `${s.meetingTitle}|${s.dateDistributed}`;
      const piece =
        s.rawPresentationText?.trim() ||
        (s.itemName ? `${s.itemName}${s.quantity != null ? `: ${s.quantity}` : ''}` : '');
      if (!piece) continue;
      const existing = legacyGrouped.get(key);
      if (existing) {
        existing.pieces.push(piece);
      } else {
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
    pushRow(g.id, g.meeting, g.date, g.pieces.join(', '));
  });

  return rows.sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));
}

export function souvenirLogSheetRows(souvenirs) {
  const entries = normalizeSouvenirLogEntries(souvenirs);
  const header = ['Sr#', 'Meeting Title', 'Souvenirs', 'Date'];
  const body = entries.map((row, i) => [
    i + 1,
    row.meeting,
    row.detail,
    row.date,
  ]);
  return [header, ...body];
}
