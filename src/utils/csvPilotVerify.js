import { normalizeSheetDateIso } from './dates';
import { rowsToMeetings } from './csvImport';

function normTitle(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function rowKey(date, title) {
  return `${date}|${normTitle(title)}`;
}

/** Build expected rows from CSV using same rules as import */
export function csvRowsToExpected(rows, columnMap) {
  const meetings = rowsToMeetings(rows, columnMap);
  return meetings.map((m) => ({
    date: m.date,
    title: m.title,
    key: rowKey(m.date, m.title),
  }));
}

/**
 * Compare CSV (same file + column map) with meetings currently in the app calendar.
 * Uses date + title matching (same logic as import normalization).
 */
export function pilotVerifyCsvVsApp(rows, columnMap, appMeetings) {
  const expected = csvRowsToExpected(rows, columnMap);
  const calendarMeetings = (appMeetings || []).filter(
    (m) => m.scheduledViaCalendar !== false && m.status !== 'Completed',
  );

  const appRows = calendarMeetings.map((m) => ({
    id: m.id,
    date: normalizeSheetDateIso(m.date),
    title: m.title,
    key: rowKey(normalizeSheetDateIso(m.date), m.title),
  }));

  const expectedByKey = new Map();
  expected.forEach((e) => {
    if (!expectedByKey.has(e.key)) expectedByKey.set(e.key, e);
  });

  const appByKey = new Map();
  appRows.forEach((a) => {
    if (!appByKey.has(a.key)) appByKey.set(a.key, a);
  });

  const matched = [];
  const onlyInCsv = [];
  const onlyInApp = [];

  expected.forEach((e) => {
    if (appByKey.has(e.key)) matched.push({ csv: e, app: appByKey.get(e.key) });
    else onlyInCsv.push(e);
  });

  appRows.forEach((a) => {
    if (!expectedByKey.has(a.key)) onlyInApp.push(a);
  });

  const csvDates = new Set(expected.map((e) => e.date).filter(Boolean));
  const appDates = new Set(appRows.map((a) => a.date).filter(Boolean));
  const datesOnlyCsv = [...csvDates].filter((d) => !appDates.has(d)).sort();
  const datesOnlyApp = [...appDates].filter((d) => !csvDates.has(d)).sort();
  const datesShared = [...csvDates].filter((d) => appDates.has(d)).sort();

  const titleDateMismatches = [];
  const csvByTitle = new Map();
  expected.forEach((e) => {
    const t = normTitle(e.title);
    if (!csvByTitle.has(t)) csvByTitle.set(t, []);
    csvByTitle.get(t).push(e);
  });
  appRows.forEach((a) => {
    const t = normTitle(a.title);
    const csvList = csvByTitle.get(t);
    if (!csvList?.length) return;
    const csvDatesForTitle = new Set(csvList.map((c) => c.date));
    if (!csvDatesForTitle.has(a.date)) {
      titleDateMismatches.push({
        title: a.title,
        appDate: a.date,
        csvDates: [...csvDatesForTitle].sort(),
      });
    }
  });

  const skippedCsvRows = rows.length - expected.length;

  return {
    csvRowCount: rows.length,
    csvValidCount: expected.length,
    skippedCsvRows,
    appCalendarCount: appRows.length,
    matchedCount: matched.length,
    onlyInCsvCount: onlyInCsv.length,
    onlyInAppCount: onlyInApp.length,
    datesSharedCount: datesShared.length,
    datesOnlyCsv,
    datesOnlyApp,
    onlyInCsv: onlyInCsv.slice(0, 20),
    onlyInApp: onlyInApp.slice(0, 20),
    titleDateMismatches: titleDateMismatches.slice(0, 15),
    allMatched:
      onlyInCsv.length === 0 &&
      onlyInApp.length === 0 &&
      titleDateMismatches.length === 0 &&
      expected.length > 0,
  };
}
