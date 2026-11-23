/** Read a short meeting brief or an invitation photo into calendar fields. */

export const MEETING_EXTRACT_SYSTEM_PROMPT = `You turn an operator's short meeting note, or a photo of an invitation, into calendar fields for an office in Pakistan (Asia/Karachi).

Return only the structured fields. Do not invent a place, time, date, or topic that is not in the note or on the image.
- title: the meeting topic, short.
- location: where it is. Empty if unknown.
- time: 24-hour HH:mm. Empty if unknown. "3 baje" in the afternoon is 15:00 unless morning is explicit. "savere / subah" is AM. "shaam" is PM.
- date: YYYY-MM-DD. Empty if the note or image does not give a date. Use the supplied today's date only to resolve words like today, tomorrow, or kal.
- agenda: one or two clear sentences in the same language the operator used (Urdu or English), covering topic, place, and time when those are known.
- attendees: comma-separated names only if they are written. Otherwise empty.`;

export function buildMeetingExtractUserPrompt({ brief = '', todayISO = '' } = {}) {
  const note = String(brief || '').trim();
  const today = String(todayISO || '').trim();
  if (note) {
    return `Today is ${today || 'unknown'}. Operator note:\n${note}`;
  }
  return `Today is ${today || 'unknown'}. Read the attached invitation image and fill the fields from what is printed.`;
}

export function parseMeetingExtractJson(rawText) {
  let data;
  try {
    data = JSON.parse(String(rawText || '').trim());
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const time = String(data.time || '').trim();
  const date = String(data.date || '').trim();
  return {
    title: String(data.title || '').trim(),
    location: String(data.location || '').trim(),
    time: /^\d{2}:\d{2}$/.test(time) ? time : '',
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    agenda: String(data.agenda || '').trim(),
    attendees: String(data.attendees || '').trim(),
  };
}
