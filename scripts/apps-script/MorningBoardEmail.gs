/**
 * Morning Meeting Board — 8:00 AM Asia/Karachi via Gmail
 *
 * ONE-TIME SETUP (Apps Script editor):
 * 1. Paste this file into the same project as Code.gs
 * 2. Select function: installMorningMeetingBoardTrigger
 * 3. Run → Allow permissions (Gmail + Sheets + Docs)
 *
 * Email goes to the Google account that owns this script.
 * Override: Script Properties → MORNING_BOARD_EMAIL = you@email.com
 */

var MORNING_BOARD_TZ = 'Asia/Karachi';

function getMorningBoardEmail_() {
  var props = PropertiesService.getScriptProperties();
  var custom = String(props.getProperty('MORNING_BOARD_EMAIL') || '').trim();
  if (custom) return custom;
  try {
    return Session.getEffectiveUser().getEmail();
  } catch (e) {
    return '';
  }
}

function getTodayISOKarachi_() {
  return Utilities.formatDate(new Date(), MORNING_BOARD_TZ, 'yyyy-MM-dd');
}

function formatBoardDateLong_(isoDate) {
  var parts = isoDate.split('-');
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  return Utilities.formatDate(d, MORNING_BOARD_TZ, 'EEEE, MMMM d, yyyy');
}

function formatTime12_(time24) {
  var bits = String(time24 || '00:00').split(':');
  var h = Number(bits[0]) || 0;
  var min = Number(bits[1]) || 0;
  var period = h >= 12 ? 'PM' : 'AM';
  var hour12 = h % 12 || 12;
  return hour12 + ':' + (min < 10 ? '0' : '') + min + ' ' + period;
}

/**
 * Meetings tab: Record ID | Date | Time | Title | Location | Agenda | Attendees | Status | Calendar
 */
function getTodaysMeetingsFromSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName('Meetings');
  if (!sh || sh.getLastRow() < 2) return [];

  var today = getTodayISOKarachi_();
  var values = sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(sh.getLastColumn(), 9)).getValues();
  var meetings = [];

  values.forEach(function (row) {
    var date = String(row[1] || '').trim();
    // Sheets may return Date objects
    if (Object.prototype.toString.call(row[1]) === '[object Date]' && !isNaN(row[1].getTime())) {
      date = Utilities.formatDate(row[1], MORNING_BOARD_TZ, 'yyyy-MM-dd');
    }
    if (date !== today) return;

    var status = String(row[7] || '').trim();
    if (status === 'Completed' || status.toLowerCase() === 'cancelled') return;

    var calendarFlag = String(row[8] || '').trim().toLowerCase();
    if (calendarFlag === 'no') return;

    var title = String(row[3] || '').trim();
    if (!title) return;

    var timeVal = row[2];
    var time = '';
    if (Object.prototype.toString.call(timeVal) === '[object Date]' && !isNaN(timeVal.getTime())) {
      time = Utilities.formatDate(timeVal, MORNING_BOARD_TZ, 'HH:mm');
    } else {
      time = String(timeVal || '').trim();
    }

    meetings.push({
      title: title,
      time: time,
      location: String(row[4] || '').trim() || '—',
    });
  });

  meetings.sort(function (a, b) {
    return String(a.time).localeCompare(String(b.time));
  });
  return meetings;
}

function buildMeetingBoardPdfBlob_(dateISO, meetings) {
  var title = formatBoardDateLong_(dateISO);
  var doc = DocumentApp.create('Meeting Board ' + dateISO + ' (temp)');
  var body = doc.getBody();
  body.clear();

  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Total meetings: ' + meetings.length).setSpacingAfter(12);

  var tableData = [['Sr#', 'Meeting', 'Time', 'Venue']];
  meetings.forEach(function (m, i) {
    tableData.push([
      String(i + 1),
      m.title,
      formatTime12_(m.time),
      m.location,
    ]);
  });

  body.appendTable(tableData);
  doc.saveAndClose();

  var file = DriveApp.getFileById(doc.getId());
  var pdfBlob = file.getAs(MimeType.PDF).setName('meeting-board-' + dateISO + '.pdf');
  file.setTrashed(true);
  return { blob: pdfBlob, title: title };
}

