export const EXPENDITURE_CATEGORIES = [
  'Food',
  'Rent',
  'Entertainment',
  'Transport',
  'Utilities',
  'Healthcare',
  'Shopping',
  'Other',
];

export const DEFAULT_EXPENDITURE_CATEGORY = 'Food';

export function coerceFixedCategory(category) {
  const trimmed = String(category || '').trim();
  if (EXPENDITURE_CATEGORIES.includes(trimmed)) return trimmed;
  return 'Other';
}

export function normalizeExpenditureCategory(category) {
  return coerceFixedCategory(category);
}

export function resolveExpenditureCategory(selectValue) {
  return coerceFixedCategory(selectValue);
}

/** Stored value → dropdown (strict: unknown legacy custom → Other) */
export function categorySelectFromStored(storedCategory) {
  return { select: coerceFixedCategory(storedCategory) };
}
