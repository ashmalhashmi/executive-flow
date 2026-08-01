import { google } from 'googleapis';
import { applySheetPresentation, PRESENTATION_VERSION } from './_lib/sheetsPresentation.js';
import {
  SHEETS_FORMAT_VERSION,
  EXPENDITURE_HEADER_ROW,
  buildSouvenirDataRows,
  contactSheetRow,
  dedupeRowsById,
  expenditureBalanceTotals,
  orderStatusLabel,
  snapshotHasAnyDomainData,
  taskStatusLabel,
} from './_lib/sheetsMirror.js';

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

async function clearTabDataFromRow(sheets, spreadsheetId, tab, startRow) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tab}!A${startRow}:ZZ`,
  });
}

/** One correct copy: header + exact data rows (deduped). No leftover append ghosts. */
async function syncReplaceTab(sheets, spreadsheetId, tab, header, dataRows, idColIndex = 0) {
  const rows = dedupeRowsById(dataRows, idColIndex).map((row) => {
    const normalized = [...row];
    while (normalized.length < header.length) normalized.push('');
    return normalized.slice(0, header.length);
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [header] },
  });
  await clearTabDataFromRow(sheets, spreadsheetId, tab, 2);

  if (rows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  }

  return { replaced: rows.length };
}

async function syncReplaceExpenditure(sheets, spreadsheetId, expenditure) {
  const tab = 'Expenditure';
  const { opening, from, total, closing } = expenditureBalanceTotals(expenditure);
  const header = ['Record ID', 'Date', 'Description', 'Amount (PKR)', 'Category'];
  const items = expenditure?.expenditures || [];
  const rows = dedupeRowsById(
    items
      .filter((x) => String(x.id || '').trim())
      .map((x) => [
        x.id || '',
        x.date || '',
        x.description || '',
        Number(x.amount) || 0,
        x.category || 'Other',
      ]),
    0,
  );

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

  if (rows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A${EXPENDITURE_HEADER_ROW + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  }

  return { replaced: rows.length };
}

/** Meta = last sync status only (not a growing pile of sync copies). */
async function writeMetaStatus(sheets, spreadsheetId, syncedAt, stats) {
  const tab = 'Meta';
  const header = [
    'Last Sync Time',
    'Format',
    'Mode',
    'Meetings',
    'Orders',
    'Dak',
    'Tasks',
    'Souvenirs',
    'Expenditures',
    'Contacts',
    'Rows Mirrored',
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [header] },
  });
  await clearTabDataFromRow(sheets, spreadsheetId, tab, 2);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A2`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        [
          syncedAt,
          SHEETS_FORMAT_VERSION,
          'mirror',
          stats.meetings,
          stats.orders,
          stats.dak,
          stats.tasks,
          stats.souvenirs,
          stats.expenditures,
          stats.contacts,
          stats.replaced,
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

async function sheetLooksPopulated(sheets, spreadsheetId) {
  const tabs = ['Meetings', 'Orders', 'Tasks', 'Souvenirs', 'Contacts', 'Dak Issuance'];
  for (const tab of tabs) {
    const values = await getSheetValues(sheets, spreadsheetId, tab);
    if (values.length > 1) return true;
  }
  const exp = await getSheetValues(sheets, spreadsheetId, 'Expenditure');
  if (exp.length > EXPENDITURE_HEADER_ROW) return true;
  return false;
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

    const domainPayload = {
      meetings,
      souvenirs,
      expenditure,
      orders,
      dak,
      tasks,
      contacts,
    };

    const sheets = google.sheets({ version: 'v4', auth });
    await ensureSheetTabs(sheets, spreadsheetId);

    if (!snapshotHasAnyDomainData(domainPayload) && (await sheetLooksPopulated(sheets, spreadsheetId))) {
      return res.status(409).json({
        ok: false,
        error:
          'Empty app snapshot blocked — sheet already has data. Open a device with records before mirroring.',
        mode: 'mirror',
      });
    }

    let totalReplaced = 0;

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
    totalReplaced += (
      await syncReplaceTab(sheets, spreadsheetId, 'Meetings', meetingHeader, meetingDataRows)
    ).replaced;

    const souvenirHeader = ['Record ID', 'Meeting Title', 'Souvenirs', 'Date'];
    totalReplaced += (
      await syncReplaceTab(
        sheets,
        spreadsheetId,
        'Souvenirs',
        souvenirHeader,
        buildSouvenirDataRows(souvenirs),
      )
    ).replaced;

    totalReplaced += (await syncReplaceExpenditure(sheets, spreadsheetId, expenditure)).replaced;

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
    totalReplaced += (
      await syncReplaceTab(sheets, spreadsheetId, 'Orders', orderHeader, orderDataRows)
    ).replaced;

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
    totalReplaced += (
      await syncReplaceTab(sheets, spreadsheetId, 'Dak Issuance', dakHeader, dakDataRows)
    ).replaced;

    const taskHeader = ['Record ID', 'Task', 'Date', 'Time', 'Status'];
    const taskDataRows = tasks.map((t) => [
      t.id || '',
      t.title || '',
      t.date || '',
      t.time || '',
      taskStatusLabel(t),
    ]);
    totalReplaced += (
      await syncReplaceTab(sheets, spreadsheetId, 'Tasks', taskHeader, taskDataRows)
    ).replaced;

    const contactHeader = [
      'Record ID',
      'Name',
      'Phone',
      'Email',
      'Designation',
      'Contact No',
      'Address',
    ];
    const contactDataRows = contacts.map(contactSheetRow);
    totalReplaced += (
      await syncReplaceTab(sheets, spreadsheetId, 'Contacts', contactHeader, contactDataRows)
    ).replaced;

    const items = expenditure.expenditures || [];
    await writeMetaStatus(sheets, spreadsheetId, syncedAt, {
      meetings: meetings.length,
      orders: orders.length,
      dak: dak.filter((d) => d.status !== 'cancelled').length,
      tasks: tasks.filter((t) => t.status !== 'cancelled').length,
      contacts: contacts.filter((c) => c.status !== 'archived').length,
      souvenirs: souvenirs.length,
      expenditures: items.length,
      replaced: totalReplaced,
    });

    const presentation = await applySheetPresentation(sheets, spreadsheetId);

    return res.status(200).json({
      ok: true,
      format: SHEETS_FORMAT_VERSION,
      presentation: presentation.presentationVersion || PRESENTATION_VERSION,
      mode: 'mirror',
      replaced: totalReplaced,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Sync failed' });
  }
}
