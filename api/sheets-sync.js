import { google } from 'googleapis';
import { applySheetPresentation, PRESENTATION_VERSION } from './_lib/sheetsPresentation.js';

const SHEETS_FORMAT_VERSION = 'append-v2-presentation';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) return null;
  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetValues(sheets, spreadsheetId, tab) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!A:ZZ`,
    });
    return res.data.values || [];
  } catch {
    return [];
  }
}

function headerMatches(row1, header) {
  return header.every((h, i) => String(row1[i] || '').trim() === String(h).trim());
}

function isLegacySrHeader(row1) {
  return String(row1[0] || '').trim() === 'Sr#';
}

async function clearTabDataFromRow(sheets, spreadsheetId, tab, startRow) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tab}!A${startRow}:ZZ`,
  });
}

async function migrateLegacyTab(sheets, spreadsheetId, tab, header, dataRows, idColIndex = 0) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [header] },
  });
  await clearTabDataFromRow(sheets, spreadsheetId, tab, 2);
  const rows = (dataRows || []).filter((row) => String(row[idColIndex] || '').trim());
  if (rows.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    });
  }
  return { appended: rows.length, updated: 0, migrated: true };
}

async function ensureHeader(sheets, spreadsheetId, tab, header) {
  const values = await getSheetValues(sheets, spreadsheetId, tab);
  if (values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
    return;
  }
  const row1 = values[0] || [];
  if (!headerMatches(row1, header)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
  }
}

function buildIdRowMap(values, idColIndex, startRow = 2) {
  const map = {};
  for (let i = startRow - 1; i < values.length; i++) {
    const id = String(values[i]?.[idColIndex] || '').trim();
    if (id) map[id] = i + 1;
  }
  return map;
}

