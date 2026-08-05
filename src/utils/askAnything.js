/**
 * Ask Anything — Roman Urdu + plain language against live app data only (no Google Sheet).
 * Dedicated section: picks relevant log (e.g. My Calendar) and answers for today strictly.
 */

import { formatDisplayDate, formatDisplayTime, getTodayISO, addDaysISO } from './dates';
import { formatPKR } from './currency';
import { getContactPhones, getContactEmails, getContactContactNos } from './contactEntries';
import { taskStatusLabel } from './taskEntries';

/** App section labels shown in answers — matches sidebar names */
export const ASK_SECTION_LABELS = {
  calendar: 'My Calendar',
  tasks: 'Task Log',
  orders: 'Order Log',
  dak: 'Dak Issuance Log',
  contacts: 'Contact Database',
  expenditure: 'Expenditure Log',
  souvenirs: 'Souvenir Log',
  capture: 'Capture',
};

const DOMAIN_HINTS = [
  {
    tab: 'calendar',
    domain: 'Meetings',
    words: [
      'meeting',
      'meetings',
      'appointment',
      'calendar',
      'visit',
      'schedule',
      'milad',
      'mulakat',
      'mulaqat',
      'milni',
    ],
  },
  {
    tab: 'tasks',
    domain: 'Tasks',
    words: ['task', 'tasks', 'todo', 'to-do', 'kaam'],
  },
  {
    tab: 'orders',
    domain: 'Orders',
    words: ['order', 'orders', 'vendor', 'purchase', 'procurement'],
  },
  {
    tab: 'dak',
    domain: 'Dak',
    words: ['dak', 'dispatch', 'letter', 'issuance', 'outward'],
  },
  {
    tab: 'contacts',
    domain: 'Contacts',
    words: ['contact', 'contacts', 'phone', 'email', 'number', 'call', 'who is'],
  },
  {
    tab: 'expenditure',
    domain: 'Expenditure',
    words: ['expense', 'expenditure', 'spent', 'spend', 'kharcha', 'paisa', 'balance', 'opening'],
  },
  {
    tab: 'souvenirs',
    domain: 'Souvenirs',
    words: ['souvenir', 'souvenirs', 'gift', 'presentation'],
  },
  {
    tab: 'capture',
    domain: 'Capture',
    words: ['capture', 'inbox', 'note', 'notes', 'brain'],
  },
];

const STATUS_HINTS = [
  { status: 'pending', words: ['pending', 'active', 'open', 'incomplete'] },
  { status: 'done', words: ['done', 'completed', 'complete', 'finished'] },
  { status: 'cancelled', words: ['cancelled', 'canceled', 'cancel'] },
  { status: 'received', words: ['received', 'delivered'] },
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'what',
  'when',
  'where',
  'who',
  'which',
  'how',
  'much',
  'many',
  'my',
  'our',
  'me',
  'i',
  'please',
  'show',
  'find',
  'tell',
  'about',
  'for',
  'of',
  'to',
  'in',
  'on',
  'at',
  'and',
  'or',
  'with',
  'from',
  'do',
  'does',
  'did',
  'any',
  'all',
  'list',
  'hai',
  'hain',
  'ha',
  'ho',
  'hu',
  'hun',
  'koi',
  'kya',
  'kon',
  'kaun',
  'kab',
  'kitna',
  'kitne',
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9@.+]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function includesAny(haystack, words) {
  return words.some((w) => haystack.includes(w));
}

/** Straight and curly apostrophes — speech and mobile keyboards mix them. */
const APOSTROPHE = "['\u2018\u2019\u02BC]";

function relativeDayRegex(word) {
  return new RegExp(`\\b${word}${APOSTROPHE}?s?\\b`, 'i');
}

function parseRelativeDate(q) {
  const today = getTodayISO();
  if (relativeDayRegex('today').test(q) || /\baaj\b/.test(q)) return today;
  if (relativeDayRegex('yesterday').test(q)) return addDaysISO(today, -1);
  if (relativeDayRegex('tomorrow').test(q) || /\bkal\b/.test(q)) return addDaysISO(today, 1);
  const iso = q.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  return '';
}

