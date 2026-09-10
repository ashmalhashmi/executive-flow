export const COMPOSE_DRAFT_SYSTEM_PROMPT = `You are an executive writing assistant for Punjab / Pakistani government offices (e.g. PAFDA, DG office).
The user provides INTENT only. You fill CONTENT SLOTS only.
A separate assembler builds the final document from a fixed organizational blueprint.
You MUST NOT output a full letter or note sheet body. Do NOT invent section labels (File No., Date, Submitted to, Brief of the case, Proposal, etc.).

Output STRICT JSON only — slot object, no "body" field.

Shared fields:
{"subject":"...","addressee":"...","referenceLine":"...","enclosureLine":"...","signature":"...","briefFacts":[],"bodyParagraphs":[],"previousPolicy":"...","proposal":"...","salutation":"...","closing":"..."}

A) correspondenceType letter — fill:
- subject, addressee (if given), salutation (e.g. "Respected Sir,"), referenceLine (plain cite text without "I am directed…"), enclosureLine if attach,
- bodyParagraphs: array of paragraph strings (facts expanded; no header lines),
- closing: "Yours faithfully," or "Yours sincerely,",
- signature: designation/name,
- leave briefFacts=[], previousPolicy="", proposal=""

B) correspondenceType note_sheet — fill:
- subject, addressee (Submitted to),
- referenceLine: e.g. "Letter No. X dated Y." (PUC cite only),
- briefFacts: array of fact strings (no numbering prefixes required),
- previousPolicy: rules/precedent or "Nil",
- proposal: clear actionable orders sought,
- signature: note writer name/designation,
- leave salutation="", closing="", bodyParagraphs=[]

Rules:
- Do NOT invent facts not in the intent.
- Keep core ideas intact; expand only for clarity.
- Professional English. Impersonal for note_sheet (no Dear Sir / Yours faithfully).
- Honour presentationPreference when set: if the user asks for a table, put a plain-text table (e.g. "S.No. | Particulars" header + "1 | …" rows) inside bodyParagraphs (letter) or briefFacts (note_sheet). If numbered/bullets, format those arrays accordingly. Do not invent Excel/HTML — text only.`;

export const COMPOSE_IMPROVE_SYSTEM_PROMPT = `You improve CONTENT SLOTS for Pakistani / Punjab government drafts.
Keep all facts, numbers, dates, and meaning. Improve clarity of slot wording only.
Output the SAME slot JSON schema (no full "body" field). Do not invent section labels.
If note_sheet: no salutation/closing; keep briefFacts, previousPolicy, proposal, signature.
If letter: keep salutation, bodyParagraphs, closing, signature.
If presentationPreference asks for a table or list, keep that layout in the relevant slot arrays (plain text only).`;

export const COMPOSE_EXTRACT_REF_SYSTEM_PROMPT = `You read a scanned/photographed office letter (or text) and extract the reference identity only.
Output STRICT JSON only: {"referenceLetterNo":"...","referenceDate":"YYYY-MM-DD or empty","referenceNote":"short subject if visible"}
- referenceLetterNo: the letter/file number on the document (e.g. SO(Food)/2026/45). Empty string if not found.
- referenceDate: ISO date YYYY-MM-DD if you can parse it, else empty.
- referenceNote: one short phrase of subject if visible, else empty.
Do not invent numbers.`;

