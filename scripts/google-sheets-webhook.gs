/**
 * Executive Flow → Google Sheets auto backup (appendRow model)
 *
 * REDEPLOY after every update:
 * Extensions → Apps Script → paste this file (or scripts/apps-script/Code.gs)
 * Deploy → Manage deployments → Edit → New version → Deploy
 *
 * Tabs: Meetings, Souvenirs, Expenditure, Orders, Dak Issuance, Tasks, Contacts, Meta
 * Report tabs: Meetings Report, Souvenirs Report, … (QUERY + conditional formatting)
 * Also paste scripts/apps-script/SheetsPresentation.gs into the same Apps Script project.
 * New rows use appendRow(); existing Record IDs are updated in place.
 */

const SHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
const SHEETS_FORMAT_VERSION = 'append-v2-presentation';

function ensureTabs_(ss) {
  var names = [
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
  var existing = ss.getSheets().map(function (s) { return s.getName(); });
  names.forEach(function (name) {
    if (existing.indexOf(name) === -1) ss.insertSheet(name);
  });
}

function isLegacySrHeader_(row1) {
  return String(row1[0] || '').trim() === 'Sr#';
}

function headerMatches_(row1, header) {
  return header.every(function (h, i) {
    return String(row1[i] || '').trim() === String(h).trim();
  });
}

function ensureHeader_(sh, header) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(header);
    return 1;
  }
  var row1 = sh.getRange(1, 1, 1, header.length).getValues()[0];
  if (!headerMatches_(row1, header)) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
  }
  return 1;
}

function migrateLegacyTab_(sh, header, dataRows, idColIndex) {
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  var lastRow = sh.getLastRow();
  if (lastRow > 1) sh.deleteRows(2, lastRow - 1);
  var appended = 0;
  (dataRows || []).forEach(function (row) {
    var id = String(row[idColIndex] || '').trim();
    if (!id) return;
    var normalized = row.slice();
    while (normalized.length < header.length) normalized.push('');
    sh.appendRow(normalized);
    appended++;
  });
  return { appended: appended, updated: 0, migrated: true };
}

function buildIdRowMap_(sh, idColIndex) {
  var map = {};
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return map;
  var lastCol = Math.max(sh.getLastColumn(), idColIndex + 1);
  var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  values.forEach(function (row, i) {
    var id = String(row[idColIndex] || '').trim();
    if (id) map[id] = i + 2;
  });
  return map;
}

function syncAppendUpsert_(sh, header, dataRows, idColIndex) {
  if (sh.getLastRow() > 0) {
    var row1 = sh.getRange(1, 1, 1, header.length).getValues()[0];
    if (isLegacySrHeader_(row1) || !headerMatches_(row1, header)) {
      return migrateLegacyTab_(sh, header, dataRows, idColIndex);
    }
  } else {
    sh.appendRow(header);
  }
  ensureHeader_(sh, header);
  var idToRow = buildIdRowMap_(sh, idColIndex);
  var appended = 0;
  var updated = 0;

  (dataRows || []).forEach(function (row) {
    var id = String(row[idColIndex] || '').trim();
    if (!id) return;
    var width = header.length;
    var normalized = row.slice();
    while (normalized.length < width) normalized.push('');
    if (idToRow[id]) {
      sh.getRange(idToRow[id], 1, 1, width).setValues([normalized]);
      updated++;
    } else {
      sh.appendRow(normalized);
      appended++;
    }
  });

  return { appended: appended, updated: updated };
}

