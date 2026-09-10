import { getTodayISO, formatDisplayDate } from './dates';
import { COMPOSE_PURPOSES } from '../constants/composePurposes';
import {
  NOTE_SUBMISSION_LINE,
  emptyComposeSlots,
} from '../constants/composeBlueprints';

function purposeLabel(purposeId) {
  return COMPOSE_PURPOSES.find((p) => p.id === purposeId)?.label || 'Letter';
}

export function parseCoreIdeas(raw) {
  return String(raw || '')
    .split(/\n|,/)
    .map((line) => line.replace(/^[\s•\-\*\d.]+/, '').trim())
    .filter(Boolean);
}

function formatRefDate(raw) {
  if (!raw) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return formatDisplayDate(raw);
  } catch {
    /* fall through */
  }
  return raw;
}

function openingByTone(tone, addressee) {
  const name = addressee || 'Sir/Madam';
  if (tone === 'firm' || tone === 'warm') return `Dear ${name},`;
  return `Respected ${name},`;
}

function closingPhraseByTone(tone) {
  if (tone === 'warm') return 'With warm regards,';
  if (tone === 'firm') return 'Yours sincerely,';
  return 'Yours faithfully,';
}

function defaultProposal(purpose, outcome) {
  if (outcome?.trim()) return outcome.trim();
  if (purpose === 'request') {
    return 'Approval / orders as proposed above may kindly be granted.';
  }
  if (purpose === 'reminder') {
    return 'Early orders / directions on the pending matter may kindly be issued.';
  }
  return 'Orders / directions as deemed appropriate may kindly be issued.';
}

function buildReferenceSlots(intent) {
  const mode = intent.referenceMode || 'none';
  if (mode === 'none') return { referenceLine: '', enclosureLine: '' };

  const refNo = String(intent.referenceLetterNo || '').trim();
  const refDate = String(intent.referenceDate || '').trim();
  const fileName = String(intent.referenceFileName || '').trim();
  const wantsCite = mode === 'cite' || mode === 'both';
  const wantsAttach = mode === 'attach' || mode === 'both';

  let referenceLine = '';
  if (wantsCite && (refNo || refDate)) {
    if (refNo && refDate) {
      referenceLine = `Letter No. ${refNo} dated ${formatRefDate(refDate)}.`;
    } else if (refNo) {
      referenceLine = `Letter No. ${refNo}.`;
    } else {
      referenceLine = `Letter dated ${formatRefDate(refDate)}.`;
    }
  }

  let enclosureLine = '';
  if (wantsAttach) {
    enclosureLine = fileName
      ? `A copy of the referenced letter is enclosed (${fileName}).`
      : 'A copy of the referenced letter is enclosed.';
  }

  return { referenceLine, enclosureLine };
}

/** Detect how user wants body facts laid out (local / non-AI path). */
export function resolvePresentationMode(preference) {
  const p = String(preference || '')
    .trim()
    .toLowerCase();
  if (!p) return 'paragraphs';
  if (/\btable\b|tabular|columns?\b|grid\b/.test(p)) return 'table';
  if (/\bbullet\b|\bbullets\b|•|dash list/.test(p)) return 'bullets';
  if (/\bnumber(ed)?\b|\blist\b|\bpoints?\b|\bserial\b/.test(p)) return 'numbered';
  if (/\bparagraph\b|\bnarrative\b|\bprose\b/.test(p)) return 'paragraphs';
  return 'custom';
}

function formatIdeasAsTable(ideas) {
  const rows =
    ideas.length > 0 ? ideas : ['[Add your core point here]'];
  const lines = ['S.No. | Particulars', '----- | -----------'];
  rows.forEach((idea, i) => {
    lines.push(`${i + 1} | ${idea}`);
  });
  return lines.join('\n');
}

function formatIdeasAsBullets(ideas) {
  const rows =
    ideas.length > 0 ? ideas : ['[Add your core point here]'];
  return rows.map((idea) => `• ${idea}`);
}

function formatIdeasAsNumbered(ideas) {
  const rows =
    ideas.length > 0 ? ideas : ['[Add your core point here]'];
  return rows.map((idea, i) => `${i + 1}. ${idea}`);
}