export function buildComposeDraftUserPrompt(intent) {
  const i = intent || {};
  const mode = i.referenceMode || 'none';
  const type = i.correspondenceType === 'note_sheet' ? 'note_sheet' : 'letter';
  const presentation = String(i.presentationPreference || '').trim();
  const presentationLine = presentation
    ? `Presentation preference (follow in bodyParagraphs / briefFacts): ${presentation}`
    : 'Presentation preference: (none — clear paragraphs or numbered points as fits the facts)';
  const refLines = [`Reference mode: ${mode}`];
  if (mode !== 'none') {
    refLines.push(`Reference Letter No.: ${i.referenceLetterNo || '(none)'}`);
    refLines.push(`Reference Date: ${i.referenceDate || '(none)'}`);
    if (mode === 'attach' || mode === 'both') {
      refLines.push(
        `Attachment file: ${i.referenceFileName || '(file attached — enclosure / PUC)'}`,
      );
    }
  }

  if (type === 'note_sheet') {
    return [
      'Fill NOTE SHEET content slots only (JSON). Assembler will add File No., Date, labels, and submission line.',
      `Correspondence type: note_sheet`,
      `Purpose: ${i.purpose || 'inform'}`,
      `File No. (identity — do not put in prose): ${i.letterNo || '(none)'}`,
      `Submitted to: ${i.addressee || '(none — still return empty addressee)'}`,
      `Subject: ${i.subject || '(derive from purpose + ideas)'}`,
      `Tone: ${i.tone || 'formal'}`,
      `Language preference: ${i.language || 'english'}`,
      presentationLine,
      `Note writer: ${i.senderName || '(placeholder designation)'}`,
      `Desired proposal / orders sought: ${i.outcome || '(derive a clear proposal)'}`,
      ...refLines,
      'Core ideas / facts (preserve — expand into briefFacts[]):',
      String(i.coreIdeas || '').trim() || '(none)',
      'Return slot JSON only. No body field.',
    ].join('\n');
  }

  return [
    'Fill LETTER content slots only (JSON). Assembler will add No., Date, To, Subject labels.',
    `Correspondence type: letter`,
    `Purpose: ${i.purpose || 'inform'}`,
    `Letter No. (identity): ${i.letterNo || '(blank line will be used)'}`,
    `Addressee: ${i.addressee || '(not specified)'}`,
    `Subject: ${i.subject || '(derive from purpose + ideas)'}`,
    `Tone: ${i.tone || 'polite'}`,
    `Language preference: ${i.language || 'english'}`,
    presentationLine,
    `Sender name: ${i.senderName || '(placeholder)'}`,
    `Desired outcome: ${i.outcome || '(none)'}`,
    ...refLines,
    'Core ideas (preserve — expand into bodyParagraphs[]):',
    String(i.coreIdeas || '').trim() || '(none)',
    'Return slot JSON only. No body field.',
  ].join('\n');
}

export function buildComposeImproveUserPrompt({ intent, draftBody, slots }) {
  const type = intent?.correspondenceType === 'note_sheet' ? 'note_sheet' : 'letter';
  const presentation = String(intent?.presentationPreference || '').trim();
  return [
    'Improve these content slots. Preserve facts and numbers. Return improved slot JSON only (no body).',
    `Correspondence type: ${type}`,
    `Intent tone: ${intent?.tone || 'formal'}`,
    `Intent purpose: ${intent?.purpose || 'inform'}`,
    presentation
      ? `Presentation preference (keep or apply): ${presentation}`
      : 'Presentation preference: (none)',
    'Current slots JSON:',
    JSON.stringify(slots || {}, null, 0),
    'Current assembled draft (for context only — do not return as body):',
    String(draftBody || '').trim().slice(0, 4000),
  ].join('\n');
}

function asStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((p) => String(p || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Parse AI slot JSON. Rejects free-form-only {body} as primary success
 * unless slots can be recovered from other fields.
 */
export function parseComposeSlotsJson(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object') return null;

    const hasSlotContent =
      String(parsed.subject || '').trim() ||
      String(parsed.proposal || '').trim() ||
      asStringArray(parsed.briefFacts).length > 0 ||
      asStringArray(parsed.bodyParagraphs).length > 0 ||
      String(parsed.salutation || '').trim() ||
      String(parsed.signature || '').trim();

    // Legacy free-form body alone is not a valid slot payload
    if (!hasSlotContent && String(parsed.body || '').trim()) {
      return null;
    }
    if (!hasSlotContent) return null;

    return {
      subject: String(parsed.subject || '').trim(),
      addressee: String(parsed.addressee || '').trim(),
      salutation: String(parsed.salutation || '').trim(),
      referenceLine: String(parsed.referenceLine || '').trim(),
      enclosureLine: String(parsed.enclosureLine || '').trim(),
      briefFacts: asStringArray(parsed.briefFacts),
      bodyParagraphs: asStringArray(parsed.bodyParagraphs),
      previousPolicy: String(parsed.previousPolicy || '').trim(),
      proposal: String(parsed.proposal || '').trim(),
      closing: String(parsed.closing || '').trim(),
      signature: String(parsed.signature || '').trim(),
    };
  } catch {
    return null;
  }
}

/** @deprecated Prefer parseComposeSlotsJson — kept for API compatibility checks */
export function parseComposeDraftJson(rawText) {
  const slots = parseComposeSlotsJson(rawText);
  if (!slots) return null;
  return {
    subject: slots.subject,
    addressee: slots.addressee,
    slots,
  };
}

export function parseComposeReferenceJson(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      referenceLetterNo: String(parsed.referenceLetterNo || '').trim(),
      referenceDate: String(parsed.referenceDate || '').trim(),
      referenceNote: String(parsed.referenceNote || '').trim(),
    };
  } catch {
    return null;
  }
}
