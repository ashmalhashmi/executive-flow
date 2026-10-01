/**
 * PAFDA visitor categories.
 * Primary sectors: Agriculture, Food, Drug.
 * Supporting buckets so almost every contact lands somewhere meaningful.
 */

export const CONTACT_CATEGORY_OTHER = 'other';
/** @deprecated use CONTACT_CATEGORY_OTHER — kept for older imports */
export const CONTACT_CATEGORY_UNASSIGNED = CONTACT_CATEGORY_OTHER;

export const CONTACT_CATEGORIES = [
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'food', label: 'Food' },
  { id: 'drug', label: 'Drug' },
  { id: 'govt', label: 'Govt / Policy' },
  { id: 'lab', label: 'Lab / Certification' },
  { id: 'trade', label: 'Trade / Industry' },
  { id: CONTACT_CATEGORY_OTHER, label: 'Other Stakeholder' },
];

const CATEGORY_IDS = new Set(CONTACT_CATEGORIES.map((c) => c.id));
const LEGACY_UNASSIGNED = new Set(['unassigned', '']);

export const ALL_CATEGORIES_ID = 'all';

export function isValidContactCategory(id) {
  const key = String(id || '').trim();
  if (LEGACY_UNASSIGNED.has(key)) return false;
  return CATEGORY_IDS.has(key);
}

export function getContactCategoryLabel(id) {
  const key = LEGACY_UNASSIGNED.has(String(id || '').trim())
    ? CONTACT_CATEGORY_OTHER
    : String(id || '').trim();
  const found = CONTACT_CATEGORIES.find((c) => c.id === key);
  return found?.label || 'Other Stakeholder';
}

