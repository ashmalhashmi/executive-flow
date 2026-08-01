import {
  getReportTabDefs,
  HEADER_STYLE,
  NAMED_RANGE_DEFS,
  PRESENTATION_VERSION,
  RAW_DATA_TABS,
  RAW_STATUS_COLUMNS,
  REPORT_SUBTITLE_STYLE,
  REPORT_TAB_NAMES,
  REPORT_TITLE_STYLE,
  STATUS_COLORS,
} from './sheetsPresentationConfig.js';

const STATUS_TEXT_RULES = [
  { text: 'Cancelled', color: STATUS_COLORS.cancelled },
  { text: 'Pending', color: STATUS_COLORS.pending },
  { text: 'Active', color: STATUS_COLORS.active },
  { text: 'Done', color: STATUS_COLORS.done },
  { text: 'Received', color: STATUS_COLORS.received },
];

function colIndexToA1(index) {
  let n = index;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function getSheetIdMap(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const map = {};
  for (const sheet of meta.data.sheets || []) {
    map[sheet.properties.title] = sheet.properties.sheetId;
  }
  return { map, meta };
}

async function ensureTabs(sheets, spreadsheetId, tabNames, sheetIdMap) {
  const requests = tabNames
    .filter((name) => sheetIdMap[name] == null)
    .map((title) => ({ addSheet: { properties: { title } } }));

  if (!requests.length) return sheetIdMap;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  const { map } = await getSheetIdMap(sheets, spreadsheetId);
  return map;
}

function repeatCellRequest(sheetId, startRow, endRow, startCol, endCol, style, fields) {
  return {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: startRow,
        endRowIndex: endRow,
        startColumnIndex: startCol,
        endColumnIndex: endCol,
      },
      cell: { userEnteredFormat: style },
      fields,
    },
  };
}

function formatFieldsFromStyle(style) {
  const parts = [];
  if (style.backgroundColor) parts.push('backgroundColor');
  if (style.textFormat) parts.push('textFormat');
  if (style.horizontalAlignment) parts.push('horizontalAlignment');
  if (style.verticalAlignment) parts.push('verticalAlignment');
  return `userEnteredFormat(${parts.join(',')})`;
}

function buildStatusRules(sheetId, startColIndex, endColIndex, startRowIndex = 1, endRowIndex = 5000) {
  const range = {
    sheetId,
    startRowIndex,
    endRowIndex,
    startColumnIndex: startColIndex,
    endColumnIndex: endColIndex,
  };

  return STATUS_TEXT_RULES.map((rule) => ({
    ranges: [range],
    booleanRule: {
      condition: {
        type: 'TEXT_EQ',
        values: [{ userEnteredValue: rule.text }],
      },
      format: { backgroundColor: rule.color },
    },
  }));
}

function buildHighAmountRule(sheetId, amountColIndex, startRowIndex, endRowIndex = 5000) {
  return {
    ranges: [
      {
        sheetId,
        startRowIndex,
        endRowIndex,
        startColumnIndex: amountColIndex,
        endColumnIndex: amountColIndex + 1,
      },
    ],
    booleanRule: {
      condition: {
        type: 'NUMBER_GREATER',
        values: [{ userEnteredValue: '50000' }],
      },
      format: {
        backgroundColor: STATUS_COLORS.highAmount,
        textFormat: { bold: true },
      },
    },
  };
}

async function clearNamedRanges(sheets, spreadsheetId, meta) {
  const existing = meta.data.namedRanges || [];
  const efRanges = existing.filter((r) => String(r.name || '').startsWith('EF_'));
  if (!efRanges.length) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: efRanges.map((r) => ({ deleteNamedRange: { namedRangeId: r.namedRangeId } })),
    },
  });
}

async function applyNamedRanges(sheets, spreadsheetId, sheetIdMap) {
  const requests = NAMED_RANGE_DEFS.map((def) => {
    const match = def.range.match(/^([^!]+)!([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) return null;
    const tab = match[1];
    const sheetId = sheetIdMap[tab];
    if (sheetId == null) return null;

    const startCol = match[2];
    const startRow = Number(match[3]);
    const endCol = match[4];
    const endRow = Number(match[5]);

    const colToIndex = (col) => {
      let n = 0;
      for (let i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64);
      return n - 1;
    };

    return {
      addNamedRange: {
        namedRange: {
          name: def.name,
          range: {
            sheetId,
            startRowIndex: startRow - 1,
            endRowIndex: endRow,
            startColumnIndex: colToIndex(startCol),
            endColumnIndex: colToIndex(endCol) + 1,
          },
        },
      },
    };
  }).filter(Boolean);

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

function rawHeaderRequests(sheetId, tabName) {
  const requests = [];
  const colCounts = {
    Meetings: 9,
    Souvenirs: 4,
    Orders: 7,
    'Dak Issuance': 8,
    Tasks: 5,
    Contacts: 7,
  };

  if (tabName === 'Expenditure') {
    requests.push(
      repeatCellRequest(
        sheetId,
        5,
        6,
        0,
        5,
        HEADER_STYLE,
        formatFieldsFromStyle(HEADER_STYLE),
      ),
      {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 6 } },
          fields: 'gridProperties.frozenRowCount',
        },
      },
    );
    return requests;
  }

  if (tabName === 'Meta') {
    requests.push({
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    });
    return requests;
  }

  const cols = colCounts[tabName];
  if (!cols) return requests;

  requests.push(
    repeatCellRequest(sheetId, 0, 1, 0, cols, HEADER_STYLE, formatFieldsFromStyle(HEADER_STYLE)),
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
  );

  return requests;
}