function letterClosingLine(purpose) {
  if (purpose === 'request') {
    return 'I shall be grateful for your favourable consideration.';
  }
  if (purpose === 'reminder') {
    return 'Your early action will be highly appreciated.';
  }
  if (purpose === 'acknowledge') {
    return 'Thank you for your cooperation.';
  }
  return 'Please feel free to contact us should you require any further information.';
}

function letterBodyParagraphs(purpose, ideas, outcome, tone, presentationPreference) {
  const mode = resolvePresentationMode(presentationPreference);
  const intro =
    purpose === 'request'
      ? 'I am writing to request your kind attention to the following matter:'
      : purpose === 'reminder'
        ? `This is a gentle reminder regarding the matter below${
            tone === 'firm' ? ' which remains pending' : ''
          }:`
        : purpose === 'acknowledge'
          ? 'I write to acknowledge and confirm the following:'
          : 'I wish to inform you of the following:';

  const paras = [intro];

  if (mode === 'table') {
    paras.push(formatIdeasAsTable(ideas));
  } else if (mode === 'bullets') {
    paras.push(...formatIdeasAsBullets(ideas));
  } else if (mode === 'numbered' || mode === 'custom') {
    // custom free-text hint: still use numbered points locally; AI path honours the wording
    paras.push(...formatIdeasAsNumbered(ideas));
  } else {
    // paragraphs — weave ideas into short prose lines
    if (ideas.length > 0) {
      paras.push(...ideas);
    } else {
      paras.push('[Add your core point here]');
    }
  }

  if (outcome?.trim()) paras.push(`We kindly request: ${outcome.trim()}`);
  paras.push(letterClosingLine(purpose));
  return paras;
}

function noteBriefFacts(ideas, presentationPreference) {
  const mode = resolvePresentationMode(presentationPreference);
  if (!ideas.length) {
    return ['[Brief facts of the case — Paper Under Consideration]'];
  }
  if (mode === 'table') {
    return [formatIdeasAsTable(ideas)];
  }
  if (mode === 'bullets') {
    return formatIdeasAsBullets(ideas);
  }
  // numbered / paragraphs / custom — assembler already numbers briefFacts
  return ideas;
}

/**
 * Deterministic slots from Intent (AI merges on top; never invents structure).
 */
export function buildSlotsFromIntent(intent) {
  const i = intent || {};
  const type = i.correspondenceType === 'note_sheet' ? 'note_sheet' : 'letter';
  const purpose = i.purpose || 'inform';
  const letterNo = String(i.letterNo || '').trim();
  const addressee = String(i.addressee || '').trim();
  const subject = String(i.subject || '').trim() || purposeLabel(purpose);
  const ideas = parseCoreIdeas(i.coreIdeas);
  const outcome = String(i.outcome || '').trim();
  const tone = i.tone || (type === 'note_sheet' ? 'formal' : 'polite');
  const senderName = String(i.senderName || '').trim();
  const presentationPreference = String(i.presentationPreference || '').trim();
  const dateLine = formatDisplayDate(getTodayISO());
  const { referenceLine, enclosureLine } = buildReferenceSlots(i);

  const slots = {
    ...emptyComposeSlots(),
    subject,
    addressee,
    letterNo,
    dateLine,
    referenceLine,
    enclosureLine,
    signature:
      senderName ||
      (type === 'note_sheet' ? '[Name / Designation]' : '[Your Name]'),
  };

  if (type === 'note_sheet') {
    slots.briefFacts = noteBriefFacts(ideas, presentationPreference);
    slots.previousPolicy = 'Nil';
    slots.proposal = defaultProposal(purpose, outcome);
    slots.salutation = '';
    slots.closing = '';
    slots.bodyParagraphs = [];
  } else {
    slots.salutation = openingByTone(tone, addressee);
    slots.closing = closingPhraseByTone(tone);
    slots.bodyParagraphs = letterBodyParagraphs(
      purpose,
      ideas,
      outcome,
      tone,
      presentationPreference,
    );
    slots.briefFacts = [];
    slots.previousPolicy = '';
    slots.proposal = '';
  }

  return assertBlueprintShape(slots, type);
}

/**
 * Normalize / fill required slot defaults for a correspondence type.
 */
