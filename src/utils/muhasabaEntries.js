/** Muhasaba (self-accountability) deed logs. */

const CLASSIFICATIONS = new Set(['good', 'bad']);

export function normalizeMuhasabaEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const deedText = String(raw.deedText ?? raw.deed_text ?? '').trim();
  if (!deedText) return null;

  const classification = CLASSIFICATIONS.has(String(raw.classification || '').toLowerCase())
    ? String(raw.classification).toLowerCase()
    : 'good';

  const createdAt = raw.createdAt || raw.created_at || new Date().toISOString();

  return {
    id: raw.id || `muhasaba-${Date.now()}`,
    deedText,
    classification,
    evaluation: String(raw.evaluation ?? '').trim(),
    divineReference: String(raw.divineReference ?? raw.divine_reference ?? '').trim(),
    identityStatement: String(raw.identityStatement ?? raw.identity_statement ?? '').trim(),
    immediateAction: String(raw.immediateAction ?? raw.immediate_action ?? '').trim(),
    isActionCompleted: Boolean(raw.isActionCompleted ?? raw.is_action_completed),
    createdAt,
    updatedAt: raw.updatedAt || raw.updated_at || createdAt,
  };
}

export function normalizeMuhasabaList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeMuhasabaEntry).filter(Boolean);
}
