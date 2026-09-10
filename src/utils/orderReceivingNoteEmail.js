import { supabase } from '../lib/supabase';
import {
  loadPafdaLetterheadDataUrl,
  loadPafdaLetterheadForWord,
  PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX,
} from './composeLetterheadImage';
import { loadReceivingNoteSignatureForWord } from './receivingNoteSignatureImage';

async function loadLetterheadForEmail() {
  try {
    return await loadPafdaLetterheadForWord();
  } catch {
    const raw = await loadPafdaLetterheadDataUrl();
    return {
      dataUrl: raw,
      width: PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX,
      height: 0,
    };
  }
}

/**
 * Email Receiving Note as Word (.doc) via Resend.
 */
export async function sendReceivingNoteEmail(payload) {
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
  let signatureDataUrl = '';
  let signatureWidth = 0;
  let signatureHeight = 0;

  try {
    const lh = await loadLetterheadForEmail();
    letterheadDataUrl = lh.dataUrl;
    letterheadWidth = lh.width;
    letterheadHeight = lh.height;
  } catch {
    letterheadDataUrl = '';
  }

  try {
    const sig = await loadReceivingNoteSignatureForWord();
    signatureDataUrl = sig.dataUrl;
    signatureWidth = sig.width;
    signatureHeight = sig.height;
  } catch {
    signatureDataUrl = '';
  }

  const res = await fetch('/api/receiving-note-email', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: String(payload.email || '').trim(),
      orderNo: String(payload.orderNo || '').trim(),
      dateISO: String(payload.dateISO || '').trim(),
      vendor: String(payload.vendor || '').trim(),
      statement: String(payload.statement || '').trim(),
      itemsReceived: String(payload.itemsReceived || '').trim(),
      letterheadDataUrl,
      letterheadWidth,
      letterheadHeight,
      signatureDataUrl,
      signatureWidth,
      signatureHeight,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Email send failed (${res.status})`);
  }
  return data;
}