export function assertBlueprintShape(slots, correspondenceType) {
  const type = correspondenceType === 'note_sheet' ? 'note_sheet' : 'letter';
  const next = { ...emptyComposeSlots(), ...slots };

  next.subject = String(next.subject || '').trim();
  next.addressee = String(next.addressee || '').trim();
  next.letterNo = String(next.letterNo || '').trim();
  next.dateLine =
    String(next.dateLine || '').trim() || formatDisplayDate(getTodayISO());
  next.salutation = String(next.salutation || '').trim();
  next.referenceLine = String(next.referenceLine || '').trim();
  next.enclosureLine = String(next.enclosureLine || '').trim();
  next.previousPolicy = String(next.previousPolicy || '').trim();
  next.proposal = String(next.proposal || '').trim();
  next.closing = String(next.closing || '').trim();
  next.signature = String(next.signature || '').trim();

  next.bodyParagraphs = Array.isArray(next.bodyParagraphs)
    ? next.bodyParagraphs.map((p) => String(p || '').trim()).filter(Boolean)
    : [];
  next.briefFacts = Array.isArray(next.briefFacts)
    ? next.briefFacts.map((p) => String(p || '').trim()).filter(Boolean)
    : [];

  if (type === 'note_sheet') {
    if (!next.briefFacts.length) {
      next.briefFacts = ['[Brief facts of the case]'];
    }
    if (!next.previousPolicy) next.previousPolicy = 'Nil';
    if (!next.proposal) {
      next.proposal = 'Orders / directions as deemed appropriate may kindly be issued.';
    }
    if (!next.signature) next.signature = '[Name / Designation]';
    next.salutation = '';
    next.closing = '';
    next.bodyParagraphs = [];
  } else {
    if (!next.salutation) next.salutation = 'Respected Sir/Madam,';
    if (!next.closing) next.closing = 'Yours faithfully,';
    if (!next.signature) next.signature = '[Your Name]';
    if (!next.bodyParagraphs.length) {
      next.bodyParagraphs = ['[Add letter body paragraphs]'];
    }
    if (!next.letterNo) next.letterNo = '________________';
  }

  return next;
}

/**
 * Merge AI slot payload over local slots. Intent-owned fields win for identity.
 */
export function mergeComposeSlots(localSlots, aiSlots, intent) {
  const type =
    intent?.correspondenceType === 'note_sheet' ? 'note_sheet' : 'letter';
  const local = assertBlueprintShape(localSlots || emptyComposeSlots(), type);
  const ai = aiSlots && typeof aiSlots === 'object' ? aiSlots : {};

  const merged = {
    ...local,
    subject: String(ai.subject || local.subject).trim() || local.subject,
    addressee:
      String(intent?.addressee || '').trim() ||
      String(ai.addressee || local.addressee).trim(),
    // File/Letter No. and date always from intent/local, never AI rewrite
    letterNo: String(intent?.letterNo || local.letterNo || '').trim() || local.letterNo,
    dateLine: local.dateLine,
    salutation: String(ai.salutation || local.salutation).trim(),
    referenceLine: String(ai.referenceLine || local.referenceLine).trim(),
    enclosureLine: String(ai.enclosureLine || local.enclosureLine).trim(),
    previousPolicy: String(ai.previousPolicy || local.previousPolicy).trim(),
    proposal: String(ai.proposal || local.proposal).trim(),
    closing: String(ai.closing || local.closing).trim(),
    signature:
      String(intent?.senderName || '').trim() ||
      String(ai.signature || local.signature).trim() ||
      local.signature,
  };

  if (Array.isArray(ai.briefFacts) && ai.briefFacts.length) {
    merged.briefFacts = ai.briefFacts.map((p) => String(p || '').trim()).filter(Boolean);
  }
  if (Array.isArray(ai.bodyParagraphs) && ai.bodyParagraphs.length) {
    merged.bodyParagraphs = ai.bodyParagraphs
      .map((p) => String(p || '').trim())
      .filter(Boolean);
  }

  return assertBlueprintShape(merged, type);
}

function numberedLines(items) {
  return items.map((item, i) => {
    const t = String(item || '').trim();
    if (!t) return t;
    // Plain-text table / already formatted block — keep as-is
    if (t.includes('\n') || /^\s*S\.?\s*No\.?\s*\|/i.test(t) || t.includes(' | ')) {
      return t;
    }
    if (/^\d+\.\s/.test(t) || /^[•\-]\s/.test(t)) return t;
    return `${i + 1}. ${t}`;
  });
}

/**
 * ONLY path that builds final draft body text from slots + blueprint.
 */
