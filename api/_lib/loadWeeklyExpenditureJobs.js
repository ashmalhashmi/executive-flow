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

function formatSheetDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value || '').trim();
}

/** Load expenditure payload from Google Sheets Expenditure tab. */
export async function loadExpenditureFromGoogleSheet() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const auth = sheetAuth();
  if (!auth || !spreadsheetId) return null;

  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Expenditure!A1:E',
  });
  const values = res.data.values || [];
  if (!values.length) {
    return { openingBalance: 0, openingBalanceDate: '', expenditures: [] };
  }

  const openingBalance = Number(String(values[0]?.[1] || '').replace(/,/g, '')) || 0;
  const openingBalanceDate = formatSheetDate(values[1]?.[1]);

  // Header at row 6 (index 5): Record ID, Date, Description, Amount, Category
  const expenditures = [];
  for (let i = 6; i < values.length; i += 1) {
    const row = values[i] || [];
    const date = formatSheetDate(row[1]);
    const description = String(row[2] || '').trim();
    const amount = Number(String(row[3] || '').replace(/,/g, '')) || 0;
    const category = String(row[4] || 'Other').trim() || 'Other';
    if (!date && !description) continue;
    expenditures.push({
      id: String(row[0] || `sheet-${i}`),
      date,
      description,
      amount,
      category,
    });
  }

  return { openingBalance, openingBalanceDate, expenditures };
}

export async function loadWeeklyExpenditureJobsFromSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from('user_app_data').select('user_id, payload');
  if (error) throw error;

  const jobs = [];
  for (const row of data || []) {
    const payload = row.payload || {};
    const settings =
      payload.data?.settings?.weeklyExpenditureEmail ||
      payload.settings?.weeklyExpenditureEmail;
    if (!settings?.enabled) continue;
    const email = String(settings.email || '').trim();
    if (!email || !email.includes('@')) continue;

    const expenditure = payload.data?.expenditure || {
      openingBalance: 0,
      openingBalanceDate: '',
      expenditures: [],
    };

    jobs.push({
      source: 'supabase',
      userId: row.user_id,
      email,
      timezone: settings.timezone || 'Asia/Karachi',
      openingBalance: Number(expenditure.openingBalance) || 0,
      openingBalanceDate: String(expenditure.openingBalanceDate || '').trim(),
      expenditures: Array.isArray(expenditure.expenditures) ? expenditure.expenditures : [],
    });
  }
  return jobs;
}

export async function loadEnvWeeklyExpenditureJob() {
  const email = String(
    process.env.WEEKLY_EXPENDITURE_EMAIL_TO || process.env.MEETING_BOARD_EMAIL_TO || '',
  ).trim();
  if (!email || !email.includes('@')) return null;

  let expenditure = { openingBalance: 0, openingBalanceDate: '', expenditures: [] };
  try {
    expenditure = (await loadExpenditureFromGoogleSheet()) || expenditure;
  } catch {
    /* keep empty */
  }

  return {
    source: 'env',
    email,
    timezone: process.env.MEETING_BOARD_TIMEZONE || 'Asia/Karachi',
    openingBalance: expenditure.openingBalance,
    openingBalanceDate: expenditure.openingBalanceDate,
    expenditures: expenditure.expenditures,
  };
}
