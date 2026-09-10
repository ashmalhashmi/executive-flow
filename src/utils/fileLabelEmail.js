import { supabase } from '../lib/supabase';
import { buildFileLabelPdfBase64 } from './labelPdf';

/**
 * Email one box/file label as PDF (same as Download PDF) via compose-letter-email
 * (Hobby plan — no extra serverless file).
 */
export async function sendFileLabelPdfEmail({ email, name, ...format }) {
  const to = String(email || '').trim();
  const title = String(name || '').trim();
  if (!title) throw new Error('Name likhein');

  const pdf = await buildFileLabelPdfBase64({ name: title, ...format });

  const headers = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  }

  const res = await fetch('/api/compose-letter-email', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'file_label',
      email: to,
      pdfBase64: pdf.base64,
      filename: pdf.filename,
      name: title,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Email send failed (${res.status})`);
  }
  return data;
}

/** @deprecated use sendFileLabelPdfEmail */
export async function sendFileLabelWordEmail(options) {
  return sendFileLabelPdfEmail(options);
}
