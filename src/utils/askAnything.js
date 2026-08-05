/**
 * Ask Anything — plain-language search across all Executive Flow logs (80/20).
 * No category picker: one query → ranked hits + a direct top answer.
 */

import { formatDisplayDate, formatDisplayTime, getTodayISO, addDaysISO } from './dates';
import { formatPKR } from './currency';
import { getContactPhones, getContactEmails, getContactContactNos } from './contactEntries';
import { taskStatusLabel } from './taskEntries';

const DOMAIN_HINTS = [
  {
    tab: 'calendar',
    domain: 'Meetings',
    words: ['meeting', 'meetings', 'appointment', 'calendar', 'visit', 'schedule'],
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

function parseRelativeDate(q) {
  const today = getTodayISO();
  // Voice often says "todays" / "today's" without a clean word break
  if (/\btoday'?s?\b|\baaj\b/.test(q)) return today;
  if (/\btomorrow'?s?\b|\bkal\b/.test(q) && !/\byesterday\b/.test(q)) return addDaysISO(today, 1);
  if (/\byesterday'?s?\b/.test(q)) return addDaysISO(today, -1);
  const iso = q.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  return '';
}

/** Speech quirks: "todays meeting" → searchable plain language */
export function normalizeAskQuery(rawQuery) {
  return String(rawQuery || '')
    .trim()
    .replace(/\btoday['']?s\b/gi, 'today')
    .replace(/\btomorrow['']?s\b/gi, 'tomorrow')
    .replace(/\byesterday['']?s\b/gi, 'yesterday')
    .replace(/\bmeetings?\b/gi, (m) => m.toLowerCase());
}

export function parseAskQuery(rawQuery) {
  const raw = normalizeAskQuery(rawQuery);
  const q = raw.toLowerCase();
  const tabs = DOMAIN_HINTS.filter((d) => includesAny(q, d.words)).map((d) => d.tab);
  const statusHit = STATUS_HINTS.find((s) => includesAny(q, s.words));
  const date = parseRelativeDate(q);

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
  let dateMiss = false;

  if (parsed.tabs.length) {
    const preferred = list.filter((h) => parsed.tabs.includes(h.tab));
    if (preferred.length) list = preferred;
  }

  if (parsed.date) {
    const dated = list.filter((h) => h.date === parsed.date);
    if (dated.length) list = dated;
    else dateMiss = true;
  }

  if (parsed.status) {
    const st = list.filter((h) => h.status === parsed.status);
    if (st.length) list = st;
  }

  // If user asked for a date (e.g. today's meetings) and nothing that day, don't
  // force junk leftover terms like "todays" to zero out the whole search.
  if (dateMiss && parsed.tabs.length) {
    return { ranked: [], dateMiss: true };
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

function buildDirectAnswer(parsed, ranked, dateMiss = false) {
  if (!parsed.raw) {
    return {
      answer: 'Type or speak a question — e.g. “today’s meetings”, “pending tasks”, “contact Ali”.',
      best: null,
      hits: [],
    };
  }

  if (dateMiss) {
    const label =
      parsed.date === getTodayISO()
        ? 'today'
        : parsed.date === addDaysISO(getTodayISO(), 1)
          ? 'tomorrow'
          : parsed.date
            ? formatDisplayDate(parsed.date)
            : 'that day';
    const domain =
      DOMAIN_HINTS.find((d) => parsed.tabs.includes(d.tab))?.domain?.toLowerCase() || 'records';
    return {
      answer: `No ${domain} found for ${label}. Try another day, or open the log to add one.`,
      best: null,
      hits: [],
    };
  }

  if (!ranked.length) {
    return {
      answer: 'Koi match nahi mila. Try simpler words — name, date (today), or log type (task, dak, order).',
      best: null,
      hits: [],
    };
  }

  if (parsed.wantsCount) {
    const domain = ranked[0]?.domain || 'records';
    return {
      answer: `${ranked.length} ${domain.toLowerCase()} match${ranked.length === 1 ? '' : 'es'} your question.`,
      best: ranked[0],
      hits: ranked.slice(0, 8),
    };
  }

  if (parsed.wantsTotal && ranked.every((h) => h.tab === 'expenditure' && h.id !== 'opening-balance')) {
    const total = ranked.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    return {
      answer: `Total matched spend: ${formatPKR(total)} (${ranked.length} entr${ranked.length === 1 ? 'y' : 'ies'}).`,
      best: ranked[0],
      hits: ranked.slice(0, 8),
    };
  }

  const best = ranked[0];
  let answer = best.answerLine;
  if (ranked.length > 1) {
    answer += ` Also ${ranked.length - 1} more related result${ranked.length === 2 ? '' : 's'} below.`;
  }

  return { answer, best, hits: ranked.slice(0, 8) };
}

/** Main entry: plain question → direct answer + sources */
export function askAnything(query, data) {
  const parsed = parseAskQuery(query);
  const corpus = buildAskCorpus(data);
  const { ranked, dateMiss } = filterAndRank(corpus, parsed);
  return buildDirectAnswer(parsed, ranked, dateMiss);
}
