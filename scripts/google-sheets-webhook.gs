/**
 * Executive Flow → Google Sheets backup (mirror / one correct copy).
 * REDEPLOY after update: Deploy → Manage deployments → New version.
 */
const SHEET_ID = '1Ga57vcq7mxTU5jTilKNJ09IY8JaacfeMC8tPMMp0Yog';
const SHEETS_FORMAT_VERSION = 'mirror-v1';
var EXPENDITURE_HEADER_ROW_ = 6;

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

function dedupeRowsById_(rows, idColIndex) {
  var seen = {};
  var out = [];
  for (var i = (rows || []).length - 1; i >= 0; i--) {
    var row = rows[i];
    var id = String((row && row[idColIndex]) || '').trim();
    if (!id || seen[id]) continue;
    seen[id] = true;
    out.unshift(row.slice());
  }
  return out;
}

function snapshotHasAnyDomainData_(data) {
  var expenditure = data.expenditure || {};
  var items = expenditure.expenditures || [];
  return (
    (data.meetings || []).length > 0 ||
    (data.souvenirs || []).length > 0 ||
    items.length > 0 ||
    (data.orders || []).length > 0 ||
    (data.dak || []).length > 0 ||
    (data.tasks || []).length > 0 ||
    (data.contacts || []).length > 0 ||
    Number(expenditure.openingBalance) > 0
  );
}

function sheetLooksPopulated_(ss) {
  var tabs = ['Meetings', 'Orders', 'Tasks', 'Souvenirs', 'Contacts', 'Dak Issuance'];
  for (var i = 0; i < tabs.length; i++) {
    var sh = ss.getSheetByName(tabs[i]);
    if (sh && sh.getLastRow() > 1) return true;
  }
  var exp = ss.getSheetByName('Expenditure');
  return !!(exp && exp.getLastRow() > EXPENDITURE_HEADER_ROW_);
}

/** One correct copy per tab — clear old rows, write exact snapshot (no append ghosts). */
function syncReplaceTab_(sh, header, dataRows, idColIndex) {
  var rows = dedupeRowsById_(dataRows, idColIndex || 0).map(function (row) {
    var normalized = row.slice();
    while (normalized.length < header.length) normalized.push('');
    return normalized.slice(0, header.length);
  });
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  if (rows.length) {
    sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
  return { replaced: rows.length };
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

  return dedupeRowsById_(
    rows.map(function (r) {
      return [r.id, r.meeting, r.detail, r.date];
    }),
    0,
  );
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

function contactSheetRow_(c) {
  var phones =
    c.phones && c.phones.length ? c.phones.join(', ') : c.phone || '';
  var emails =
    c.emails && c.emails.length ? c.emails.join(', ') : c.email || '';
  var contactNos =
    c.contactNos && c.contactNos.length ? c.contactNos.join(', ') : c.contactNo || '';
  return [
    c.id || '',
    c.name || '',
    phones,
    emails,
    c.designation || '',
    contactNos,
    c.address || '',
  ];
}

function syncReplaceExpenditure_(sh, expenditure) {
  var opening = Number(expenditure.openingBalance) || 0;
  var from = String(expenditure.openingBalanceDate || '').trim();
  var items = expenditure.expenditures || [];
  var total = items.reduce(function (sum, x) {
    if (from && x.date && String(x.date) < from) return sum;
    return sum + (Number(x.amount) || 0);
  }, 0);
  var header = ['Record ID', 'Date', 'Description', 'Amount (PKR)', 'Category'];
  var rows = dedupeRowsById_(
    items
      .filter(function (x) {
        return String(x.id || '').trim();
      })
      .map(function (x) {
        return [
          x.id || '',
          x.date || '',
          x.description || '',
          Number(x.amount) || 0,
          x.category || 'Other',
        ];
      }),
    0,
  );

  sh.clearContents();
  sh.getRange(1, 1, 4, 2).setValues([
    ['Opening Balance (PKR)', opening],
    ['Effective from', from || '—'],
    ['Total Spent (PKR)', total],
    ['Closing Balance (PKR)', opening - total],
  ]);
  sh.getRange(EXPENDITURE_HEADER_ROW_, 1, 1, header.length).setValues([header]);
  if (rows.length) {
    sh.getRange(EXPENDITURE_HEADER_ROW_ + 1, 1, rows.length, header.length).setValues(rows);
  }
  return { replaced: rows.length };
}

function writeMetaStatus_(ss, payload, stats) {
  var sh = ss.getSheetByName('Meta');
  var header = [
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
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  sh.getRange(2, 1, 1, header.length).setValues([
    [
      payload.syncedAt || new Date().toISOString(),
      SHEETS_FORMAT_VERSION,
      'mirror',
      stats.meetings,
      stats.orders,
      stats.dak,
      stats.tasks,
      stats.souvenirs,
      stats.expenditures,
      stats.contacts || 0,
      stats.replaced,
    ],
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

    if (!snapshotHasAnyDomainData_(data) && sheetLooksPopulated_(ss)) {
      return ContentService.createTextOutput(
        JSON.stringify({
          ok: false,
          error: 'Empty app snapshot blocked — sheet already has data.',
          mode: 'mirror',
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var totalReplaced = 0;

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
    totalReplaced += syncReplaceTab_(
      ss.getSheetByName('Meetings'),
      meetingHeader,
      meetingRows,
      0,
    ).replaced;

    var souvenirHeader = ['Record ID', 'Meeting Title', 'Souvenirs', 'Date'];
    totalReplaced += syncReplaceTab_(
      ss.getSheetByName('Souvenirs'),
      souvenirHeader,
      buildSouvenirDataRows_(souvenirs),
      0,
    ).replaced;

    totalReplaced += syncReplaceExpenditure_(
      ss.getSheetByName('Expenditure'),
      expenditure,
    ).replaced;

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
    totalReplaced += syncReplaceTab_(
      ss.getSheetByName('Orders'),
      orderHeader,
      orderRows,
      0,
    ).replaced;

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
    totalReplaced += syncReplaceTab_(
      ss.getSheetByName('Dak Issuance'),
      dakHeader,
      dakRows,
      0,
    ).replaced;

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
    totalReplaced += syncReplaceTab_(
      ss.getSheetByName('Tasks'),
      taskHeader,
      taskRows,
      0,
    ).replaced;

    var contactHeader = [
      'Record ID',
      'Name',
      'Phone',
      'Email',
      'Designation',
      'Contact No',
      'Address',
    ];
    var contactRows = contacts.map(contactSheetRow_);
    totalReplaced += syncReplaceTab_(
      ss.getSheetByName('Contacts'),
      contactHeader,
      contactRows,
      0,
    ).replaced;

    writeMetaStatus_(ss, payload, {
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
      contacts: contacts.filter(function (c) {
        return c.status !== 'archived';
      }).length,
      replaced: totalReplaced,
    });

    var presentation = applySheetPresentation_(ss);

    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        format: SHEETS_FORMAT_VERSION,
        presentation: presentation.presentationVersion,
        mode: 'mirror',
        replaced: totalReplaced,
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
    'Executive Flow Sheets webhook OK — ' + SHEETS_FORMAT_VERSION + ' · mirror · GET ?action=export',
  ).setMimeType(ContentService.MimeType.TEXT);
}
