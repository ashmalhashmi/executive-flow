const KINDS = new Set(['information', 'action', 'unclear']);

function text(value) {
  return String(value ?? '').trim();
}

export function normalizeCorrespondenceEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const kind = text(entry.letterKind);
  const clear = entry.clear7 && typeof entry.clear7 === 'object' ? entry.clear7 : {};
  const imageRefs = Array.isArray(entry.imageRefs)
    ? entry.imageRefs.map(text).filter(Boolean)
    : [];
  const imageRef = text(entry.imageRef) || imageRefs[0] || '';
  if (imageRef && !imageRefs.includes(imageRef)) imageRefs.unshift(imageRef);
  return {
    id: text(entry.id) || `clr-${Date.now()}`,
    createdAt: text(entry.createdAt) || new Date().toISOString(),
    imageRef,
    imageRefs,
    storageWarning: text(entry.storageWarning),
    examineError: text(entry.examineError),
    subject: text(entry.subject),
    simpleExplanation: text(entry.simpleExplanation),
    background: text(entry.background),
    mainCrux: text(entry.mainCrux),
    requiredAction: text(entry.requiredAction),
    responsibleOfficer: text(entry.responsibleOfficer),
    deadline: text(entry.deadline),
    dgBriefing: text(entry.dgBriefing),
    letterKind: KINDS.has(kind) ? kind : 'unclear',
    clear7: {
      context: text(clear.context),
      link: text(clear.link),
      essence: text(clear.essence),
      authority: text(clear.authority),
      requiredResponse: text(clear.requiredResponse),
      deadline: text(clear.deadline),
      action: text(clear.action),
    },
  };
}

export function normalizeCorrespondenceList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeCorrespondenceEntry).filter(Boolean);
}

export function correspondenceMatchesQuery(entry, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return [
    entry.subject,
    entry.simpleExplanation,
    entry.background,
    entry.mainCrux,
    entry.requiredAction,
    entry.responsibleOfficer,
    entry.dgBriefing,
    entry.clear7?.context,
    entry.clear7?.essence,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q);
}
