import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function sheetAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) return null;
  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

function mapSheetMeetingRow(row) {
  // Record ID, Date, Time, Title, Location, Agenda, Attendees, Status, Calendar
  return {
    id: row[0] || '',
    date: String(row[1] || '').trim(),
    time: String(row[2] || '').trim(),
    title: String(row[3] || '').trim(),
    location: String(row[4] || '').trim(),
    agenda: String(row[5] || '').trim(),
    status: String(row[7] || '').trim() || 'Scheduled',
    scheduledViaCalendar: String(row[8] || '').trim().toLowerCase() !== 'no',
  };
}

/** Load meetings from Google Sheets Meetings tab. */
export async function loadMeetingsFromGoogleSheet() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const auth = sheetAuth();
  if (!auth || !spreadsheetId) return null;

  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Meetings!A2:I',
  });
  const values = res.data.values || [];
  return values.map(mapSheetMeetingRow).filter((m) => m.date && m.title);
}

/**
 * Recipients + meetings from Supabase user_app_data payloads
 * where settings.morningMeetingBoard.enabled is true.
 */
export async function loadMorningBoardJobsFromSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from('user_app_data').select('user_id, payload');
  if (error) throw error;

  const jobs = [];
  for (const row of data || []) {
    const payload = row.payload || {};
    const settings = payload.data?.settings?.morningMeetingBoard || payload.settings?.morningMeetingBoard;
    if (!settings?.enabled) continue;
    const email = String(settings.email || '').trim();
    if (!email || !email.includes('@')) continue;
    const meetings = Array.isArray(payload.data?.meetings) ? payload.data.meetings : [];
    jobs.push({
      source: 'supabase',
      userId: row.user_id,
      email,
      timezone: settings.timezone || 'Asia/Karachi',
      meetings,
    });
  }
  return jobs;
}

/**
 * Env-based single recipient job (simple setup without per-user UI sync).
 * Meetings from Sheets if available, else empty (caller may skip).
 */
export async function loadEnvMorningBoardJob() {
  const email = String(process.env.MEETING_BOARD_EMAIL_TO || '').trim();
  if (!email || !email.includes('@')) return null;

  let meetings = [];
  try {
    meetings = (await loadMeetingsFromGoogleSheet()) || [];
  } catch {
    meetings = [];
  }

  return {
    source: 'env',
    email,
    timezone: process.env.MEETING_BOARD_TIMEZONE || 'Asia/Karachi',
    meetings,
  };
}