async function applyRawTabPresentation(sheets, spreadsheetId, sheetIdMap) {
  const requests = [];
  const conditionalBySheet = {};

  for (const tabName of RAW_DATA_TABS) {
    const sheetId = sheetIdMap[tabName];
    if (sheetId == null) continue;
    requests.push(...rawHeaderRequests(sheetId, tabName));

    const statusCol = RAW_STATUS_COLUMNS[tabName];
    if (statusCol) {
      conditionalBySheet[sheetId] = buildStatusRules(sheetId, statusCol - 1, statusCol);
    }
  }

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  for (const [sheetId, rules] of Object.entries(conditionalBySheet)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ setConditionalFormatRules: { sheetId: Number(sheetId), rules } }],
      },
    });
  }
}

async function writeReportTab(sheets, spreadsheetId, sheetId, def) {
  const values = [[def.title], [def.subtitle], ['']];
  const formulaRow = def.formulaRow || 4;

  if (def.summaryRows) {
    const start = def.summaryStartRow || 4;
    while (values.length < start - 1) values.push(['']);
    values.push(...def.summaryRows);
    while (values.length < formulaRow - 1) values.push(['']);
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${def.name}'!A1:Z500`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${def.name}'!A1:B${values.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${def.name}'!A${formulaRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[def.formula]] },
  });

  const mergeCols = def.mergeTitleCols || 6;
  const requests = [
    {
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: mergeCols,
        },
        mergeType: 'MERGE_ALL',
      },
    },
    {
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: mergeCols,
        },
        mergeType: 'MERGE_ALL',
      },
    },
    repeatCellRequest(
      sheetId,
      0,
      1,
      0,
      mergeCols,
      REPORT_TITLE_STYLE,
      formatFieldsFromStyle(REPORT_TITLE_STYLE),
    ),
    repeatCellRequest(
      sheetId,
      1,
      2,
      0,
      mergeCols,
      REPORT_SUBTITLE_STYLE,
      formatFieldsFromStyle(REPORT_SUBTITLE_STYLE),
    ),
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: formulaRow } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
  ];

  const rules = [];
  if (def.statusCol) {
    rules.push(
      ...buildStatusRules(
        sheetId,
        def.statusCol - 1,
        def.statusCol,
        formulaRow,
        5000,
      ),
    );
  }
  if (def.amountCol) {
    rules.push(
      buildHighAmountRule(sheetId, def.amountCol - 1, formulaRow, 5000),
    );
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  if (rules.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ setConditionalFormatRules: { sheetId, rules } }],
      },
    });
  }
}

async function applyReportTabs(sheets, spreadsheetId, sheetIdMap) {
  const defs = getReportTabDefs();
  for (const def of defs) {
    const sheetId = sheetIdMap[def.name];
    if (sheetId == null) continue;
    await writeReportTab(sheets, spreadsheetId, sheetId, def);
  }
}

/**
 * Makes the spreadsheet print-ready: QUERY report tabs, conditional formatting, named ranges.
 */
export async function applySheetPresentation(sheets, spreadsheetId) {
  let { map: sheetIdMap, meta } = await getSheetIdMap(sheets, spreadsheetId);

  const allTabs = [...RAW_DATA_TABS, ...REPORT_TAB_NAMES];
  sheetIdMap = await ensureTabs(sheets, spreadsheetId, allTabs, sheetIdMap);

  await applyRawTabPresentation(sheets, spreadsheetId, sheetIdMap);
  await applyReportTabs(sheets, spreadsheetId, sheetIdMap);

  await clearNamedRanges(sheets, spreadsheetId, meta);
  ({ meta } = await getSheetIdMap(sheets, spreadsheetId));
  await applyNamedRanges(sheets, spreadsheetId, sheetIdMap);

  return { presentationVersion: PRESENTATION_VERSION };
}

export { PRESENTATION_VERSION };