export function getContactCategoryMeta(id) {
  const key = LEGACY_UNASSIGNED.has(String(id || '').trim())
    ? CONTACT_CATEGORY_OTHER
    : String(id || '').trim();
  return (
    CONTACT_CATEGORIES.find((c) => c.id === key) ||
    CONTACT_CATEGORIES.find((c) => c.id === CONTACT_CATEGORY_OTHER)
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

function emailDomains(contact) {
  const emails = Array.isArray(contact?.emails)
    ? contact.emails
    : contact?.email
      ? [contact.email]
      : [];
  return emails
    .map((email) => {
      const at = String(email).toLowerCase().lastIndexOf('@');
      return at >= 0 ? String(email).toLowerCase().slice(at + 1) : '';
    })
    .filter(Boolean);
}

function websiteHost(contact) {
  const raw = String(contact?.website ?? '').trim();
  if (!raw) return '';
  try {
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(href).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return raw.toLowerCase();
  }
}

function scorePatterns(text, patterns) {
  let score = 0;
  for (const re of patterns) {
    re.lastIndex = 0;
    if (re.test(text)) score += 1;
  }
  return score;
}

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
  /\binjection\b/,
  /\bsyrup\b/,
  /\bdrap\b/,
  /\bnarcotic\b/,
  /\bcosmetic\b/,
  /\bdevice\b/,
  /\bhealth product\b/,
  /\bpharmacy\b/,
  /\bchemist\b/,
  /\bbiotech\b/,
  /\bclinical\b/,
  /\bcdsco\b/,
  /\bmhfw\b/,
];

const FOOD_PATTERNS = [
  /\bfood\b/,
  /\bfoods\b/,
  /\bbeverage\b/,
  /\bbeverages\b/,
  /\bdairy\b/,
  /\bmilk\b/,
  /\byogurt\b/,
  /\bflour\b/,
  /\bmills?\b/,
  /\bbakery\b/,
  /\bbiscuit\b/,
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
  /\bnutrition\b/,
  /\bcold storage\b/,
  /\bprocessing\b/,
  /\bprocessor\b/,
  /\bmanufacturer\b/,
  /\bmanufacturing\b/,
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
  /\b\bvet\b/,
  /\banimal\b/,
  /\bfao\b/,
  /\bministry of national food security\b/,
  /\bmnfs(?:&|&amp;| and )?r\b/,
  /\bcultivat/,
  /\bharvest\b/,
  /\borganic\b/,
  /\bgreenhouse\b/,
  /\bnursery\b/,
  /\btractor\b/,
  /\bimplement\b/,
];

const GOVT_PATTERNS = [
  /\bministry\b/,
  /\bgovernment\b/,
  /\bgovt\.?\b/,
  /\bsecretariat\b/,
  /\bfederal\b/,
  /\bprovincial\b/,
  /\bdivision\b/,
  /\bdepartment\b/,
  /\bdept\.?\b/,
  /\bauthority\b/,
  /\bcommission\b/,
  /\bboard\b/,
  /\bdirectorate\b/,
  /\bsecretary\b/,
  /\badditional secretary\b/,
  /\bdeputy secretary\b/,
  /\bsection officer\b/,
  /\bchief secretary\b/,
  /\bcommissioner\b/,
  /\bdistrict\b/,
  /\bassembly\b/,
  /\bparliament\b/,
  /\bcabinet\b/,
  /\bpolicy\b/,
  /\bregulator\b/,
  /\bregulatory\b/,
  /\b\.gov\.pk\b/,
  /\b\.gov\b/,
];

const LAB_PATTERNS = [
  /\blab(?:oratory)?\b/,
  /\bpcsir\b/,
  /\bcertif/,
  /\btesting\b/,
  /\binspection\b/,
  /\binspector\b/,
  /\biso\b/,
  /\baccredit/,
  /\banalysis\b/,
  /\banalyst\b/,
  /\bqc\b/,
  /\bqa\b/,
  /\bquality control\b/,
  /\bquality assurance\b/,
  /\bsampling\b/,
  /\breference lab\b/,
];

const TRADE_PATTERNS = [
  /\bchamber\b/,
  /\bassociation\b/,
  /\bfederation\b/,
  /\bcouncil\b/,
  /\bfpcci\b/,
  /\bapex\b/,
  /\btrader/,
  /\btrading\b/,
  /\bexport/,
  /\bimport/,
  /\bindustr/,
  /\b(pvt|private)\b/,
  /\bltd\.?\b/,
  /\blimited\b/,
  /\bcorp\.?\b/,
  /\bcompany\b/,
  /\benterprises?\b/,
  /\bvendor\b/,
  /\bsupplier\b/,
  /\bcontractor\b/,
  /\bdistributor\b/,
  /\bwholesale\b/,
  /\bretail\b/,
  /\bcommerce\b/,
  /\bbusiness\b/,
  /\bfactory\b/,
  /\bplant\b/,
];

const TIE_ORDER = ['drug', 'food', 'agriculture', 'lab', 'govt', 'trade', 'other'];

/**
 * Infer category — PAFDA sectors first, then supporting buckets.
 * Never returns empty Unassigned: leftover → Other Stakeholder.
 */
export function inferContactCategory(contact) {
  const text = haystackFromContact(contact);
  const domains = emailDomains(contact);
  const host = websiteHost(contact);
  const domainBlob = ` ${domains.join(' ')} ${host} `;

  if (!text.trim() && !domainBlob.trim()) return CONTACT_CATEGORY_OTHER;

  const scores = {
    drug: scorePatterns(text, DRUG_PATTERNS),
    food: scorePatterns(text, FOOD_PATTERNS),
    agriculture: scorePatterns(text, AGRICULTURE_PATTERNS),
    govt: scorePatterns(text, GOVT_PATTERNS) + scorePatterns(domainBlob, [/\.gov(\.[a-z]{2,})?\b/]),
    lab: scorePatterns(text, LAB_PATTERNS),
    trade: scorePatterns(text, TRADE_PATTERNS),
    other: 0,
  };

  if (/\b(drug|pharma|medicine)\b/.test(text) && /\b(ministry|authority|board|dept|department)\b/.test(text)) {
    scores.drug += 2;
  }
  if (/\bfood\b/.test(text) && /\b(ministry|authority|board|dept|department|security)\b/.test(text)) {
    scores.food += 2;
  }
  if (/\bagri/.test(text) && /\b(ministry|department|dept|board|extension)\b/.test(text)) {
    scores.agriculture += 2;
  }

  // Soft defaults when org looks commercial but sector unclear
  const personalMail =
    domains.length > 0 &&
    domains.every((d) => /^(gmail|yahoo|hotmail|outlook|live|icloud)\.com$/.test(d));
  if (scores.trade === 0 && !personalMail && (host || domains.some((d) => /\.(com|pk|biz|co)\b/.test(d)))) {
    scores.trade += 1;
  }
  if (scores.govt === 0 && /\.gov\.pk\b/.test(domainBlob)) {
    scores.govt += 3;
  }

  const ranked = TIE_ORDER.map((id) => ({ id, score: scores[id] || 0 })).sort(
    (a, b) => b.score - a.score || TIE_ORDER.indexOf(a.id) - TIE_ORDER.indexOf(b.id),
  );

  if (ranked[0].score > 0 && ranked[0].id !== 'other') return ranked[0].id;

  // Name/org present but no keyword hit → still a stakeholder
  if (String(contact?.name || '').trim() || String(contact?.department || '').trim()) {
    return CONTACT_CATEGORY_OTHER;
  }

  return CONTACT_CATEGORY_OTHER;
}

/** Resolve stored category — honor manual lock, else re-infer. */
export function resolveContactCategory(contact) {
  const inferred = inferContactCategory(contact);
  const raw = String(contact?.category || '').trim();
  const source =
    contact?.categorySource === 'manual' && isValidContactCategory(raw) ? 'manual' : 'auto';
  const category = source === 'manual' ? raw : inferred;
  return { category, categorySource: source };
}