function buildSouvenirDataRows_(souvenirs) {
  var rows = [];
  var seenBatches = {};
  var legacyGrouped = {};

  function pushObj(id, meeting, date, detail) {
    if (!detail || !String(detail).trim()) return;
    rows.push({
      id: id,
      meeting: meeting || '—',
      date: date || '',
      detail: String(detail).trim(),
    });
  }

  (souvenirs || []).forEach(function (s) {
    if (s.detail && s.source === 'calendar-meeting') {
      pushObj(s.id, s.meetingTitle, s.dateDistributed, s.detail);
      return;
    }
    if (s.presentationBatchId) {
      if (seenBatches[s.presentationBatchId]) return;
      seenBatches[s.presentationBatchId] = true;
      var batchItems = souvenirs.filter(function (x) {
        return x.presentationBatchId === s.presentationBatchId;
      });
      var raw = '';
      for (var b = 0; b < batchItems.length; b++) {
        if (batchItems[b].rawPresentationText) {
          raw = batchItems[b].rawPresentationText;
          break;
        }
      }
      var detail = raw;
      if (!detail) {
        detail = batchItems
          .map(function (x) {
            return (x.itemName || '') + ': ' + (x.quantity || '');
          })
          .join(', ');
      }
      pushObj(s.presentationBatchId, s.meetingTitle, s.dateDistributed, detail);
      return;
    }
    if (s.source === 'calendar-meeting' && s.meetingTitle) {
      var key = s.meetingTitle + '|' + (s.dateDistributed || '');
      var piece = s.rawPresentationText || '';
      if (!piece && s.itemName) {
        piece = s.itemName + (s.quantity != null ? ': ' + s.quantity : '');
      }
      if (!piece) return;
      if (!legacyGrouped[key]) {
        legacyGrouped[key] = {
          id: s.id,
          meeting: s.meetingTitle,
          date: s.dateDistributed,
          pieces: [piece],
        };
      } else {
        legacyGrouped[key].pieces.push(piece);
      }
    }
  });

  Object.keys(legacyGrouped).forEach(function (key) {
    var g = legacyGrouped[key];
    pushObj(g.id, g.meeting, g.date, g.pieces.join(', '));
  });

  return rows.map(function (r) {
    return [r.id, r.meeting, r.detail, r.date];
  });
}

function orderStatusLabel_(o) {
  if (o.status === 'received') return 'Received';
  if (o.status === 'cancelled') return 'Cancelled';
  return 'Pending';
}

function taskStatusLabel_(t) {
  if (t.status === 'done') return 'Done';
  if (t.status === 'cancelled') return 'Cancelled';
  return 'Pending';
}

function updateExpenditureSummary_(sh, expenditure) {
  var opening = Number(expenditure.openingBalance) || 0;
  var from = String(expenditure.openingBalanceDate || '').trim();
  var items = expenditure.expenditures || [];
  var total = items.reduce(function (sum, x) {
    if (from && x.date && String(x.date) < from) return sum;
    return sum + (Number(x.amount) || 0);
  }, 0);
  sh.getRange(1, 1, 4, 2).setValues([
    ['Opening Balance (PKR)', opening],
    ['Effective from', from || '—'],
    ['Total Spent (PKR)', total],
    ['Closing Balance (PKR)', opening - total],
  ]);
}

var EXPENDITURE_HEADER_ROW = 6;

function isLegacyExpenditureLayout_(sh) {
  if (sh.getLastRow() < EXPENDITURE_HEADER_ROW) return false;
  var first = String(sh.getRange(EXPENDITURE_HEADER_ROW, 1).getValue() || '').trim();
  return first === 'Date';
}

function migrateLegacyExpenditure_(sh, expenditure) {
  updateExpenditureSummary_(sh, expenditure);
  var header = ['Record ID', 'Date', 'Description', 'Amount (PKR)', 'Category'];
  sh.getRange(EXPENDITURE_HEADER_ROW, 1, 1, header.length).setValues([header]);
  var lastRow = sh.getLastRow();
  if (lastRow > EXPENDITURE_HEADER_ROW) {
    sh.deleteRows(EXPENDITURE_HEADER_ROW + 1, lastRow - EXPENDITURE_HEADER_ROW);
  }
  var items = expenditure.expenditures || [];
  var appended = 0;
  items.forEach(function (x) {
    var id = String(x.id || '').trim();
    if (!id) return;
    sh.appendRow([x.id || '', x.date || '', x.description || '', Number(x.amount) || 0, x.category || 'Other']);
    appended++;
  });
  return { appended: appended, updated: 0, migrated: true };
}

