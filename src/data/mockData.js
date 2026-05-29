/** @typedef {'Scheduled' | 'SOP Sent' | 'Completed'} MeetingStatus */
/** @typedef {'Delivered' | 'Pending'} SouvenirStatus */

/**
 * Seed data — shared across Dashboard, Meeting Hub, Copilot, and Souvenir Log.
 * Dates use ISO strings (YYYY-MM-DD) relative to a fixed "today" for demos.
 */

const today = new Date();
const fmt = (offsetDays) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

/** @type {Array<{ id: string; title: string; date: string; time: string; agenda: string; attendees: string[]; automateReminders: boolean; status: MeetingStatus }>} */
export const INITIAL_MEETINGS = [
  {
    id: 'mtg-1',
    title: 'Q2 Board Strategy Review',
    date: fmt(0),
    time: '09:30',
    agenda:
      'Review quarterly KPIs, approve budget reallocations, and align on H2 priorities.',
    attendees: ['Sarah Chen', 'Marcus Webb', 'Elena Voss'],
    automateReminders: true,
    status: 'SOP Sent',
  },
  {
    id: 'mtg-2',
    title: 'Partnership — Meridian Capital',
    date: fmt(0),
    time: '14:00',
    agenda:
      'Introductory call with Meridian leadership. Discuss co-investment framework and NDAs.',
    attendees: ['James Okonkwo', 'Priya Nair', 'David Liu'],
    automateReminders: true,
    status: 'Scheduled',
  },
  {
    id: 'mtg-3',
    title: 'Executive Team Stand-up',
    date: fmt(1),
    time: '08:00',
    agenda: 'Weekly sync: blockers, key decisions, and calendar conflicts.',
    attendees: ['Executive Team'],
    automateReminders: false,
    status: 'Scheduled',
  },
  {
    id: 'mtg-4',
    title: 'Client Dinner — Horizon Group',
    date: fmt(2),
    time: '19:00',
    agenda:
      'Relationship dinner. Prepare talking points on expansion and souvenir presentation.',
    attendees: ['Horizon Group — 6 guests'],
    automateReminders: true,
    status: 'Scheduled',
  },
  {
    id: 'mtg-5',
    title: 'Annual Shareholder Briefing',
    date: fmt(-2),
    time: '11:00',
    agenda: 'Post-event debrief and follow-up action items.',
    attendees: ['IR Team', 'Legal'],
    automateReminders: false,
    status: 'Completed',
  },
];

/** @type {Array<{ id: string; itemName: string; recipientName: string; quantity: number; dateDistributed: string; status: SouvenirStatus }>} */
export const INITIAL_SOUVENIRS = [
  {
    id: 'souv-1',
    itemName: 'Executive Crystal Award',
    recipientName: 'Sarah Chen',
    quantity: 1,
    dateDistributed: fmt(-5),
    status: 'Delivered',
  },
  {
    id: 'souv-2',
    itemName: 'Branded Leather Portfolio',
    recipientName: 'Meridian Capital — James Okonkwo',
    quantity: 2,
    dateDistributed: fmt(1),
    status: 'Pending',
  },
  {
    id: 'souv-3',
    itemName: 'Limited Edition Fountain Pen',
    recipientName: 'Horizon Group',
    quantity: 6,
    dateDistributed: fmt(2),
    status: 'Pending',
  },
  {
    id: 'souv-4',
    itemName: 'Artisan Coffee Gift Set',
    recipientName: 'Elena Voss',
    quantity: 1,
    dateDistributed: fmt(-1),
    status: 'Delivered',
  },
  {
    id: 'souv-5',
    itemName: 'Executive Crystal Award',
    recipientName: 'Marcus Webb',
    quantity: 1,
    dateDistributed: fmt(-3),
    status: 'Delivered',
  },
];

/** Inventory for low-stock alerts on the dashboard */
export const INVENTORY_ITEMS = [
  { id: 'inv-1', itemName: 'Executive Crystal Award', stock: 3, threshold: 5 },
  { id: 'inv-2', itemName: 'Branded Leather Portfolio', stock: 12, threshold: 8 },
  { id: 'inv-3', itemName: 'Limited Edition Fountain Pen', stock: 2, threshold: 6 },
  { id: 'inv-4', itemName: 'Artisan Coffee Gift Set', stock: 18, threshold: 10 },
];
