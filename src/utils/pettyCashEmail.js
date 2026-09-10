import {
  loadPafdaLetterheadDataUrl,
  loadPafdaLetterheadForWord,
  PAFDA_LETTERHEAD_WORD_MAX_WIDTH_PX,
} from './composeLetterheadImage';
import { loadReceivingNoteSignatureForWord } from './receivingNoteSignatureImage';
import {
  buildPurchaseSlipDocHtml,
  buildSatisfactoryNoteDocHtml,
  buildRefreshmentReceivingDocHtml,
  downloadWordHtml,
} from './pettyCashDocHtml';
import { supabase } from '../lib/supabase';

async function loadLetterheadForWord() {
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

async function loadSignatureForWord() {
  try {
    return await loadReceivingNoteSignatureForWord();
  } catch {
    return { dataUrl: '', width: 0, height: 0 };
  }
}

export async function downloadPurchaseSlipWord(caseRecord, signatories, approverSignatory) {
  const lh = await loadLetterheadForWord();
  const html = buildPurchaseSlipDocHtml({
    purchaseSlip: caseRecord.purchaseSlip,
    letterheadDataUrl: lh.dataUrl,
    letterheadWidth: lh.width,
    letterheadHeight: lh.height,
    signatories,
    approverSignatory,
  });
  downloadWordHtml(html, `purchase-slip-${caseRecord.caseNo}.doc`);
}

export async function downloadSatisfactoryNoteWord(caseRecord, signatories, sectionHeadSignatory) {
  const lh = await loadLetterheadForWord();
  const html = buildSatisfactoryNoteDocHtml({
    satisfactoryNote: caseRecord.satisfactoryNote,
    letterheadDataUrl: lh.dataUrl,
    letterheadWidth: lh.width,
    letterheadHeight: lh.height,
    signatories,
    sectionHeadSignatory,
  });
  downloadWordHtml(html, `satisfactory-note-${caseRecord.caseNo}.doc`);
}

export async function downloadRefreshmentReceivingWord(noteRecord, issuerSignatory) {
  const lh = await loadLetterheadForWord();
  const sig = await loadSignatureForWord();
  const html = buildRefreshmentReceivingDocHtml({
    noteNo: noteRecord.noteNo,
    meetingTitle: noteRecord.meetingTitle,
    meetingDate: noteRecord.meetingDate,
    note: noteRecord,
    letterheadDataUrl: lh.dataUrl,
    letterheadWidth: lh.width,
    letterheadHeight: lh.height,
    issuerSignatory,
    signatureDataUrl: sig.dataUrl,
    signatureWidth: sig.width,
    signatureHeight: sig.height,
  });
  downloadWordHtml(html, `refreshment-receiving-${noteRecord.noteNo}.doc`);
}

export async function sendPettyCashEmail({ email, docType, payload }) {
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
    const lh = await loadLetterheadForWord();
    letterheadDataUrl = lh.dataUrl;
    letterheadWidth = lh.width;
    letterheadHeight = lh.height;
  } catch {
    /* optional */
  }

  try {
    if (docType === 'refreshment_receiving') {
      const sig = await loadSignatureForWord();
      signatureDataUrl = sig.dataUrl;
      signatureWidth = sig.width;
      signatureHeight = sig.height;
    }
  } catch {
    /* optional */
  }

  const res = await fetch('/api/petty-cash-email', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: String(email || '').trim(),
      docType,
      payload,
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