function syncExpenditureAppend_(sh, expenditure) {
  if (isLegacyExpenditureLayout_(sh)) {
    return migrateLegacyExpenditure_(sh, expenditure);
  }
  updateExpenditureSummary_(sh, expenditure);
  var header = ['Record ID', 'Date', 'Description', 'Amount (PKR)', 'Category'];
  if (sh.getLastRow() < EXPENDITURE_HEADER_ROW) {
    sh.getRange(EXPENDITURE_HEADER_ROW, 1, 1, header.length).setValues([header]);
  } else {
    var row5 = sh.getRange(EXPENDITURE_HEADER_ROW, 1, 1, header.length).getValues()[0];
    if (!headerMatches_(row5, header)) {
      sh.getRange(EXPENDITURE_HEADER_ROW, 1, 1, header.length).setValues([header]);
    }
  }
  var items = expenditure.expenditures || [];
  var idToRow = {};
  var lastRow = sh.getLastRow();
  if (lastRow > EXPENDITURE_HEADER_ROW) {
    var values = sh.getRange(
      EXPENDITURE_HEADER_ROW + 1,
      1,
      lastRow - EXPENDITURE_HEADER_ROW,
      header.length,
    ).getValues();
    values.forEach(function (row, i) {
      var id = String(row[0] || '').trim();
      if (id) idToRow[id] = EXPENDITURE_HEADER_ROW + 1 + i;
    });
  }
  var appended = 0;
  var updated = 0;
  items.forEach(function (x) {
    var row = [x.id || '', x.date || '', x.description || '', Number(x.amount) || 0, x.category || 'Other'];
    var id = String(row[0] || '').trim();
    if (!id) return;
    if (idToRow[id]) {
      sh.getRange(idToRow[id], 1, 1, header.length).setValues([row]);
      updated++;
    } else {
      sh.appendRow(row);
      appended++;
    }
  });
  return { appended: appended, updated: updated };
}

