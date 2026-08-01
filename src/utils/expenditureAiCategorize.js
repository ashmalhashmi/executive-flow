import { EXPENDITURE_CATEGORIES, coerceFixedCategory } from '../constants/expenditureCategories';

const LOCAL_RULES = [
  { category: 'Rent', pattern: /\b(rent|kiraya|lease)\b/i },
  { category: 'Transport', pattern: /\b(petrol|diesel|fuel|cng|uber|careem|taxi|bike|transport|refill)\b/i },
  { category: 'Food', pattern: /\b(chai|lunch|dinner|breakfast|nashta|food|grocery|ration|sabzi|biryani|restaurant|cafe)\b/i },
  { category: 'Utilities', pattern: /\b(bijli|electric|electricity|gas bill|water bill|utility|lesco|ssgc|wifi|internet bill)\b/i },
  { category: 'Healthcare', pattern: /\b(doctor|hospital|medicine|pharmacy|clinic|lab test|dental)\b/i },
  { category: 'Shopping', pattern: /\b(shopping|shirt|clothes|shoes|amazon|purchase|mart)\b/i },
  { category: 'Entertainment', pattern: /\b(netflix|movie|cinema|entertainment|subscription|game)\b/i },
];

export function categorizeExpenditureLocally(description) {
  const text = String(description || '').trim();
  if (!text) return null;

  for (const rule of LOCAL_RULES) {
    if (rule.pattern.test(text)) {
      return { category: coerceFixedCategory(rule.category), confidence: 0.55, via: 'local' };
    }
  }

  return { category: 'Other', confidence: 0.35, via: 'local' };
}

export async function categorizeExpenditureWithAi(description) {
  const text = String(description || '').trim();
  if (!text) {
    return { category: 'Other', confidence: 0, via: 'empty' };
  }

  try {
    const res = await fetch('/api/categorize-expenditure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: text }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const local = categorizeExpenditureLocally(text);
      return {
        ...local,
        warning: data.error || 'AI categorize failed — local rules used',
      };
    }

    return {
      category: coerceFixedCategory(data.category),
      confidence: Number(data.confidence) || 0.5,
      via: data.via || 'ai',
      warning: data.warning || '',
    };
  } catch (err) {
    const local = categorizeExpenditureLocally(text);
    return {
      ...local,
      warning: err.message || 'Network error — local rules used',
    };
  }
}

export function isFixedExpenditureCategory(category) {
  return EXPENDITURE_CATEGORIES.includes(coerceFixedCategory(category));
}
