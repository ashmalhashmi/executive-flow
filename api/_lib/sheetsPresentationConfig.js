/** Shared layout for print-ready Google Sheets backup (API + Apps Script). */
export const PRESENTATION_VERSION = 'presentation-v1';

export const RAW_DATA_TABS = [
  'Meetings',
  'Souvenirs',
  'Expenditure',
  'Orders',
  'Dak Issuance',
  'Tasks',
  'Contacts',
  'Meta',
];

export const REPORT_TAB_NAMES = [
  'Meetings Report',
  'Souvenirs Report',
  'Expenditure Report',
  'Orders Report',
  'Dak Report',
  'Tasks Report',
  'Contacts Report',
];

/** Named ranges — column labels visible in Name box for any reader. */
export const NAMED_RANGE_DEFS = [
  { name: 'EF_Meetings_Headers', range: 'Meetings!A1:I1' },
  { name: 'EF_Meetings_Data', range: 'Meetings!A2:I5000' },
  { name: 'EF_Souvenirs_Headers', range: 'Souvenirs!A1:D1' },
  { name: 'EF_Souvenirs_Data', range: 'Souvenirs!A2:D5000' },
  { name: 'EF_Expenditure_Summary', range: 'Expenditure!A1:B4' },
  { name: 'EF_Expenditure_Headers', range: 'Expenditure!A6:E6' },
  { name: 'EF_Expenditure_Data', range: 'Expenditure!A7:E5000' },
  { name: 'EF_Orders_Headers', range: 'Orders!A1:G1' },
  { name: 'EF_Orders_Data', range: 'Orders!A2:G5000' },
  { name: 'EF_Dak_Headers', range: 'Dak Issuance!A1:H1' },
  { name: 'EF_Dak_Data', range: 'Dak Issuance!A2:H5000' },
  { name: 'EF_Tasks_Headers', range: 'Tasks!A1:E1' },
  { name: 'EF_Tasks_Data', range: 'Tasks!A2:E5000' },
  { name: 'EF_Contacts_Headers', range: 'Contacts!A1:G1' },
  { name: 'EF_Contacts_Data', range: 'Contacts!A2:G5000' },
];

/** Status / value colours for conditional formatting (0–1 RGB). */
export const STATUS_COLORS = {
  cancelled: { red: 0.96, green: 0.8, blue: 0.8 },
  pending: { red: 1, green: 0.95, blue: 0.8 },
  active: { red: 0.85, green: 0.92, blue: 0.83 },
  done: { red: 0.85, green: 0.92, blue: 0.83 },
  received: { red: 0.85, green: 0.92, blue: 0.83 },
  highAmount: { red: 1, green: 0.9, blue: 0.85 },
};

export const HEADER_STYLE = {
  backgroundColor: { red: 0.12, green: 0.12, blue: 0.12 },
  textFormat: {
    bold: true,
    foregroundColor: { red: 1, green: 1, blue: 1 },
    fontSize: 10,
  },
  horizontalAlignment: 'CENTER',
  verticalAlignment: 'MIDDLE',
};

export const REPORT_TITLE_STYLE = {
  backgroundColor: { red: 0.2, green: 0.35, blue: 0.55 },
  textFormat: {
    bold: true,
    foregroundColor: { red: 1, green: 1, blue: 1 },
    fontSize: 14,
  },
  horizontalAlignment: 'LEFT',
};

export const REPORT_SUBTITLE_STYLE = {
  textFormat: {
    italic: true,
    foregroundColor: { red: 0.35, green: 0.35, blue: 0.35 },
    fontSize: 9,
  },
};

/**
 * Report tabs use QUERY on raw tabs — human-readable column labels, sorted for print.
 * formulaRow: 1-based row where QUERY result starts.
 * statusCol: 1-based column letter index in report sheet for status conditional format.
 */
