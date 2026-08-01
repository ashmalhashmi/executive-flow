import {
  normalizeMeetingForCalendar,
  normalizeSheetDateIso,
  normalizeSheetTime24,
} from './dates';

/** Simple CSV parser (handles quoted fields) */
export function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const rows = lines.map(parseCsvLine);
  const headers = (rows[0] || []).map((h) => String(h).trim());
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim()));

  return { headers, rows: dataRows };
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export function guessColumnMap(headers) {
  const lower = headers.map((h) => String(h).trim().toLowerCase());

  const dateIdx = lower.findIndex(
    (h) => h === 'date' || h.includes('date') || h === 'day',
  );
  const meetingIdx = lower.findIndex(
    (h) =>
      h === 'meeting' ||
      h.includes('meeting') ||
      h === 'title' ||
      h === 'visit' ||
      h === 'subject' ||
      h === 'name',
  );
  const timeIdx = lower.findIndex((h) => h === 'time' || h.includes('time'));
  const venueIdx = lower.findIndex(
    (h) => h === 'venue' || h === 'location' || h.includes('place'),
  );
  const notesIdx = lower.findIndex(
    (h) => h === 'remarks' || h === 'notes' || h === 'agenda' || h === 'detail',
  );

  return {
    date: dateIdx >= 0 ? dateIdx : '',
    meeting: meetingIdx >= 0 ? meetingIdx : '',
    time: timeIdx >= 0 ? timeIdx : '',
    venue: venueIdx >= 0 ? venueIdx : '',
    notes: notesIdx >= 0 ? notesIdx : '',
  };
}

export function rowsToMeetings(rows, columnMap) {
  const dateCol = columnMap.date;
  const meetingCol = columnMap.meeting;
  if (dateCol === '' || meetingCol === '') return [];

  const meetings = [];

  rows.forEach((row, i) => {
    const title = String(row[meetingCol] ?? '').trim();
    const date = normalizeSheetDateIso(row[dateCol]);
    if (!title || !date) return;

    meetings.push(
      normalizeMeetingForCalendar({
        id: `mtg-csv-${Date.now()}-${i}`,
        title,
        date,
        time:
          columnMap.time !== ''
            ? normalizeSheetTime24(row[columnMap.time])
            : '09:00',
        location: columnMap.venue !== '' ? String(row[columnMap.venue] ?? '').trim() : '',
        agenda: columnMap.notes !== '' ? String(row[columnMap.notes] ?? '').trim() : '',
        attendees: [],
        status: 'Scheduled',
        scheduledViaCalendar: true,
      }),
    );
  });

  return meetings;
}

export async function readCsvFile(file) {
  const text = await file.text();
  return parseCsvText(text);
}