/** Roman Urdu typing quirks → searchable plain words */
export function normalizeAskQuery(rawQuery) {
  let q = String(rawQuery || '').trim().toLowerCase();
  q = q.replace(/\baj\b/g, 'aaj');
  q = q.replace(/\bkl\b/g, 'kal');
  q = q.replace(new RegExp(`\\btoday${APOSTROPHE}?s\\b`, 'gi'), 'today');
  q = q.replace(new RegExp(`\\btomorrow${APOSTROPHE}?s\\b`, 'gi'), 'tomorrow');
  q = q.replace(new RegExp(`\\byesterday${APOSTROPHE}?s\\b`, 'gi'), 'yesterday');
  return q.replace(/\s+/g, ' ').trim();
}

export function parseAskQuery(rawQuery) {
  const raw = normalizeAskQuery(rawQuery);
  const q = raw.toLowerCase();
  const tabs = DOMAIN_HINTS.filter((d) => includesAny(q, d.words)).map((d) => d.tab);
  const statusHit = STATUS_HINTS.find((s) => includesAny(q, s.words));
  const date = parseRelativeDate(q) || inferTodayWhenMeetingAsked(q, tabs);

  let terms = tokenize(raw);
  for (const d of DOMAIN_HINTS) {
    terms = terms.filter((t) => !d.words.includes(t));
  }
  for (const s of STATUS_HINTS) {
    terms = terms.filter((t) => !s.words.includes(t));
  }
  terms = terms.filter(
    (t) =>
      !['today', 'todays', 'tomorrow', 'tomorrows', 'yesterday', 'yesterdays', 'aaj', 'kal'].includes(
        t,
      ),
  );

  return {
    raw,
    tabs,
    status: statusHit?.status || '',
    date,
    terms,
    wantsCount: /\b(how many|count|kitne|kitni)\b/.test(q),
    wantsTotal: /\b(how much|total|sum|kitna)\b/.test(q),
  };
}

function dateLabel(isoDate) {
  const today = getTodayISO();
  if (isoDate === today) return 'today';
  if (isoDate === addDaysISO(today, 1)) return 'tomorrow';
  if (isoDate === addDaysISO(today, -1)) return 'yesterday';
  return isoDate ? formatDisplayDate(isoDate) : 'that day';
}

function domainWord(domain, count) {
  const word = String(domain || 'records').toLowerCase();
  return count === 1 ? word.replace(/s$/, '') : word;
}

function scoreText(haystack, terms) {
  if (!terms.length) return 0;
  const h = String(haystack || '').toLowerCase();
  let score = 0;
  for (const t of terms) {
    if (h.includes(t)) score += t.length >= 4 ? 3 : 2;
  }
  return score;
}

function pushHit(hits, hit) {
  if (!hit?.id) return;
  hits.push(hit);
}

