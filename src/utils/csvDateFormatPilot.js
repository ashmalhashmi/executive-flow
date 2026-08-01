import {
  formatDisplayDate,
  looksLikeDmyCell,
  normalizeSheetDateIso,
  parseDateAsDmy,
  parseDateAsMdy,
} from './dates';

function normTitle(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Pilot: sheet DD-MM-YYYY vs app calendar — har row par raw, expected (DMY), app stored.
 */
export function pilotDateFormatAudit(rows, columnMap, appMeetings) {
  const dateCol = columnMap.date;
  const meetingCol = columnMap.meeting;
  if (dateCol === '' || meetingCol === '') return null;

  const calendarMeetings = (appMeetings || []).filter(
    (m) => m.scheduledViaCalendar !== false && m.status !== 'Completed',
  );

  const appByTitle = new Map();
  calendarMeetings.forEach((m) => {
    const t = normTitle(m.title);
    if (!appByTitle.has(t)) appByTitle.set(t, []);
    appByTitle.get(t).push({
      title: m.title,
      date: normalizeSheetDateIso(m.date),
      calendarLabel: formatDisplayDate(normalizeSheetDateIso(m.date)),
    });
  });

  let dmyPatternRows = 0;
  let ambiguousRows = 0;
  let dateShiftRows = 0;
  let okRows = 0;
  let missingInAppRows = 0;
  const samples = [];
  const shiftedSamples = [];
  const ambiguousSamples = [];

  rows.forEach((row) => {
    const rawDate = String(row[dateCol] ?? '').trim();
    const title = String(row[meetingCol] ?? '').trim();
    if (!rawDate || !title) return;

    const isDmy = looksLikeDmyCell(rawDate);
    if (isDmy) dmyPatternRows += 1;

    const expectedDmy = parseDateAsDmy(rawDate) || normalizeSheetDateIso(rawDate);
    const wrongMdy = parseDateAsMdy(rawDate);
    const appParsed = normalizeSheetDateIso(rawDate);

    if (isDmy && wrongMdy && expectedDmy !== wrongMdy) {
      ambiguousRows += 1;
      if (ambiguousSamples.length < 8) {
        ambiguousSamples.push({
          rawDate,
          title,
          asDmy: expectedDmy,
          asMdy: wrongMdy,
          note: '06/03/2026 → DMY = 6 Mar, MDY = 3 Jun',
        });
      }
    }

    const apps = appByTitle.get(normTitle(title)) || [];
    const appMatch = apps.find((a) => a.date === expectedDmy);
    const appWrongDate = apps.find((a) => a.date !== expectedDmy);
    const calendarLabel = expectedDmy ? formatDisplayDate(expectedDmy) : '—';

    let status = 'OK';
    if (!expectedDmy) {
      status = 'INVALID';
    } else if (appMatch) {
      okRows += 1;
      status = 'OK';
    } else if (appWrongDate) {
      dateShiftRows += 1;
      status = 'DATE_SHIFTED';
      if (shiftedSamples.length < 25) {
        shiftedSamples.push({
          rawDate,
          title,
          sheetMeansDmy: expectedDmy,
          sheetLabel: calendarLabel,
          appHasDate: appWrongDate.date,
          appCalendarLabel: appWrongDate.calendarLabel,
          ifParsedAsMdy: wrongMdy || '—',
        });
      }
    } else {
      missingInAppRows += 1;
      status = 'NOT_IN_APP';
    }

    if (samples.length < 12 && (isDmy || status !== 'OK')) {
      samples.push({
        rawDate,
        title: title.slice(0, 40),
        expectedDmy,
        sheetLabel: calendarLabel,
        appDate: appMatch?.date || appWrongDate?.date || '—',
        appLabel: appMatch?.calendarLabel || appWrongDate?.calendarLabel || '—',
        status,
      });
    }
  });

  const totalChecked = okRows + dateShiftRows + missingInAppRows;

  return {
    sheetFormatAssumed: 'DD-MM-YYYY (day pehle, month doosra)',
    dmyPatternRows,
    totalChecked,
    okRows,
    dateShiftRows,
    missingInAppRows,
    ambiguousRows,
    allDatesAlign: dateShiftRows === 0 && ambiguousRows === 0 && dmyPatternRows > 0,
    ambiguousSamples,
    shiftedSamples,
    samples,
  };
}