function buildMeetingBoardHtml_(dateISO, meetings, boardTitle) {
  var rows = meetings
    .map(function (m, i) {
      return (
        '<tr>' +
        '<td style="padding:8px;border:1px solid #ddd;">' +
        (i + 1) +
        '</td>' +
        '<td style="padding:8px;border:1px solid #ddd;">' +
        m.title +
        '</td>' +
        '<td style="padding:8px;border:1px solid #ddd;">' +
        formatTime12_(m.time) +
        '</td>' +
        '<td style="padding:8px;border:1px solid #ddd;">' +
        m.location +
        '</td>' +
        '</tr>'
      );
    })
    .join('');

  return (
    '<div style="font-family:Helvetica,Arial,sans-serif;color:#111;">' +
    '<h2 style="margin:0 0 8px;">Meeting Board — ' +
    boardTitle +
    '</h2>' +
    '<p style="color:#555;margin:0 0 16px;">Aaj ki ' +
    meetings.length +
    ' meeting' +
    (meetings.length === 1 ? '' : 's') +
    ' — PDF attach hai.</p>' +
    '<table style="border-collapse:collapse;width:100%;max-width:640px;">' +
    '<thead><tr style="background:#1e1e1e;color:#fff;">' +
    '<th style="padding:8px;text-align:left;">#</th>' +
    '<th style="padding:8px;text-align:left;">Meeting</th>' +
    '<th style="padding:8px;text-align:left;">Time</th>' +
    '<th style="padding:8px;text-align:left;">Venue</th>' +
    '</tr></thead><tbody>' +
    rows +
    '</tbody></table>' +
    '<p style="color:#888;font-size:12px;margin-top:24px;">Executive Flow · Auto morning board · ' +
    dateISO +
    '</p></div>'
  );
}

/** Cron / manual: aaj ki meetings ka Meeting Board PDF email. */
function sendMorningMeetingBoard() {
  var to = getMorningBoardEmail_();
  if (!to) {
    Logger.log('No recipient email');
    return { ok: false, error: 'no_email' };
  }

  var dateISO = getTodayISOKarachi_();
  var meetings = getTodaysMeetingsFromSheet_();

  if (!meetings.length) {
    Logger.log('No meetings today (' + dateISO + ') — skip email');
    return { ok: true, skipped: true, dateISO: dateISO };
  }

  var pdf = buildMeetingBoardPdfBlob_(dateISO, meetings);
  var html = buildMeetingBoardHtml_(dateISO, meetings, pdf.title);

  GmailApp.sendEmail(to, 'Meeting Board — ' + pdf.title + ' (' + meetings.length + ')', '', {
    htmlBody: html,
    attachments: [pdf.blob],
    name: 'Executive Flow',
  });

  Logger.log('Sent Meeting Board to ' + to + ' · ' + meetings.length + ' meetings');
  return { ok: true, sent: true, to: to, count: meetings.length, dateISO: dateISO };
}

/** ONE-TIME: 8:00 AM Pakistan daily trigger install. */
function installMorningMeetingBoardTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  existing.forEach(function (t) {
    if (t.getHandlerFunction() === 'sendMorningMeetingBoard') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('sendMorningMeetingBoard')
    .timeBased()
    .atHour(8)
    .nearMinute(5)
    .everyDays(1)
    .inTimezone(MORNING_BOARD_TZ)
    .create();

  Logger.log('Morning Meeting Board trigger installed — 8:00 AM Asia/Karachi');

  try {
    SpreadsheetApp.getUi().alert(
      'Ho gaya!\n\nRoz 8:00 AM (Pakistan) Meeting Board PDF\n' +
        getMorningBoardEmail_() +
        '\npar email hogi.\n\nTest: Run → sendMorningMeetingBoard',
    );
  } catch (e) {
    /* editor without UI */
  }

  return { ok: true, email: getMorningBoardEmail_() };
}

function uninstallMorningMeetingBoardTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendMorningMeetingBoard') {
      ScriptApp.deleteTrigger(t);
    }
  });
  Logger.log('Morning Meeting Board trigger removed');
}

/** Optional: set recipient without editing code */
function setMorningBoardEmail(email) {
  PropertiesService.getScriptProperties().setProperty('MORNING_BOARD_EMAIL', String(email || '').trim());
}
