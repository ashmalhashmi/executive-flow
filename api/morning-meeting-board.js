import { createClient } from '@supabase/supabase-js';
import { getTodayISOInTimeZone } from './_lib/karachiDate.js';
import {
  buildMeetingBoardPdfBase64,
  filterMeetingsForBoardDay,
} from './_lib/meetingBoardPdf.js';
import { sendMeetingBoardEmail } from './_lib/sendMeetingBoardEmail.js';
import {
  loadEnvMorningBoardJob,
  loadMorningBoardJobsFromSupabase,
} from './_lib/loadMorningBoardJobs.js';

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

  // No secret configured yet — allow cron-style GET for first-time setup
  if (!secret) return { ok: true, via: 'open-setup' };

  return { ok: false };
}

async function runJob(job, dateISO) {
  const dayMeetings = filterMeetingsForBoardDay(job.meetings, dateISO);
  if (!dayMeetings.length) {
    return {
      email: job.email,
      source: job.source,
      skipped: true,
      reason: 'no_meetings_today',
      dateISO,
    };
  }

  const pdf = buildMeetingBoardPdfBase64({
    dateISO,
    meetings: dayMeetings,
    timeZone: job.timezone || 'Asia/Karachi',
  });

  await sendMeetingBoardEmail({
    to: job.email,
    dateISO,
    meetings: dayMeetings,
    pdfBase64: pdf.base64,
    filename: pdf.filename,
    boardTitle: pdf.title,
  });

  return {
    email: job.email,
    source: job.source,
    sent: true,
    count: dayMeetings.length,
    dateISO,
    filename: pdf.filename,
  };
}

/**
 * Daily cron: GET|POST /api/morning-meeting-board
 * vercel.json: "0 3 * * *" = 08:00 Asia/Karachi
 *
 * Manual test POST body:
 * { email, dateISO?, meetings: [...] }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const timezone = body.timezone || process.env.MEETING_BOARD_TIMEZONE || 'Asia/Karachi';
    const dateISO = body.dateISO || getTodayISOInTimeZone(timezone);

    // Manual / UI: explicit meetings + email — always allowed (private app)
    if (req.method === 'POST' && body.email && Array.isArray(body.meetings)) {
      const result = await runJob(
        {
          source: 'manual',
          email: String(body.email).trim(),
          timezone,
          meetings: body.meetings,
        },
        dateISO,
      );
      return res.status(200).json({ ok: true, dateISO, auth: 'manual', results: [result] });
    }

    const authz = await authorizeCron(req);
    if (!authz.ok) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = [];
    const jobs = [];

    try {
      const cloudJobs = await loadMorningBoardJobsFromSupabase();
      jobs.push(...cloudJobs);
    } catch (err) {
      results.push({ source: 'supabase', error: err.message });
    }

    const seenEmails = new Set(jobs.map((j) => j.email.toLowerCase()));
    const envJob = await loadEnvMorningBoardJob();
    if (envJob && !seenEmails.has(envJob.email.toLowerCase())) {
      jobs.push(envJob);
    }

    if (!jobs.length) {
      return res.status(200).json({
        ok: true,
        dateISO,
        auth: authz.via,
        results: [],
        message:
          'No recipients configured. Sync & Backup → Morning Meeting Board enable karein, aur Save to Cloud. Ya MEETING_BOARD_EMAIL_TO set karein.',
      });
    }

    for (const job of jobs) {
      try {
        results.push(await runJob(job, dateISO));
      } catch (err) {
        results.push({
          email: job.email,
          source: job.source,
          error: err.message || String(err),
        });
      }
    }

    return res.status(200).json({ ok: true, dateISO, timezone, auth: authz.via, results });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Morning board failed' });
  }
}