async function syncAppendUpsert(sheets, spreadsheetId, tab, header, dataRows, idColIndex = 0) {
  const existing = await getSheetValues(sheets, spreadsheetId, tab);
  if (existing.length > 0) {
    const row1 = existing[0] || [];
    if (isLegacySrHeader(row1) || !headerMatches(row1, header)) {
      return migrateLegacyTab(sheets, spreadsheetId, tab, header, dataRows, idColIndex);
    }
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
  }
  await ensureHeader(sheets, spreadsheetId, tab, header);
  const values = await getSheetValues(sheets, spreadsheetId, tab);
  const idToRow = buildIdRowMap(values, idColIndex);

  const toAppend = [];
  const updates = [];

  for (const row of dataRows || []) {
    const id = String(row[idColIndex] || '').trim();
    if (!id) continue;
    const normalized = [...row];
    while (normalized.length < header.length) normalized.push('');
    if (idToRow[id]) {
      updates.push({ row: idToRow[id], values: normalized });
    } else {
      toAppend.push(normalized);
    }
  }

  for (const u of updates) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A${u.row}`,
      valueInputOption: 'RAW',
      requestBody: { values: [u.values] },
    });
  }

  if (toAppend.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: toAppend },
    });
  }

  return { appended: toAppend.length, updated: updates.length };
}

function buildSouvenirDataRows(souvenirs) {
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

  return rows.map((r) => [r.id, r.meeting, r.detail, r.date]);
}

function orderStatusLabel(o) {
  if (o.status === 'received') return 'Received';
  if (o.status === 'cancelled') return 'Cancelled';
  return 'Pending';
}

function taskStatusLabel(t) {
  if (t.status === 'done') return 'Done';
  if (t.status === 'cancelled') return 'Cancelled';
  return 'Pending';
}

const EXPENDITURE_HEADER_ROW = 6;

function expenditureBalanceTotals(expenditure) {
  const opening = Number(expenditure?.openingBalance) || 0;
  const from = String(expenditure?.openingBalanceDate ?? '').trim();
  const items = expenditure?.expenditures || [];
  const total = items.reduce((sum, x) => {
    if (from && x.date && String(x.date) < from) return sum;
    return sum + (Number(x.amount) || 0);
  }, 0);
  return { opening, from, total, closing: opening - total };
}

async function migrateLegacyExpenditure(sheets, spreadsheetId, expenditure) {
  const tab = 'Expenditure';
  const { opening, from, total, closing } = expenditureBalanceTotals(expenditure);
  const header = ['Record ID', 'Date', 'Description', 'Amount (PKR)', 'Category'];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1:B4`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['Opening Balance (PKR)', opening],
        ['Effective from', from || '—'],
        ['Total Spent (PKR)', total],
        ['Closing Balance (PKR)', closing],
      ],
    },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A${EXPENDITURE_HEADER_ROW}`,
    valueInputOption: 'RAW',
    requestBody: { values: [header] },
  });
  await clearTabDataFromRow(sheets, spreadsheetId, tab, EXPENDITURE_HEADER_ROW + 1);

  const items = expenditure?.expenditures || [];
  const rows = items
    .filter((x) => String(x.id || '').trim())
    .map((x) => [x.id || '', x.date || '', x.description || '', Number(x.amount) || 0, x.category || 'Other']);
  if (rows.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    });
  }
  return { appended: rows.length, updated: 0, migrated: true };
}

async function syncExpenditureAppend(sheets, spreadsheetId, expenditure) {
  const tab = 'Expenditure';
  const { opening, from, total, closing } = expenditureBalanceTotals(expenditure);
  const items = expenditure?.expenditures || [];

  const values = await getSheetValues(sheets, spreadsheetId, tab);
  const legacyHeader =
    values.length >= EXPENDITURE_HEADER_ROW &&
    String(values[EXPENDITURE_HEADER_ROW - 1]?.[0] || '').trim() === 'Date';
  if (legacyHeader) {
    return migrateLegacyExpenditure(sheets, spreadsheetId, expenditure);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1:B4`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['Opening Balance (PKR)', opening],
        ['Effective from', from || '—'],
        ['Total Spent (PKR)', total],
        ['Closing Balance (PKR)', closing],
      ],
    },
  });

  const header = ['Record ID', 'Date', 'Description', 'Amount (PKR)', 'Category'];
  if (values.length < EXPENDITURE_HEADER_ROW) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A${EXPENDITURE_HEADER_ROW}`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
  } else if (!headerMatches(values[EXPENDITURE_HEADER_ROW - 1] || [], header)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A${EXPENDITURE_HEADER_ROW}`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
  }

  const fresh = await getSheetValues(sheets, spreadsheetId, tab);
  const idToRow = buildIdRowMap(fresh, 0, EXPENDITURE_HEADER_ROW + 1);

  const toAppend = [];
  const updates = [];

  for (const x of items) {
    const row = [x.id || '', x.date || '', x.description || '', Number(x.amount) || 0, x.category || 'Other'];
    const id = String(row[0]).trim();
    if (!id) continue;
    if (idToRow[id]) {
      updates.push({ row: idToRow[id], values: row });
    } else {
      toAppend.push(row);
    }
  }

  for (const u of updates) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A${u.row}`,
      valueInputOption: 'RAW',
      requestBody: { values: [u.values] },
    });
  }

  if (toAppend.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: toAppend },
    });
  }

  return { appended: toAppend.length, updated: updates.length };
}

async function appendMetaLog(sheets, spreadsheetId, syncedAt, stats) {
  const tab = 'Meta';
  const header = [
    'Sync Time',
    'Format',
    'Meetings',
    'Orders',
    'Dak',
    'Tasks',
    'Souvenirs',
    'Expenditures',
    'Rows Appended',
    'Rows Updated',
  ];
  const values = await getSheetValues(sheets, spreadsheetId, tab);
  if (values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [
        [
          syncedAt,
          SHEETS_FORMAT_VERSION,
          stats.meetings,
          stats.orders,
          stats.dak,
          stats.tasks,
          stats.souvenirs,
          stats.expenditures,
          stats.appended,
          stats.updated,
        ],
      ],
    },
  });
}

async function ensureSheetTabs(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set((meta.data.sheets || []).map((s) => s.properties.title));
  const needed = [
    'Meetings',
    'Souvenirs',
    'Expenditure',
    'Orders',
    'Dak Issuance',
    'Tasks',
    'Contacts',
    'Meta',
    'Meetings Report',
    'Souvenirs Report',
    'Expenditure Report',
    'Orders Report',
    'Dak Report',
    'Tasks Report',
    'Contacts Report',
  ];
  const requests = needed
    .filter((title) => !existing.has(title))
    .map((title) => ({ addSheet: { properties: { title } } }));
  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const auth = getAuth();
  if (!auth || !spreadsheetId) {
    return res.status(503).json({
      error: 'Google Sheets API not configured on server',
    });
  }

  try {
    const body = req.body?.data ? req.body : { data: req.body };
    const {
      meetings = [],
      souvenirs = [],
      expenditure = {},
      orders = [],
      dak = [],
      tasks = [],
      contacts = [],
    } = body.data || {};
    const syncedAt = body.syncedAt || new Date().toISOString();

    const sheets = google.sheets({ version: 'v4', auth });
    await ensureSheetTabs(sheets, spreadsheetId);

    let totalAppended = 0;
    let totalUpdated = 0;

    const meetingHeader = [
      'Record ID',
      'Date',
      'Time',
      'Title',
      'Location',
      'Agenda',
      'Attendees',
      'Status',
      'Calendar',
    ];
    const meetingDataRows = meetings.map((m) => [
      m.id || '',
      m.date || '',
      m.time || '',
      m.title || '',
      m.location || '',
      m.agenda || '',
      (m.attendees || []).join(', '),
      m.status || '',
      m.scheduledViaCalendar ? 'Yes' : 'No',
    ]);
    const mStats = await syncAppendUpsert(
      sheets,
      spreadsheetId,
      'Meetings',
      meetingHeader,
      meetingDataRows,
    );
    totalAppended += mStats.appended;
    totalUpdated += mStats.updated;

    const souvenirHeader = ['Record ID', 'Meeting Title', 'Souvenirs', 'Date'];
    const sStats = await syncAppendUpsert(
      sheets,
      spreadsheetId,
      'Souvenirs',
      souvenirHeader,
      buildSouvenirDataRows(souvenirs),
    );
    totalAppended += sStats.appended;
    totalUpdated += sStats.updated;

    const eStats = await syncExpenditureAppend(sheets, spreadsheetId, expenditure);
    totalAppended += eStats.appended;
    totalUpdated += eStats.updated;

    const orderHeader = [
      'Record ID',
      'Order#',
      'Item',
      'Qty',
      'Vendor',
      'Placed Date',
      'Status',
    ];
    const orderDataRows = orders.map((o) => [
      o.id || '',
      o.orderNumber || '',
      o.item || '',
      o.quantity ?? '',
      o.vendor || '',
      o.placedDate || '',
      orderStatusLabel(o),
    ]);
    const oStats = await syncAppendUpsert(
      sheets,
      spreadsheetId,
      'Orders',
      orderHeader,
      orderDataRows,
    );
    totalAppended += oStats.appended;
    totalUpdated += oStats.updated;

    const dakHeader = [
      'Record ID',
      'System Dispatch No.',
      'Date (Dispatched)',
      'Addressee',
      'Subject',
      'Date Received',
      'Official Outward No.',
      'Status',
    ];
    const dakDataRows = dak.map((d) => [
      d.id || '',
      d.fileId || '',
      d.forwardedDate || '',
      d.designation || '',
      d.subject || '',
      d.receivedDate || '',
      d.externalDispatchNo || '',
      d.status === 'cancelled' ? 'Cancelled' : 'Active',
    ]);
    const dStats = await syncAppendUpsert(
      sheets,
      spreadsheetId,
      'Dak Issuance',
      dakHeader,
      dakDataRows,
    );
    totalAppended += dStats.appended;
    totalUpdated += dStats.updated;

    const taskHeader = ['Record ID', 'Task', 'Date', 'Time', 'Status'];
    const taskDataRows = tasks.map((t) => [
      t.id || '',
      t.title || '',
      t.date || '',
      t.time || '',
      taskStatusLabel(t),
    ]);
    const tStats = await syncAppendUpsert(
      sheets,
      spreadsheetId,
      'Tasks',
      taskHeader,
      taskDataRows,
    );
    totalAppended += tStats.appended;
    totalUpdated += tStats.updated;

    const contactHeader = [
      'Record ID',
      'Name',
      'Phone',
      'Email',
      'Designation',
      'Contact No',
      'Address',
    ];
    const contactDataRows = contacts.map((c) => [
      c.id || '',
      c.name || '',
      c.phone || '',
      c.email || '',
      c.designation || '',
      c.contactNo || '',
      c.address || '',
    ]);
    const cStats = await syncAppendUpsert(
      sheets,
      spreadsheetId,
      'Contacts',
      contactHeader,
      contactDataRows,
    );
    totalAppended += cStats.appended;
    totalUpdated += cStats.updated;

    const items = expenditure.expenditures || [];
    await appendMetaLog(sheets, spreadsheetId, syncedAt, {
      meetings: meetings.length,
      orders: orders.length,
      dak: dak.filter((d) => d.status !== 'cancelled').length,
      tasks: tasks.filter((t) => t.status !== 'cancelled').length,
      contacts: contacts.filter((c) => c.status !== 'archived').length,
      souvenirs: souvenirs.length,
      expenditures: items.length,
      appended: totalAppended,
      updated: totalUpdated,
    });

    const presentation = await applySheetPresentation(sheets, spreadsheetId);

    return res.status(200).json({
      ok: true,
      format: SHEETS_FORMAT_VERSION,
      presentation: presentation.presentationVersion || PRESENTATION_VERSION,
      mode: 'appendRow',
      appended: totalAppended,
      updated: totalUpdated,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Sync failed' });
  }
}