function appendMetaLog_(ss, payload, stats) {
  var sh = ss.getSheetByName('Meta');
  var header = [
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
  if (sh.getLastRow() === 0) sh.appendRow(header);
  sh.appendRow([
    payload.syncedAt || new Date().toISOString(),
    SHEETS_FORMAT_VERSION,
    stats.meetings,
    stats.orders,
    stats.dak,
    stats.tasks,
    stats.souvenirs,
    stats.expenditures,
    stats.appended,
    stats.updated,
  ]);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var data = payload.data || payload;
    var ss = SpreadsheetApp.openById(SHEET_ID);
    ensureTabs_(ss);

    var meetings = data.meetings || [];
    var souvenirs = data.souvenirs || [];
    var orders = data.orders || [];
    var dak = data.dak || [];
    var tasks = data.tasks || [];
    var contacts = data.contacts || [];
    var expenditure = data.expenditure || { openingBalance: 0, expenditures: [] };
    var items = expenditure.expenditures || [];

    var totalAppended = 0;
    var totalUpdated = 0;

    var meetingHeader = [
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
    var meetingRows = meetings.map(function (m) {
      return [
        m.id || '',
        m.date || '',
        m.time || '',
        m.title || '',
        m.location || '',
        m.agenda || '',
        (m.attendees || []).join(', '),
        m.status || '',
        m.scheduledViaCalendar ? 'Yes' : 'No',
      ];
    });
    var mStats = syncAppendUpsert_(ss.getSheetByName('Meetings'), meetingHeader, meetingRows, 0);
    totalAppended += mStats.appended;
    totalUpdated += mStats.updated;

    var souvenirHeader = ['Record ID', 'Meeting Title', 'Souvenirs', 'Date'];
    var sStats = syncAppendUpsert_(
      ss.getSheetByName('Souvenirs'),
      souvenirHeader,
      buildSouvenirDataRows_(souvenirs),
      0,
    );
    totalAppended += sStats.appended;
    totalUpdated += sStats.updated;

    var eStats = syncExpenditureAppend_(ss.getSheetByName('Expenditure'), expenditure);
    totalAppended += eStats.appended;
    totalUpdated += eStats.updated;

    var orderHeader = [
      'Record ID',
      'Order#',
      'Item',
      'Qty',
      'Vendor',
      'Placed Date',
      'Status',
    ];
    var orderRows = orders.map(function (o) {
      return [
        o.id || '',
        o.orderNumber || '',
        o.item || '',
        o.quantity || '',
        o.vendor || '',
        o.placedDate || '',
        orderStatusLabel_(o),
      ];
    });
    var oStats = syncAppendUpsert_(ss.getSheetByName('Orders'), orderHeader, orderRows, 0);
    totalAppended += oStats.appended;
    totalUpdated += oStats.updated;

    var dakHeader = [
      'Record ID',
      'System Dispatch No.',
      'Date (Dispatched)',
      'Addressee',
      'Subject',
      'Date Received',
      'Official Outward No.',
      'Status',
    ];
    var dakRows = dak.map(function (d) {
      return [
        d.id || '',
        d.fileId || '',
        d.forwardedDate || '',
        d.designation || '',
        d.subject || '',
        d.receivedDate || '',
        d.externalDispatchNo || '',
        d.status === 'cancelled' ? 'Cancelled' : 'Active',
      ];
    });
    var dStats = syncAppendUpsert_(ss.getSheetByName('Dak Issuance'), dakHeader, dakRows, 0);
    totalAppended += dStats.appended;
    totalUpdated += dStats.updated;

    var taskHeader = ['Record ID', 'Task', 'Date', 'Time', 'Status'];
    var taskRows = tasks.map(function (t) {
      return [
        t.id || '',
        t.title || '',
        t.date || '',
        t.time || '',
        taskStatusLabel_(t),
      ];
    });
    var tStats = syncAppendUpsert_(ss.getSheetByName('Tasks'), taskHeader, taskRows, 0);
    totalAppended += tStats.appended;
    totalUpdated += tStats.updated;

    var contactHeader = [
      'Record ID',
      'Name',
      'Phone',
      'Email',
      'Designation',
      'Contact No',
      'Address',
    ];
    var contactRows = contacts.map(function (c) {
      return [
        c.id || '',
        c.name || '',
        c.phone || '',
        c.email || '',
        c.designation || '',
        c.contactNo || '',
        c.address || '',
      ];
    });
    var cStats = syncAppendUpsert_(ss.getSheetByName('Contacts'), contactHeader, contactRows, 0);
    totalAppended += cStats.appended;
    totalUpdated += cStats.updated;

    appendMetaLog_(ss, payload, {
      meetings: meetings.length,
      orders: orders.length,
      dak: dak.filter(function (d) {
        return d.status !== 'cancelled';
      }).length,
      tasks: tasks.filter(function (t) {
        return t.status !== 'cancelled';
      }).length,
      souvenirs: souvenirs.length,
      expenditures: items.length,
      appended: totalAppended,
      updated: totalUpdated,
    });

    var presentation = applySheetPresentation_(ss);

    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        format: SHEETS_FORMAT_VERSION,
        presentation: presentation.presentationVersion,
        mode: 'appendRow',
        appended: totalAppended,
        updated: totalUpdated,
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function readSheetValues_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  return sh.getRange(1, 1, lastRow, lastCol).getValues();
}

function exportAllData_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var tabNames = ss.getSheets().map(function (s) {
    return s.getName();
  });
  var sheetsObj = {};
  tabNames.forEach(function (name) {
    sheetsObj[name] = readSheetValues_(ss, name);
  });
  var payload = {
    ok: true,
    format: SHEETS_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    spreadsheetId: SHEET_ID,
    tabNames: tabNames,
    rowCounts: {},
    sheets: sheetsObj,
  };
  tabNames.forEach(function (name) {
    payload.rowCounts[name] = (sheetsObj[name] || []).length;
  });
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'export') {
    return exportAllData_();
  }
  return ContentService.createTextOutput(
    'Executive Flow Sheets webhook OK — ' + SHEETS_FORMAT_VERSION + ' · appendRow · GET ?action=export',
  ).setMimeType(ContentService.MimeType.TEXT);
}
