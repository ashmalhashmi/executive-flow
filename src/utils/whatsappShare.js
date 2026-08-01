import { formatDisplayTime } from './dates';

/** Safe max before some mobile clients truncate wa.me URLs */
const MAX_MESSAGE_CHARS = 1500;

function formatMeetingDate(dateISO) {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function meetingLocation(meeting) {
  return meeting.location?.trim() || '—';
}

function formatMeetingBlock(meeting) {
  return [
    `📋 ${meeting.title}`,
    `🕐 ${formatDisplayTime(meeting.time)}`,
    `📍 ${meetingLocation(meeting)}`,
  ].join('\n');
}

function truncateMessage(text) {
  if (text.length <= MAX_MESSAGE_CHARS) return text;
  return `${text.slice(0, MAX_MESSAGE_CHARS - 40).trim()}\n\n… (message trimmed)`;
}

/**
 * @param {string} [phoneE164] digits only, e.g. 923001234567 — omit to pick contact in WhatsApp
 */
export function getWhatsAppShareUrl(text, phoneE164) {
  const safe = truncateMessage(text);
  const encoded = encodeURIComponent(safe);
  const digits = phoneE164?.replace(/\D/g, '');
  if (digits) return `https://wa.me/${digits}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}

/** Date, time, location, title — with relevant emojis */
export function buildSingleMeetingWhatsAppMessage(meeting, dateISO) {
  return [`Date: ${formatMeetingDate(dateISO)}`, '', formatMeetingBlock(meeting)].join('\n');
}

/** Ek date, phir har meeting: time, location, title */
export function buildMeetingBoardWhatsAppMessage(dateISO, meetings) {
  const sorted = [...meetings].sort((a, b) => a.time.localeCompare(b.time));
  const lines = [`Date: ${formatMeetingDate(dateISO)}`, ''];

  sorted.forEach((meeting, index) => {
    if (index > 0) lines.push('');
    lines.push(formatMeetingBlock(meeting));
  });

  return lines.join('\n');
}

export function getMeetingBoardWhatsAppUrl(dateISO, meetings, phoneE164) {
  return getWhatsAppShareUrl(buildMeetingBoardWhatsAppMessage(dateISO, meetings), phoneE164);
}

export function getSingleMeetingWhatsAppUrl(meeting, dateISO, phoneE164) {
  return getWhatsAppShareUrl(buildSingleMeetingWhatsAppMessage(meeting, dateISO), phoneE164);
}
