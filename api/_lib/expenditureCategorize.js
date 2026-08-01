/** Server-only — fixed-category expenditure classifier for Executive Flow. */

export const EXPENDITURE_FIXED_CATEGORIES = [
  'Food',
  'Rent',
  'Entertainment',
  'Transport',
  'Utilities',
  'Healthcare',
  'Shopping',
  'Other',
];

export const EXPENDITURE_CATEGORIZE_SYSTEM_PROMPT = `You are an expenditure categorization engine for Executive Flow (Pakistan executive expense log).

TASK: Read ONE expense description and assign exactly ONE category from the fixed list below.

ALLOWED CATEGORIES (use ONLY these exact strings, case-sensitive):
${EXPENDITURE_FIXED_CATEGORIES.map((c) => `- ${c}`).join('\n')}

RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no commentary.
2. Schema: { "category": "<one of allowed>", "confidence": 0.0-1.0 }
3. NEVER invent a new category name. If unsure, use "Other".
4. Pakistan / Roman Urdu / English mixed text is normal (e.g. petrol refill, ration, bijli bill).
5. Ignore amounts and numbers in the description when categorizing (9388, 5000, etc.).
6. Examples:
   - "petrol refill 9388" → Transport
   - "monthly rent march" → Rent
   - "chai lunch office" → Food
   - "doctor visit medicine" → Healthcare
   - "netflix subscription" → Entertainment
   - "electricity bill lesco" → Utilities
   - "shirt purchase" → Shopping`;

export function buildExpenditureCategorizeUserPrompt(description) {
  return `Categorize this expenditure description:

---
${String(description || '').trim()}
---

Return JSON only.`;
}

export function stripJsonFences(text) {
  let value = String(text || '').trim();
  if (value.startsWith('```')) {
    value = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return value.trim();
}

export function coerceFixedCategory(category) {
  const trimmed = String(category || '').trim();
  if (EXPENDITURE_FIXED_CATEGORIES.includes(trimmed)) return trimmed;
  return 'Other';
}

export function parseCategorizedExpenditureJson(raw) {
  const cleaned = stripJsonFences(raw);
  if (!cleaned) return null;

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const category = coerceFixedCategory(parsed.category);
  const confidence = Number(parsed.confidence);
  return {
    category,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
  };
}

const LOCAL_RULES = [
  { category: 'Rent', pattern: /\b(rent|kiraya|lease)\b/i },
  { category: 'Transport', pattern: /\b(petrol|diesel|fuel|cng|uber|careem|inDrive|taxi|bike|transport|refill)\b/i },
  { category: 'Food', pattern: /\b(chai|lunch|dinner|breakfast|nashta|food|grocery|ration|sabzi|biryani|restaurant|cafe)\b/i },
  { category: 'Utilities', pattern: /\b(bijli|electric|electricity|gas bill|water bill|utility|lesco|ssgc|k-electric|wifi|internet bill)\b/i },
  { category: 'Healthcare', pattern: /\b(doctor|hospital|medicine|pharmacy|clinic|lab test|dental)\b/i },
  { category: 'Shopping', pattern: /\b(shopping|shirt|clothes|shoes|amazon|purchase|mart)\b/i },
  { category: 'Entertainment', pattern: /\b(netflix|movie|cinema|entertainment|subscription|game)\b/i },
];

export function categorizeExpenditureLocally(description) {
  const text = String(description || '').trim();
  if (!text) return null;

  for (const rule of LOCAL_RULES) {
    if (rule.pattern.test(text)) {
      return { category: rule.category, confidence: 0.55, via: 'local' };
    }
  }

  return { category: 'Other', confidence: 0.35, via: 'local' };
}
