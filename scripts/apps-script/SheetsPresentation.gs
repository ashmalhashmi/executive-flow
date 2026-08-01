/**
 * Print-ready sheet layout: QUERY report tabs, conditional formatting, named ranges.
 * Deploy alongside Code.gs in the same Apps Script project.
 */
var PRESENTATION_VERSION = 'presentation-v1';

var REPORT_TAB_NAMES_ = [
  'Meetings Report',
  'Souvenirs Report',
  'Expenditure Report',
  'Orders Report',
  'Dak Report',
  'Tasks Report',
  'Contacts Report',
];

var NAMED_RANGE_DEFS_ = [
  { name: 'EF_Meetings_Headers', tab: 'Meetings', a1: 'A1:I1' },
  { name: 'EF_Meetings_Data', tab: 'Meetings', a1: 'A2:I5000' },
  { name: 'EF_Souvenirs_Headers', tab: 'Souvenirs', a1: 'A1:D1' },
  { name: 'EF_Souvenirs_Data', tab: 'Souvenirs', a1: 'A2:D5000' },
  { name: 'EF_Expenditure_Summary', tab: 'Expenditure', a1: 'A1:B4' },
  { name: 'EF_Expenditure_Headers', tab: 'Expenditure', a1: 'A6:E6' },
  { name: 'EF_Expenditure_Data', tab: 'Expenditure', a1: 'A7:E5000' },
  { name: 'EF_Orders_Headers', tab: 'Orders', a1: 'A1:G1' },
  { name: 'EF_Orders_Data', tab: 'Orders', a1: 'A2:G5000' },
  { name: 'EF_Dak_Headers', tab: 'Dak Issuance', a1: 'A1:H1' },
  { name: 'EF_Dak_Data', tab: 'Dak Issuance', a1: 'A2:H5000' },
  { name: 'EF_Tasks_Headers', tab: 'Tasks', a1: 'A1:E1' },
  { name: 'EF_Tasks_Data', tab: 'Tasks', a1: 'A2:E5000' },
  { name: 'EF_Contacts_Headers', tab: 'Contacts', a1: 'A1:G1' },
  { name: 'EF_Contacts_Data', tab: 'Contacts', a1: 'A2:G5000' },
];

function ensureReportTabs_(ss) {
  var existing = ss.getSheets().map(function (s) {
    return s.getName();
  });
  REPORT_TAB_NAMES_.forEach(function (name) {
    if (existing.indexOf(name) === -1) ss.insertSheet(name);
  });
}

