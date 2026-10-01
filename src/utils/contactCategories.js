/** PAFDA-relevant external visitor categories — Agriculture, Food, Drug. */

export const CONTACT_CATEGORY_UNASSIGNED = 'unassigned';

export const CONTACT_CATEGORIES = [
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'food', label: 'Food' },
  { id: 'drug', label: 'Drug' },
  { id: CONTACT_CATEGORY_UNASSIGNED, label: 'Unassigned' },
];

const CATEGORY_IDS = new Set(CONTACT_CATEGORIES.map((c) => c.id));

export const ALL_CATEGORIES_ID = 'all';

export function isValidContactCategory(id) {
  return CATEGORY_IDS.has(String(id || '').trim());
}

export function getContactCategoryLabel(id) {
  const found = CONTACT_CATEGORIES.find((c) => c.id === id);
  return found?.label || CONTACT_CATEGORIES.find((c) => c.id === CONTACT_CATEGORY_UNASSIGNED).label;
}

export function getContactCategoryMeta(id) {
  return (
    CONTACT_CATEGORIES.find((c) => c.id === id) ||
    CONTACT_CATEGORIES.find((c) => c.id === CONTACT_CATEGORY_UNASSIGNED)
  );
}

function haystackFromContact(contact) {
  const emails = Array.isArray(contact?.emails)
    ? contact.emails
    : contact?.email
      ? [contact.email]
      : [];
  const parts = [
    contact?.department,
    contact?.designation,
    contact?.name,
    contact?.website,
    contact?.address,
    ...emails,
  ];
  return parts
    .map((p) => String(p ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join(' | ');
}

function scorePatterns(text, patterns) {
  let score = 0;
  for (const re of patterns) {
    re.lastIndex = 0;
    if (re.test(text)) score += 1;
  }
  return score;
}

/** Keyword banks tuned for PAFDA visitor cards / org names. */
const DRUG_PATTERNS = [
  /\bdrug\b/,
  /\bdrugs\b/,
  /\bpharma/,
  /\bpharmaceutical/,
  /\bmedicine\b/,
  /\bmedicines\b/,
  /\bmedical\b/,
  /\bhospital\b/,
  /\bclinic\b/,
  /\bapi\b/,
  /\bformulation\b/,
  /\btherapeutic\b/,
  /\bvaccine\b/,
  /\bantibiotic\b/,
  /\bcapsule\b/,
  /\btablet\b/,
  /\bdrap\b/,
  /\bnarcotic\b/,
  /\bcosmetic\b/,
  /\bdevice\b/,
  /\bhealth product\b/,
  /\bwho\b/,
  /\bdg drug\b/,
  /\bpharmacy\b/,
  /\bchemist\b/,
];

const FOOD_PATTERNS = [
  /\bfood\b/,
  /\bfoods\b/,
  /\bbeverage\b/,
  /\bbeverages\b/,
  /\bdairy\b/,
  /\bmilk\b/,
  /\bflour\b/,
  /\bmills?\b/,
  /\bbakery\b/,
  /\bsugar\b/,
  /\boil\b/,
  /\bghee\b/,
  /\bspice\b/,
  /\bspices\b/,
  /\bsnack\b/,
  /\bjuice\b/,
  /\bwater\b/,
  /\bbottl/,
  /\bpackaging\b/,
  /\brestaurant\b/,
  /\bcatering\b/,
  /\bhalal\b/,
  /\bmeat\b/,
  /\bpoultry\b/,
  /\bfish\b/,
  /\bseafood\b/,
  /\bconfection/,
  /\bchocolate\b/,
  /\btea\b/,
  /\bcoffee\b/,
  /\bnfs[as]\b/,
  /\bfood security\b/,
  /\bfood authority\b/,
  /\bpunjab food\b/,
  /\bfs[aq]\b/,
  /\bcodex\b/,
  /\bhotel\b/,
  /\bcanteen\b/,
  /\bedible\b/,
];

const AGRICULTURE_PATTERNS = [
  /\bagri/,
  /\bagriculture\b/,
  /\bagricultural\b/,
  /\bfarm\b/,
  /\bfarmer\b/,
  /\bfarming\b/,
  /\bcrop\b/,
  /\bcrops\b/,
  /\bseed\b/,
  /\bseeds\b/,
  /\bfertilizer\b/,
  /\bfertiliser\b/,
  /\bpesticide\b/,
  /\bpesticides\b/,
  /\binsecticide\b/,
  /\bherbicide\b/,
  /\blivestock\b/,
  /\bcattle\b/,
  /\bpoultry farm\b/,
  /\bhatchery\b/,
  /\birrigation\b/,
  /\bhorticultur/,
  /\borchard\b/,
  /\bcotton\b/,
  /\bwheat\b/,
  /\brice\b/,
  /\bmaize\b/,
  /\bsugarcane\b/,
  /\bparc\b/,
  /\bnarc\b/,
  /\bextension\b/,
  /\bplant protection\b/,
  /\bquarantine\b/,
  /\bsoil\b/,
  /\bveterinary\b/,
  /\bvet\b/,
  /\banimal\b/,
  /\bfao\b/,
  /\bministry of national food security\b/,
  /\bmnfs(?:&|&amp;| and )?r\b/,
];

/**
 * Infer PAFDA sector from org / designation / email / website text.
 * Highest keyword score wins; Drug > Food > Agriculture on ties.
 */
export function inferContactCategory(contact) {
  const text = haystackFromContact(contact);
  if (!text.trim()) return CONTACT_CATEGORY_UNASSIGNED;

  const scores = {
    drug: scorePatterns(text, DRUG_PATTERNS),
    food: scorePatterns(text, FOOD_PATTERNS),
    agriculture: scorePatterns(text, AGRICULTURE_PATTERNS),
  };

  // Light boosts for clear ministry / authority names
  if (/\b(drug|pharma|medicine)\b/.test(text) && /\b(ministry|authority|board|dept|department)\b/.test(text)) {
    scores.drug += 2;
  }
  if (/\bfood\b/.test(text) && /\b(ministry|authority|board|dept|department|security)\b/.test(text)) {
    scores.food += 2;
  }
  if (/\bagri/.test(text) && /\b(ministry|department|dept|board|extension)\b/.test(text)) {
    scores.agriculture += 2;
  }

  const ranked = [
    { id: 'drug', score: scores.drug },
    { id: 'food', score: scores.food },
    { id: 'agriculture', score: scores.agriculture },
  ].sort((a, b) => b.score - a.score || ['drug', 'food', 'agriculture'].indexOf(a.id) - ['drug', 'food', 'agriculture'].indexOf(b.id));

  if (ranked[0].score <= 0) return CONTACT_CATEGORY_UNASSIGNED;
  return ranked[0].id;
}

/** Resolve stored category — honor manual lock, else re-infer. */
export function resolveContactCategory(contact) {
  const inferred = inferContactCategory(contact);
  const source =
    contact?.categorySource === 'manual' && isValidContactCategory(contact?.category)
      ? 'manual'
      : 'auto';
  const category = source === 'manual' ? String(contact.category).trim() : inferred;
  return { category, categorySource: source };
}
