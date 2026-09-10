/** Compose Desk — letter purposes (Intent → Structure skeletons) */

export const COMPOSE_CORRESPONDENCE_TYPES = [
  {
    id: 'letter',
    label: 'Letter',
    description: 'Outgoing official letter (No., Date, addressee, salutation)',
  },
  {
    id: 'note_sheet',
    label: 'Note Sheet',
    description: 'Internal file noting (facts → proposal → submitted for orders)',
  },
];

export const COMPOSE_PURPOSES = [
  {
    id: 'inform',
    label: 'Inform',
    description: 'Kuch batana / update dena',
  },
  {
    id: 'request',
    label: 'Request',
    description: 'Kuch mangna / action chahiye',
  },
  {
    id: 'reminder',
    label: 'Reminder',
    description: 'Pending cheez yaad dilana',
  },
  {
    id: 'acknowledge',
    label: 'Acknowledge',
    description: 'Receipt / thanks / confirmation',
  },
];

export const COMPOSE_TONES = [
  { id: 'formal', label: 'Formal' },
  { id: 'polite', label: 'Polite' },
  { id: 'firm', label: 'Firm' },
  { id: 'warm', label: 'Warm' },
];

export const COMPOSE_LANGUAGES = [
  { id: 'english', label: 'English' },
  { id: 'bilingual', label: 'English + Roman Urdu notes' },
];

/** Quick chips — fill presentationPreference; user can still edit free text. */
export const COMPOSE_PRESENTATION_PRESETS = [
  {
    id: 'paragraphs',
    label: 'Paragraphs',
    value: 'Short clear paragraphs (default narrative).',
  },
  {
    id: 'numbered',
    label: 'Numbered list',
    value: 'Present core points as a numbered list.',
  },
  {
    id: 'bullets',
    label: 'Bullets',
    value: 'Present core points as bullet points.',
  },
  {
    id: 'table',
    label: 'Table',
    value:
      'Present comparable facts in a plain-text table (columns + rows), not long prose.',
  },
];

export const COMPOSE_REFERENCE_MODES = [
  { id: 'none', label: 'None' },
  { id: 'cite', label: 'Write details (No. + Date)' },
  { id: 'attach', label: 'Attach file only' },
  { id: 'both', label: 'Details + attach' },
];

export const EMPTY_COMPOSE_INTENT = {
  /** letter | note_sheet */
  correspondenceType: 'letter',
  purpose: 'inform',
  letterNo: '',
  addressee: '',
  subject: '',
  coreIdeas: '',
  outcome: '',
  tone: 'polite',
  language: 'english',
  senderName: '',
  /**
   * How to present content inside blueprint body slots
   * (e.g. table, numbered list). Optional free text.
   */
  presentationPreference: '',
  /** none | cite | attach | both */
  referenceMode: 'none',
  referenceLetterNo: '',
  referenceDate: '',
  referenceNote: '',
  /** Attach official PAFDA letterhead image above draft / exports */
  attachPafdaHeader: false,
};
