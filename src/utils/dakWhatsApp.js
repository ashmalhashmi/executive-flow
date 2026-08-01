import { getWhatsAppShareUrl } from './whatsappShare';
import { formatDisplayDate } from './dates';

export function buildDakWhatsAppMessage(entry) {
  const lines = [
    'Dak Issuance',
    '',
    `Subject: ${entry.subject}`,
    `Date (Dispatched): ${formatDisplayDate(entry.forwardedDate)}`,
    `Addressee: ${entry.designation}`,
  ];
  if (entry.receivedDate) {
    lines.push(`Date Received: ${formatDisplayDate(entry.receivedDate)}`);
  }
  if (entry.externalDispatchNo) {
    lines.push(`Official Outward No.: ${entry.externalDispatchNo}`);
  }
  lines.push(`System Ref: ${entry.fileId}`);
  return lines.join('\n');
}

export function getDakWhatsAppUrl(entry, phoneE164) {
  return getWhatsAppShareUrl(buildDakWhatsAppMessage(entry), phoneE164);
}