export function assembleComposeBody(correspondenceType, slots, intent) {
  const type = correspondenceType === 'note_sheet' ? 'note_sheet' : 'letter';
  const s = assertBlueprintShape(slots, type);
  const bilingual = intent?.language === 'bilingual';
  const ideas = parseCoreIdeas(intent?.coreIdeas);

  if (type === 'note_sheet') {
    return assembleNoteSheet(s, bilingual, ideas);
  }
  return assembleLetter(s, bilingual, ideas);
}

function assembleNoteSheet(s, bilingual, ideas) {
  const lines = [];

  if (s.letterNo) {
    lines.push(`File No. ${s.letterNo}`);
  }
  lines.push(`Date: ${s.dateLine}`);
  lines.push('');

  if (s.addressee) {
    lines.push(`Submitted to: ${s.addressee}`);
  } else {
    lines.push('Submitted to: ________');
  }
  lines.push('');

  lines.push(`Subject: ${s.subject || '[Subject]'}`);
  lines.push('');

  if (s.referenceLine || s.enclosureLine) {
    lines.push('Reference (PUC):');
    if (s.referenceLine) lines.push(s.referenceLine);
    if (s.enclosureLine) {
      lines.push(
        s.enclosureLine.replace(
          /^A copy of the referenced letter is enclosed/,
          'Enclosed paper under consideration',
        ),
      );
    }
    lines.push('');
  }

  lines.push('Brief of the case:');
  lines.push(...numberedLines(s.briefFacts));
  lines.push('');

  lines.push('Previous papers / policy / precedent:');
  lines.push(s.previousPolicy || 'Nil');
  lines.push('');

  lines.push('Proposal:');
  lines.push(s.proposal);
  lines.push('');

  lines.push(NOTE_SUBMISSION_LINE);
  lines.push('');
  lines.push(s.signature);

  let body = lines.join('\n').trim();

  if (bilingual) {
    body +=
      `\n\n---\n` +
      `Roman Urdu note (operator):\n` +
      `Yeh internal note sheet blueprint se bani hai — facts, File No. aur proposal check karke submit karein. ` +
      `Core points: ${ideas.length ? ideas.join('; ') : '—'}`;
  }

  return body;
}

function assembleLetter(s, bilingual, ideas) {
  const lines = [];

  lines.push(`No. ${s.letterNo || '________________'}`);
  lines.push(`Date: ${s.dateLine}`);
  lines.push('');

  if (s.addressee) {
    lines.push('To:');
    lines.push(s.addressee);
    lines.push('');
  }

  lines.push(`Subject: ${s.subject || '[Subject]'}`);
  lines.push('');
  lines.push(s.salutation);
  lines.push('');

  if (s.referenceLine) {
    lines.push(
      `I am directed to refer to ${s.referenceLine.replace(/\.$/, '')} on the subject cited above.`,
    );
    lines.push('');
  }
  if (s.enclosureLine) {
    lines.push(s.enclosureLine);
    lines.push('');
  }

  for (const para of s.bodyParagraphs) {
    lines.push(para);
    lines.push('');
  }

  // Remove trailing empty before closing
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  lines.push('');
  lines.push(s.closing);
  lines.push('');
  lines.push(s.signature);

  let body = lines.join('\n').trim();

  if (bilingual) {
    body +=
      `\n\n---\n` +
      `Roman Urdu note (operator):\n` +
      `Yeh draft blueprint se bana hai — Letter No., reference aur facts check karke sign karein. ` +
      `Core points: ${ideas.length ? ideas.join('; ') : '—'}`;
  }

  return body;
}

/**
 * Build full draft object from intent via blueprint assembler.
 */
export function buildDraftFromSlots(intent, slots, via = 'template') {
  const type =
    intent?.correspondenceType === 'note_sheet' ? 'note_sheet' : 'letter';
  const normalized = assertBlueprintShape(slots, type);
  const body = assembleComposeBody(type, normalized, intent);

  return {
    subject: normalized.subject,
    addressee: normalized.addressee,
    letterNo: normalized.letterNo,
    body,
    purpose: intent?.purpose || 'inform',
    tone: intent?.tone || (type === 'note_sheet' ? 'formal' : 'polite'),
    correspondenceType: type,
    referenceMode: intent?.referenceMode || 'none',
    slots: normalized,
    via,
    generatedAt: new Date().toISOString(),
  };
}
