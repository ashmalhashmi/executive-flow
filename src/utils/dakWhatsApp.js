import { getWhatsAppShareUrl } from './whatsappShare';
import { formatDisplayDate } from './dates';

export function buildDakWhatsAppMessage(entry) {
  const lines = [
    'Dak Issuance',
    '',
    entry.registerSr ? `Sr#: ${entry.registerSr}` : '',
    `Subject: ${entry.subject}`,
    `Date (Dispatched): ${formatDisplayDate(entry.forwardedDate)}`,
    `Marked To: ${entry.designation}`,
  ].filter(Boolean);
  if (entry.receivedDate) {
    lines.push(`Date Received: ${formatDisplayDate(entry.receivedDate)}`);
  }
  return lines.join('\n');
}

export function getDakWhatsAppUrl(entry, phoneE164) {
  return getWhatsAppShareUrl(buildDakWhatsAppMessage(entry), phoneE164);
}