export function buildAskCorpus({
  meetings = [],
  tasks = [],
  orders = [],
  dak = [],
  contacts = [],
  expenditures = [],
  souvenirs = [],
  captures = [],
  expenditureOpeningBalance = 0,
  expenditureOpeningBalanceDate = '',
}) {
  const hits = [];

  for (const m of meetings) {
    if (m.status === 'Cancelled' || m.status === 'cancelled') {
      /* still searchable */
    }
    const title = m.title || 'Meeting';
    const when = [m.date, m.time].filter(Boolean).join(' ');
    pushHit(hits, {
      id: m.id,
      tab: 'calendar',
      domain: 'Meetings',
      title,
      snippet: [formatDisplayDate(m.date), m.time ? formatDisplayTime(m.time) : '', m.location, m.status]
        .filter(Boolean)
        .join(' · '),
      answerLine: `${title} on ${formatDisplayDate(m.date)}${m.time ? ` at ${formatDisplayTime(m.time)}` : ''}${
        m.location ? ` (${m.location})` : ''
      }.`,
      searchText: [title, m.location, m.agenda, (m.attendees || []).join(' '), m.status, when].join(' '),
      date: m.date || '',
      status: String(m.status || '').toLowerCase(),
    });
  }

  for (const t of tasks) {
    pushHit(hits, {
      id: t.id,
      tab: 'tasks',
      domain: 'Tasks',
      title: t.title,
      snippet: [formatDisplayDate(t.date), t.time ? formatDisplayTime(t.time) : '', taskStatusLabel(t.status)]
        .filter(Boolean)
        .join(' · '),
      answerLine: `Task “${t.title}” is ${taskStatusLabel(t.status).toLowerCase()} — ${formatDisplayDate(t.date)} ${
        t.time ? formatDisplayTime(t.time) : ''
      }.`.trim(),
      searchText: [t.title, t.status, t.date, t.time].join(' '),
      date: t.date || '',
      status: t.status === 'active' ? 'pending' : t.status,
    });
  }

  for (const o of orders) {
    const status =
      o.status === 'received' ? 'received' : o.status === 'cancelled' ? 'cancelled' : 'pending';
    pushHit(hits, {
      id: o.id,
      tab: 'orders',
      domain: 'Orders',
      title: o.item || o.orderNumber || 'Order',
      snippet: [o.orderNumber, o.vendor, formatDisplayDate(o.placedDate), status].filter(Boolean).join(' · '),
      answerLine: `Order ${o.orderNumber || ''} “${o.item}” from ${o.vendor || '—'} is ${status}${
        o.placedDate ? ` (placed ${formatDisplayDate(o.placedDate)})` : ''
      }.`.replace(/\s+/g, ' '),
      searchText: [o.orderNumber, o.item, o.vendor, o.status, o.placedDate].join(' '),
      date: o.placedDate || '',
      status,
    });
  }

  for (const d of dak) {
    pushHit(hits, {
      id: d.id,
      tab: 'dak',
      domain: 'Dak',
      title: d.subject,
      snippet: [d.fileId, d.designation, formatDisplayDate(d.forwardedDate)].filter(Boolean).join(' · '),
      answerLine: `Dak “${d.subject}” to ${d.designation} (${d.fileId}) on ${formatDisplayDate(
        d.forwardedDate,
      )}.`,
      searchText: [d.subject, d.designation, d.fileId, d.externalDispatchNo, d.forwardedDate].join(' '),
      date: d.forwardedDate || '',
      status: d.status === 'cancelled' ? 'cancelled' : 'pending',
    });
  }

  for (const c of contacts) {
    if (c.status === 'archived') continue;
    const phones = getContactPhones(c);
    const emails = getContactEmails(c);
    const offices = getContactContactNos(c);
    pushHit(hits, {
      id: c.id,
      tab: 'contacts',
      domain: 'Contacts',
      title: c.name,
      snippet: [c.department || c.designation, phones[0], emails[0]].filter(Boolean).join(' · '),
      answerLine: `${c.name}${c.designation ? ` (${c.designation})` : ''}${
        phones[0] ? ` — ${phones[0]}` : ''
      }${emails[0] ? ` — ${emails[0]}` : ''}.`,
      searchText: [
        c.name,
        c.department,
        c.designation,
        c.address,
        ...phones,
        ...emails,
        ...offices,
      ].join(' '),
      date: '',
      status: 'pending',
    });
  }

  for (const e of expenditures) {
    pushHit(hits, {
      id: e.id,
      tab: 'expenditure',
      domain: 'Expenditure',
      title: e.description || 'Expense',
      snippet: [formatDisplayDate(e.date), e.category, formatPKR(e.amount)].filter(Boolean).join(' · '),
      answerLine: `Expense “${e.description}” ${formatPKR(e.amount)} on ${formatDisplayDate(e.date)} (${
        e.category || 'Other'
      }).`,
      searchText: [e.description, e.category, e.date, String(e.amount)].join(' '),
      date: e.date || '',
      status: 'pending',
      amount: Number(e.amount) || 0,
    });
  }

  if (expenditureOpeningBalance > 0 || expenditureOpeningBalanceDate) {
    pushHit(hits, {
      id: 'opening-balance',
      tab: 'expenditure',
      domain: 'Expenditure',
      title: 'Opening balance',
      snippet: [
        formatPKR(expenditureOpeningBalance),
        expenditureOpeningBalanceDate
          ? `from ${formatDisplayDate(expenditureOpeningBalanceDate)}`
          : '',
      ]
        .filter(Boolean)
        .join(' · '),
      answerLine: `Opening balance is ${formatPKR(expenditureOpeningBalance)}${
        expenditureOpeningBalanceDate
          ? ` effective from ${formatDisplayDate(expenditureOpeningBalanceDate)}`
          : ''
      }.`,
      searchText: `opening balance ${expenditureOpeningBalance} ${expenditureOpeningBalanceDate}`,
      date: expenditureOpeningBalanceDate || '',
      status: 'pending',
    });
  }

  for (const s of souvenirs) {
    const detail = s.detail || s.itemName || s.rawPresentationText || '';
    const title = s.meetingTitle || detail || 'Souvenir';
    pushHit(hits, {
      id: s.id,
      tab: 'souvenirs',
      domain: 'Souvenirs',
      title,
      snippet: [detail, formatDisplayDate(s.dateDistributed)].filter(Boolean).join(' · '),
      answerLine: `Souvenir for ${s.meetingTitle || 'meeting'}: ${detail || '—'} (${formatDisplayDate(
        s.dateDistributed,
      )}).`,
      searchText: [s.meetingTitle, detail, s.itemName, s.dateDistributed, s.recipientName].join(' '),
      date: s.dateDistributed || '',
      status: String(s.status || '').toLowerCase() || 'pending',
    });
  }

  for (const c of captures) {
    if (c.status === 'done') {
      /* still searchable */
    }
    pushHit(hits, {
      id: c.id,
      tab: 'capture',
      domain: 'Capture',
      title: (c.text || '').slice(0, 60) || 'Capture note',
      snippet: [c.bucket, c.status].filter(Boolean).join(' · '),
      answerLine: `Capture note: “${(c.text || '').slice(0, 120)}”.`,
      searchText: [c.text, c.bucket, c.status].join(' '),
      date: '',
      status: c.status === 'done' ? 'done' : 'pending',
    });
  }

  return hits;
}

