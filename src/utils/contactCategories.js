/** External-visitor category buckets inferred from existing contact fields. */

export const CONTACT_CATEGORY_UNASSIGNED = 'unassigned';

export const CONTACT_CATEGORIES = [
  { id: 'govt', label: 'Govt / Ministry' },
  { id: 'association', label: 'Association / Chamber' },
  { id: 'industry', label: 'Industry / Exporter' },
  { id: 'lab', label: 'Lab / Certification' },
  { id: 'diplomatic', label: 'Diplomatic / International' },
  { id: 'media', label: 'Media / Protocol' },
  { id: 'vendor', label: 'Vendor / Service' },
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

function matchesAny(text, patterns) {
  return patterns.some((re) => re.test(text));
}

/**
 * Infer category from org name, designation, email domain, website.
 * More specific buckets win before generic Industry.
 */
export function inferContactCategory(contact) {
  const text = haystackFromContact(contact);
  const domains = emailDomains(contact);
  const host = websiteHost(contact);
  const domainBlob = [...domains, host].join(' ');

  if (
    matchesAny(domainBlob, [/\.gov(\.[a-z]{2,})?$/i, /\.gov\.pk\b/i]) ||
    matchesAny(text, [
      /\bministry\b/,
      /\bgovernment\b/,
      /\bgovt\.?\b/,
      /\bsecretariat\b/,
      /\bfederal\b/,
      /\bprovincial\b/,
      /\bdivision\b/,
      /\bdepartment of\b/,
      /\bauthority\b/,
      /\bcommission\b/,
      /\bboard\b/,
      /\bdirectorate\b/,
      /\bcs\b/,
      /\bchief secretary\b/,
    ])
  ) {
    return 'govt';
  }

  if (
    matchesAny(text, [
      /\bembassy\b/,
      /\bconsulate\b/,
      /\bhigh commission\b/,
      /\bunited nations\b/,
      /\b\bun\b/,
      /\bwho\b/,
      /\bfao\b/,
      /\bworld bank\b/,
      /\bimf\b/,
      /\binternational\b/,
      /\bdiplomatic\b/,
    ])
  ) {
    return 'diplomatic';
  }

  if (
    matchesAny(text, [
      /\bchamber\b/,
      /\bassociation\b/,
      /\bfederation\b/,
      /\bfederations?\b/,
      /\bcouncil\b/,
      /\bfpcci\b/,
      /\bapex\b/,
      /\bunion of\b/,
      /\btraders association\b/,
    ])
  ) {
    return 'association';
  }

  if (
    matchesAny(text, [
      /\blab(?:oratory)?\b/,
      /\bpcsir\b/,
      /\bcertif/,
      /\btesting\b/,
      /\binspection\b/,
      /\biso\b/,
      /\baccredit/,
    ])
  ) {
    return 'lab';
  }

  if (
    matchesAny(text, [
      /\bmedia\b/,
      /\bpress\b/,
      /\bnews\b/,
      /\bjournalist\b/,
      /\breporter\b/,
      /\btv\b/,
      /\bchannel\b/,
      /\bprotocol\b/,
      /\bbroadcast\b/,
    ])
  ) {
    return 'media';
  }

  if (
    matchesAny(text, [
      /\bvendor\b/,
      /\bcontractor\b/,
      /\bsupplier\b/,
      /\bservice provider\b/,
      /\bagency\b/,
      /\bconsultancy\b/,
      /\bconsultants?\b/,
    ])
  ) {
    return 'vendor';
  }

  if (
    matchesAny(text, [
      /\b(pvt|private)\b/,
      /\bltd\.?\b/,
      /\blimited\b/,
      /\bindustr/,
      /\bexport/,
      /\bimporter?\b/,
      /\btrader/,
      /\bmills?\b/,
      /\bfoods?\b/,
      /\bcorp\.?\b/,
      /\bcompany\b/,
      /\benterprises?\b/,
    ]) ||
    matchesAny(domainBlob, [/\.(com|pk|biz|co)\b/])
  ) {
    // Plain gmail/yahoo alone is not Industry — only if org text had nothing else.
    const personalMail = domains.every((d) =>
      /^(gmail|yahoo|hotmail|outlook|live|icloud)\.com$/.test(d),
    );
    if (personalMail && !matchesAny(text, [/\b(pvt|ltd|limited|industr|export|mills|foods|corp|company|enterprises)\b/])) {
      return CONTACT_CATEGORY_UNASSIGNED;
    }
    if (
      matchesAny(text, [
        /\b(pvt|private)\b/,
        /\bltd\.?\b/,
        /\blimited\b/,
        /\bindustr/,
        /\bexport/,
        /\bimporter?\b/,
        /\btrader/,
        /\bmills?\b/,
        /\bfoods?\b/,
        /\bcorp\.?\b/,
        /\bcompany\b/,
        /\benterprises?\b/,
      ]) ||
      (host && !/\.gov(\.|$)/.test(host) && !personalMail)
    ) {
      return 'industry';
    }
  }

  return CONTACT_CATEGORY_UNASSIGNED;
}

/** Resolve stored category — honor manual lock, else re-infer. */
export function resolveContactCategory(contact) {
  const inferred = inferContactCategory(contact);
  const source =
    contact?.categorySource === 'manual' && isValidContactCategory(contact?.category)
      ? 'manual'
      : 'auto';
  const category =
    source === 'manual' ? String(contact.category).trim() : inferred;
  return { category, categorySource: source };
}
