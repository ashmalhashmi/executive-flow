import { createClient } from '@supabase/supabase-js';
import {
  getTodayISOInTimeZone,
  getWeekRangeContainingISO,
  isSundayInTimeZone,
} from './_lib/weekRange.js';
import { buildWeeklyExpenditurePdfBase64 } from './_lib/expenditureWeeklyPdf.js';
import { escapeHtml, sendResendPdfEmail } from './_lib/sendResendPdfEmail.js';
import {
  loadEnvWeeklyExpenditureJob,
  loadWeeklyExpenditureJobsFromSupabase,
} from './_lib/loadWeeklyExpenditureJobs.js';

async function authorizeCron(req) {
  const secret = process.env.CRON_SECRET;
  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (secret && bearer === secret) return { ok: true, via: 'cron-secret' };
  if (req.headers['x-vercel-cron'] === '1') return { ok: true, via: 'vercel-cron' };

  if (bearer) {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && anon) {
      const supabase = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase.auth.getUser(bearer);
      if (!error && data?.user) return { ok: true, via: 'user', userId: data.user.id };
    }
  }

  if (!secret) return { ok: true, via: 'open-setup' };
  return { ok: false };
}

async function runJob(job, weekStart, weekEnd) {
  const pdf = buildWeeklyExpenditurePdfBase64({
    expenditures: job.expenditures,
    openingBalance: job.openingBalance,
    openingBalanceDate: job.openingBalanceDate,
    weekStart,
    weekEnd,
  });

  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;color:#111;">
      <h2 style="margin:0 0 8px;">Expenditure Weekly Summary</h2>
      <p style="color:#555;margin:0 0 12px;">Week: <strong>${escapeHtml(pdf.weekLabel)}</strong></p>
      <p style="margin:0 0 8px;">Entries: <strong>${pdf.count}</strong></p>
      <p style="margin:0 0 8px;">Week total: <strong>Rs. ${Math.round(pdf.weekTotal).toLocaleString('en-PK')}</strong></p>
      <p style="margin:0 0 16px;">Closing balance (overall): <strong>Rs. ${Math.round(pdf.closingBalance).toLocaleString('en-PK')}</strong></p>
      <p style="color:#888;font-size:12px;">Executive Flow · Sunday auto summary · PDF attached</p>
    </div>
  `;

  await sendResendPdfEmail({
    to: job.email,
    subject: `Expenditure Weekly Summary — ${pdf.weekLabel}`,
    html,
    filename: pdf.filename,
    pdfBase64: pdf.base64,
  });

  return {
    email: job.email,
    source: job.source,
    sent: true,
    count: pdf.count,
    weekTotal: pdf.weekTotal,
    weekStart,
    weekEnd,
    filename: pdf.filename,
  };
}

/**
 * Sunday weekly expenditure PDF email.
 * vercel.json: "0 16 * * 0" = Sunday 21:00 Asia/Karachi (9:00 PM)
 *
 * Manual POST:
 * { email, expenditures, openingBalance?, openingBalanceDate?, weekStart?, weekEnd?, force?: true }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const timezone = body.timezone || process.env.MEETING_BOARD_TIMEZONE || 'Asia/Karachi';
    const todayISO = body.dateISO || getTodayISOInTimeZone(timezone);
    const range = body.weekStart && body.weekEnd
      ? { weekStart: body.weekStart, weekEnd: body.weekEnd }
      : getWeekRangeContainingISO(todayISO, timezone);

    // Manual / UI test
    if (req.method === 'POST' && body.email && Array.isArray(body.expenditures)) {
      const result = await runJob(
        {
          source: 'manual',
          email: String(body.email).trim(),
          timezone,
          openingBalance: Number(body.openingBalance) || 0,
          openingBalanceDate: String(body.openingBalanceDate || '').trim(),
          expenditures: body.expenditures,
        },
        range.weekStart,
        range.weekEnd,
      );
      return res.status(200).json({ ok: true, ...range, auth: 'manual', results: [result] });
    }

    const authz = await authorizeCron(req);
    if (!authz.ok) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Cron should only run on Sunday unless force=1
    const force = body.force === true || body.force === '1' || req.query?.force === '1';
    if (!force && !isSundayInTimeZone(timezone)) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: 'not_sunday',
        todayISO,
        timezone,
        message: 'Weekly expenditure email sirf Sunday ko chalti hai.',
      });
    }

    const results = [];
    const jobs = [];

    try {
      jobs.push(...(await loadWeeklyExpenditureJobsFromSupabase()));
    } catch (err) {
      results.push({ source: 'supabase', error: err.message });
    }

    const seen = new Set(jobs.map((j) => j.email.toLowerCase()));
    const envJob = await loadEnvWeeklyExpenditureJob();
    if (envJob && !seen.has(envJob.email.toLowerCase())) {
      jobs.push(envJob);
    }

    if (!jobs.length) {
      return res.status(200).json({
        ok: true,
        ...range,
        auth: authz.via,
        results: [],
        message:
          'No recipients. Sync & Backup → Weekly Expenditure Email enable karein + Save to Cloud, ya WEEKLY_EXPENDITURE_EMAIL_TO set karein.',
      });
    }

    for (const job of jobs) {
      try {
        results.push(await runJob(job, range.weekStart, range.weekEnd));
      } catch (err) {
        results.push({
          email: job.email,
          source: job.source,
          error: err.message || String(err),
        });
      }
    }

    return res.status(200).json({
      ok: true,
      ...range,
      todayISO,
      timezone,
      auth: authz.via,
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Weekly expenditure email failed' });
  }
}