function filterAndRank(corpus, parsed) {
  let list = corpus;

  if (parsed.tabs.length) {
    const preferred = list.filter((h) => parsed.tabs.includes(h.tab));
    if (preferred.length) list = preferred;
  }

  // "today" must mean today. A date in the question is a hard filter: never fall
  // back to older records, otherwise a free day looks like a busy one.
  if (parsed.date) {
    list = list.filter((h) => h.date === parsed.date);
    if (!list.length) return { ranked: [], dateMiss: true };
  }

  if (parsed.status) {
    const st = list.filter((h) => h.status === parsed.status);
    if (st.length) list = st;
  }

  const ranked = list
    .map((h) => {
      let score = scoreText(h.searchText, parsed.terms);
      if (parsed.tabs.includes(h.tab)) score += 2;
      if (parsed.date && h.date === parsed.date) score += 4;
      if (parsed.status && h.status === parsed.status) score += 3;
      if (!parsed.terms.length && (parsed.tabs.length || parsed.date || parsed.status)) {
        score += 1;
      }
      return { ...h, score };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)));

  return { ranked, dateMiss: false };
}

function inferTodayWhenMeetingAsked(q, tabs) {
  if (!tabs.includes('calendar')) return '';
  if (/\baaj\b|\btoday\b/.test(q)) return getTodayISO();
  return '';
}