function getReportTabDefs_() {
  return [
    {
      name: 'Meetings Report',
      title: 'Meetings — Executive Calendar',
      subtitle:
        'Auto-formatted view. Source tab: Meetings (column A = Record ID). Sorted by date, newest first.',
      formulaRow: 4,
      formula:
        '=QUERY(Meetings!A1:I, "SELECT B, D, C, E, F, H, I WHERE A IS NOT NULL AND A <> \'Record ID\' ORDER BY B DESC LABEL B \'Date\', D \'Meeting Title\', C \'Time\', E \'Location\', F \'Agenda\', H \'Status\', I \'Calendar Sync\'", 1)',
      statusCol: 6,
      mergeCols: 7,
    },
    {
      name: 'Souvenirs Report',
      title: 'Souvenirs — Presentation Log',
      subtitle:
        'Auto-formatted view. Source tab: Souvenirs. Sorted by distribution date, newest first.',
      formulaRow: 4,
      formula:
        '=QUERY(Souvenirs!A1:D, "SELECT B, C, D WHERE A IS NOT NULL AND A <> \'Record ID\' ORDER BY D DESC LABEL B \'Meeting Title\', C \'Souvenirs / Presentation\', D \'Date Distributed\'", 1)',
      mergeCols: 4,
    },
    {
      name: 'Expenditure Report',
      title: 'Expenditure — Budget & Spending',
      subtitle:
        'Summary from Expenditure tab rows 1–4. Log below uses QUERY (Record ID in column A).',
      formulaRow: 9,
      formula:
        '=QUERY(Expenditure!A6:E, "SELECT B, C, D, E WHERE A IS NOT NULL AND A <> \'Record ID\' ORDER BY B DESC LABEL B \'Date\', C \'Description\', D \'Amount (PKR)\', E \'Category\'", 1)',
      amountCol: 3,
      mergeCols: 4,
      summary: true,
    },
    {
      name: 'Orders Report',
      title: 'Orders — Procurement Log',
      subtitle: 'Auto-formatted view. Source tab: Orders. Sorted by placed date, newest first.',
      formulaRow: 4,
      formula:
        '=QUERY(Orders!A1:G, "SELECT B, C, D, E, F, G WHERE A IS NOT NULL AND A <> \'Record ID\' ORDER BY F DESC LABEL B \'Order #\', C \'Item\', D \'Quantity\', E \'Vendor\', F \'Placed Date\', G \'Status\'", 1)',
      statusCol: 7,
      mergeCols: 7,
    },
    {
      name: 'Dak Report',
      title: 'Dak Issuance — Context Register',
      subtitle:
        'Human view: Subject, Date, Addressee first. System ref last. Sorted by dispatch date.',
      formulaRow: 4,
      formula:
        '=QUERY(\'Dak Issuance\'!A1:H, "SELECT E, C, D, F, B, G WHERE A IS NOT NULL AND A <> \'Record ID\' ORDER BY C DESC LABEL E \'Subject\', C \'Date (Dispatched)\', D \'Addressee\', F \'Date Received\', B \'System Ref\', G \'Official Outward No.\'", 1)',
      mergeCols: 6,
    },
    {
      name: 'Tasks Report',
      title: 'Tasks — Action Items',
      subtitle: 'Auto-formatted view. Source tab: Tasks. Sorted by date, newest first.',
      formulaRow: 4,
      formula:
        '=QUERY(Tasks!A1:E, "SELECT B, C, D, E WHERE A IS NOT NULL AND A <> \'Record ID\' ORDER BY C DESC LABEL B \'Task\', C \'Date\', D \'Time\', E \'Status\'", 1)',
      statusCol: 5,
      mergeCols: 5,
    },
    {
      name: 'Contacts Report',
      title: 'Contacts — Directory',
      subtitle: 'Auto-formatted view. Source tab: Contacts. Sorted alphabetically by name.',
      formulaRow: 4,
      formula:
        '=QUERY(Contacts!A1:G, "SELECT B, C, D, E, F, G WHERE A IS NOT NULL AND A <> \'Record ID\' ORDER BY B ASC LABEL B \'Name\', C \'Phone\', D \'Email\', E \'Designation\', F \'Contact No\', G \'Address\'", 1)',
      mergeCols: 7,
    },
  ];
}

function applyRawHeaderStyle_(sh, tabName) {
  var headerBg = '#1e1e1e';
  var headerColor = '#ffffff';

  if (tabName === 'Expenditure') {
    sh.setFrozenRows(6);
    sh.getRange(6, 1, 1, 5).setBackground(headerBg).setFontColor(headerColor).setFontWeight('bold');
    return;
  }
  if (tabName === 'Meta') {
    sh.setFrozenRows(1);
    return;
  }

  var widths = {
    Meetings: 9,
    Souvenirs: 4,
    Orders: 7,
    'Dak Issuance': 8,
    Tasks: 5,
    Contacts: 7,
  };
  var cols = widths[tabName];
  if (!cols) return;
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, cols).setBackground(headerBg).setFontColor(headerColor).setFontWeight('bold');
}

function applyStatusRules_(sh, colIndex, startRow) {
  var lastRow = Math.max(startRow, sh.getLastRow());
  var range = sh.getRange(startRow, colIndex, lastRow, colIndex);
  var rules = [];

  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Cancelled')
      .setBackground('#f4cccc')
      .setRanges([range])
      .build(),
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Pending')
      .setBackground('#fff2cc')
      .setRanges([range])
      .build(),
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Active')
      .setBackground('#d9ead3')
      .setRanges([range])
      .build(),
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Done')
      .setBackground('#d9ead3')
      .setRanges([range])
      .build(),
  );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Received')
      .setBackground('#d9ead3')
      .setRanges([range])
      .build(),
  );
  sh.setConditionalFormatRules(rules);
}