export function getReportTabDefs() {
  return [
    {
      name: 'Meetings Report',
      sourceTab: 'Meetings',
      title: 'Meetings — Executive Calendar',
      subtitle:
        'Auto-formatted view. Source tab: Meetings (column A = Record ID). Sorted by date, newest first.',
      formulaRow: 4,
      formula: `=QUERY(Meetings!A1:I, "SELECT B, D, C, E, F, H, I WHERE A IS NOT NULL AND A <> 'Record ID' ORDER BY B DESC LABEL B 'Date', D 'Meeting Title', C 'Time', E 'Location', F 'Agenda', H 'Status', I 'Calendar Sync'", 1)`,
      statusCol: 6,
      mergeTitleCols: 7,
    },
    {
      name: 'Souvenirs Report',
      sourceTab: 'Souvenirs',
      title: 'Souvenirs — Presentation Log',
      subtitle:
        'Auto-formatted view. Source tab: Souvenirs. Sorted by distribution date, newest first.',
      formulaRow: 4,
      formula: `=QUERY(Souvenirs!A1:D, "SELECT B, C, D WHERE A IS NOT NULL AND A <> 'Record ID' ORDER BY D DESC LABEL B 'Meeting Title', C 'Souvenirs / Presentation', D 'Date Distributed'", 1)`,
      mergeTitleCols: 4,
    },
    {
      name: 'Expenditure Report',
      sourceTab: 'Expenditure',
      title: 'Expenditure — Budget & Spending',
      subtitle:
        'Summary from Expenditure tab rows 1–4. Log below uses QUERY (Record ID in column A).',
      formulaRow: 9,
      formula: `=QUERY(Expenditure!A6:E, "SELECT B, C, D, E WHERE A IS NOT NULL AND A <> 'Record ID' ORDER BY B DESC LABEL B 'Date', C 'Description', D 'Amount (PKR)', E 'Category'", 1)`,
      statusCol: null,
      amountCol: 3,
      mergeTitleCols: 4,
      summaryRows: [
        ['Label', 'Value'],
        ['=Expenditure!A1', '=Expenditure!B1'],
        ['=Expenditure!A2', '=Expenditure!B2'],
        ['=Expenditure!A3', '=Expenditure!B3'],
        ['=Expenditure!A4', '=Expenditure!B4'],
      ],
      summaryStartRow: 4,
    },
    {
      name: 'Orders Report',
      sourceTab: 'Orders',
      title: 'Orders — Procurement Log',
      subtitle: 'Auto-formatted view. Source tab: Orders. Sorted by placed date, newest first.',
      formulaRow: 4,
      formula: `=QUERY(Orders!A1:G, "SELECT B, C, D, E, F, G WHERE A IS NOT NULL AND A <> 'Record ID' ORDER BY F DESC LABEL B 'Order #', C 'Item', D 'Quantity', E 'Vendor', F 'Placed Date', G 'Status'", 1)`,
      statusCol: 7,
      mergeTitleCols: 7,
    },
    {
      name: 'Dak Report',
      sourceTab: 'Dak Issuance',
      title: 'Dak Issuance — Context Register',
      subtitle:
        'Human view: Subject, Date, Addressee first. System ref last. Sorted by dispatch date.',
      formulaRow: 4,
      formula: `=QUERY('Dak Issuance'!A1:H, "SELECT E, C, D, F, B, G WHERE A IS NOT NULL AND A <> 'Record ID' ORDER BY C DESC LABEL E 'Subject', C 'Date (Dispatched)', D 'Addressee', F 'Date Received', B 'System Ref', G 'Official Outward No.'", 1)`,
      statusCol: null,
      mergeTitleCols: 6,
    },
    {
      name: 'Tasks Report',
      sourceTab: 'Tasks',
      title: 'Tasks — Action Items',
      subtitle: 'Auto-formatted view. Source tab: Tasks. Sorted by date, newest first.',
      formulaRow: 4,
      formula: `=QUERY(Tasks!A1:E, "SELECT B, C, D, E WHERE A IS NOT NULL AND A <> 'Record ID' ORDER BY C DESC LABEL B 'Task', C 'Date', D 'Time', E 'Status'", 1)`,
      statusCol: 5,
      mergeTitleCols: 5,
    },
    {
      name: 'Contacts Report',
      sourceTab: 'Contacts',
      title: 'Contacts — Directory',
      subtitle: 'Auto-formatted view. Source tab: Contacts. Sorted alphabetically by name.',
      formulaRow: 4,
      formula: `=QUERY(Contacts!A1:G, "SELECT B, C, D, E, F, G WHERE A IS NOT NULL AND A <> 'Record ID' ORDER BY B ASC LABEL B 'Name', C 'Phone', D 'Email', E 'Designation', F 'Contact No', G 'Address'", 1)`,
      statusCol: null,
      mergeTitleCols: 7,
    },
  ];
}

/** Raw-tab status column (1-based) for conditional formatting on data tabs. */
export const RAW_STATUS_COLUMNS = {
  Meetings: 8,
  Orders: 7,
  'Dak Issuance': 8,
  Tasks: 5,
};