function sectionLabel(tab) {
  return ASK_SECTION_LABELS[tab] || tab || 'relevant section';
}

function buildDirectAnswer(parsed, ranked, dateMiss = false) {
  if (!parsed.raw) {
    return {
      answer:
        'Roman Urdu ya English mein likhein — maslan “aj meeting ha koi?” Sirf app ka live data check hota hai.',
      sectionChecked: '',
      best: null,
      hits: [],
    };
  }

  const primaryTab = parsed.tabs[0] || ranked[0]?.tab || '';
  const sectionChecked = primaryTab ? sectionLabel(primaryTab) : '';

  if (dateMiss) {
    const today = getTodayISO();
    if (parsed.date === today && parsed.tabs.includes('calendar')) {
      return {
        answer: 'mene relevant section check kia ha aj koi meeting ni ha',
        sectionChecked: 'My Calendar',
        best: null,
        hits: [],
      };
    }

    const domain = domainWord(
      DOMAIN_HINTS.find((d) => parsed.tabs.includes(d.tab))?.domain || 'records',
      1,
    );
    const label = dateLabel(parsed.date);
    const checked = sectionChecked || 'relevant section';
    return {
      answer:
        label === 'today'
          ? `mene ${checked} check kia ha — aaj koi ${domain} nahi.`
          : `${checked} check kia — ${label} koi ${domain} nahi.`,
      sectionChecked: checked,
      best: null,
      hits: [],
    };
  }

  if (!ranked.length) {
    return {
      answer:
        'Koi match nahi mila. Roman Urdu try karein — “aj meeting ha koi?”, “pending tasks”, “contact Ali”.',
      sectionChecked: sectionChecked || '',
      best: null,
      hits: [],
    };
  }

  if (parsed.wantsCount) {
    const domain = ranked[0]?.domain || 'records';
    return {
      answer: `${sectionChecked || domain} check kia — ${ranked.length} match${ranked.length === 1 ? '' : 'es'}.`,
      sectionChecked: sectionChecked || sectionLabel(ranked[0]?.tab),
      best: ranked[0],
      hits: ranked.slice(0, 8),
    };
  }

  if (parsed.wantsTotal && ranked.every((h) => h.tab === 'expenditure' && h.id !== 'opening-balance')) {
    const total = ranked.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    return {
      answer: `${sectionChecked || 'Expenditure Log'} check kia — total ${formatPKR(total)} (${ranked.length} entr${ranked.length === 1 ? 'y' : 'ies'}).`,
      sectionChecked: sectionChecked || 'Expenditure Log',
      best: ranked[0],
      hits: ranked.slice(0, 8),
    };
  }

  const best = ranked[0];
  const checked = sectionLabel(best.tab);
  let answer = best.answerLine;

  if (parsed.date && best.tab === 'calendar') {
    const count = ranked.length;
    answer =
      count === 1
        ? `My Calendar check kia — aj 1 meeting: ${best.answerLine}`
        : `My Calendar check kia — aj ${count} meetings. Pehli: ${best.answerLine}`;
  } else if (parsed.date) {
    answer = `${checked} check kia — ${ranked.length} ${domainWord(best.domain, ranked.length)} ${dateLabel(parsed.date)}: ${best.answerLine}`;
  } else {
    answer = `${checked} check kia — ${best.answerLine}`;
    if (ranked.length > 1) {
      answer += ` Aur ${ranked.length - 1} related result${ranked.length === 2 ? '' : 's'} neeche.`;
    }
  }

  return {
    answer,
    sectionChecked: checked,
    best,
    hits: ranked.slice(0, 8),
  };
}

/** Main entry: plain question → direct answer + sources */
export function askAnything(query, data) {
  const parsed = parseAskQuery(query);
  const corpus = buildAskCorpus(data);
  const { ranked, dateMiss } = filterAndRank(corpus, parsed);
  return buildDirectAnswer(parsed, ranked, dateMiss);
}
