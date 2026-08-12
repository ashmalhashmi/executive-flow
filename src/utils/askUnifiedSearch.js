/**
 * Unified Search — scan all app notebooks (logs) in one query.
 * Analogy: 9 notebooks on desk; one question searches every relevant one.
 */

const NOTEBOOK_LABELS = {
  calendar: 'My Calendar',
  tasks: 'Task Log',
  orders: 'Order Log',
  dak: 'Dak Issuance Log',
  contacts: 'Contact Database',
  expenditure: 'Expenditure Log',
  souvenirs: 'Souvenir Log',
  capture: 'Capture',
};

const NOTEBOOK_ORDER = [
  'calendar',
  'expenditure',
  'tasks',
  'orders',
  'dak',
  'contacts',
  'souvenirs',
  'capture',
];

export function listNotebooksWithData(corpus) {
  const tabs = new Set((corpus || []).map((h) => h.tab));
  return NOTEBOOK_ORDER.filter((t) => tabs.has(t));
}

export function formatNotebooksScanned(tabs) {
  const labels = (tabs || []).map((t) => NOTEBOOK_LABELS[t] || t);
  if (!labels.length) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} +${labels.length - 3} more`;
}

/** Cross-notebook count when user asks kitne without naming one log */
export function tryUnifiedCount(parsed, corpus) {
  if (!parsed.wantsCount || parsed.tabs.length) return null;

  let list = corpus || [];

  if (parsed.date) {
    const dated = list.filter((h) => h.date === parsed.date);
    if (!dated.length) return null;
    list = dated;
  }

  if (parsed.status) {
    const st = list.filter((h) => h.status === parsed.status);
    if (!st.length) return null;
    list = st;
  }

  if (!parsed.date && !parsed.status) return null;

  const byTab = {};
  for (const h of list) {
    byTab[h.tab] = (byTab[h.tab] || 0) + 1;
  }

  const parts = Object.entries(byTab).map(
    ([tab, n]) => `${n} ${NOTEBOOK_LABELS[tab] || tab}`,
  );
  const scanned = listNotebooksWithData(corpus);

  return {
    answer: `Saari notebooks scan kiye — ${parts.join(', ')}.`,
    sectionChecked: formatNotebooksScanned(Object.keys(byTab)),
    best: list[0] || null,
    hits: list.slice(0, 8),
    notebooksScanned: scanned,
  };
}