function applyRawTabPresentation_(ss) {
  var rawStatusCols = {
    Meetings: 8,
    Orders: 7,
    'Dak Issuance': 8,
    Tasks: 5,
  };

  ['Meetings', 'Souvenirs', 'Expenditure', 'Orders', 'Dak Issuance', 'Tasks', 'Contacts', 'Meta'].forEach(
    function (name) {
      var sh = ss.getSheetByName(name);
      if (!sh) return;
      applyRawHeaderStyle_(sh, name);
      if (rawStatusCols[name]) {
        sh.clearConditionalFormatRules();
        applyStatusRules_(sh, rawStatusCols[name], 2);
      }
    },
  );
}

function writeReportTab_(ss, def) {
  var sh = ss.getSheetByName(def.name);
  if (!sh) return;

  sh.clear();
  sh.getRange(1, 1).setValue(def.title);
  sh.getRange(2, 1).setValue(def.subtitle);

  if (def.summary) {
    sh.getRange(4, 1, 1, 2).setValues([['Label', 'Value']]);
    sh.getRange(5, 1).setFormula('=Expenditure!A1');
    sh.getRange(5, 2).setFormula('=Expenditure!B1');
    sh.getRange(6, 1).setFormula('=Expenditure!A2');
    sh.getRange(6, 2).setFormula('=Expenditure!B2');
    sh.getRange(7, 1).setFormula('=Expenditure!A3');
    sh.getRange(7, 2).setFormula('=Expenditure!B3');
    sh.getRange(8, 1).setFormula('=Expenditure!A4');
    sh.getRange(8, 2).setFormula('=Expenditure!B4');
  }

  sh.getRange(def.formulaRow, 1).setFormula(def.formula);
  sh.getRange(2, 1, 1, def.mergeCols).merge();
  sh.getRange(1, 1).setBackground('#33658a').setFontColor('#ffffff').setFontWeight('bold').setFontSize(14);
  sh.getRange(2, 1).setFontStyle('italic').setFontColor('#595959').setFontSize(9);
  sh.setFrozenRows(def.formulaRow);

  sh.clearConditionalFormatRules();
  if (def.statusCol) {
    applyStatusRules_(sh, def.statusCol, def.formulaRow + 1);
  }
  if (def.amountCol) {
    var amountRange = sh.getRange(def.formulaRow + 1, def.amountCol, 4999, 1);
    var rules = sh.getConditionalFormatRules();
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberGreaterThan(50000)
        .setBackground('#ffe6cc')
        .setBold(true)
        .setRanges([amountRange])
        .build(),
    );
    sh.setConditionalFormatRules(rules);
  }
}

function applyReportTabs_(ss) {
  getReportTabDefs_().forEach(function (def) {
    writeReportTab_(ss, def);
  });
}

function applyNamedRanges_(ss) {
  var existing = ss.getNamedRanges();
  existing.forEach(function (nr) {
    if (String(nr.getName()).indexOf('EF_') === 0) nr.remove();
  });

  NAMED_RANGE_DEFS_.forEach(function (def) {
    var sh = ss.getSheetByName(def.tab);
    if (!sh) return;
    var range = sh.getRange(def.a1);
    ss.setNamedRange(def.name, range);
  });
}

function applySheetPresentation_(ss) {
  ensureReportTabs_(ss);
  applyRawTabPresentation_(ss);
  applyReportTabs_(ss);
  applyNamedRanges_(ss);
  return { presentationVersion: PRESENTATION_VERSION };
}

/**
 * ONE-TIME: Apps Script editor se chalao (Run menu).
 * Sheet par Report tabs + colours + named ranges turant lag jayenge.
 * Web app redeploy ke baghair bhi kaam karta hai.
 */
function setupPrintReadySheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var result = applySheetPresentation_(ss);
  Logger.log('Print-ready layout OK: ' + result.presentationVersion);
  try {
    SpreadsheetApp.getUi().alert(
      'Ho gaya!\n\nNaye tabs neeche dekho:\n' +
        'Meetings Report, Orders Report, Tasks Report, ...\n\n' +
        'Sheet refresh karein (F5).',
    );
  } catch (e) {
    /* editor run without UI */
  }
}
