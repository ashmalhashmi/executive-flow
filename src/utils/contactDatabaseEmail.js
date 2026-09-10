import { supabase } from '../lib/supabase';
import { buildContactDatabasePdfBase64 } from './contactDatabasePdf';

/**
 * Email Contact Database PDF (same file as Download PDF) via Resend.
 */
export async function sendContactDatabaseEmail({ email, contacts }) {
  const to = String(email || '').trim();
  const pdf = buildContactDatabasePdfBase64(contacts);
  if (!pdf.count) {
    throw new Error('Email ke liye koi contact nahi');
  }

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
      type: 'contact_database',
      email: to,
      pdfBase64: pdf.base64,
      filename: pdf.filename,
      count: pdf.count,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Email send failed (${res.status})`);
  }
  return data;
}
