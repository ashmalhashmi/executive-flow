import { supabase } from '../lib/supabase';
import {
  loadPafdaLetterheadDataUrl,
  loadPafdaLetterheadForWord,
  PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX,
} from './composeLetterheadImage';

/**
 * Email Compose letter as Word (.doc) attachment via Resend.
 */
export async function sendComposeLetterEmail(payload) {
  const headers = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  }

  let letterheadDataUrl = '';
  let letterheadWidth = 0;
  let letterheadHeight = 0;
  if (payload.attachPafdaHeader) {
    try {
      const lh = await loadPafdaLetterheadForWord();
      letterheadDataUrl = lh.dataUrl;
      letterheadWidth = lh.width;
      letterheadHeight = lh.height;
    } catch {
      try {
        letterheadDataUrl = await loadPafdaLetterheadDataUrl();
        letterheadWidth = PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX;
        letterheadHeight = 0;
      } catch {
        letterheadDataUrl = '';
      }
    }
  }

  const res = await fetch('/api/compose-letter-email', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: String(payload.email || '').trim(),
      subject: String(payload.subject || '').trim(),
      body: String(payload.body || ''),
      letterNo: String(payload.letterNo || '').trim(),
      letterheadDataUrl,
      letterheadWidth,
      letterheadHeight,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Email send failed (${res.status})`);
  }
  return data;
}
