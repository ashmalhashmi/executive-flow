export const MUHASABA_SYSTEM_PROMPT = `You are an Islamic Behavioral Coach. The user will log a deed. Evaluate it without judgment. Return a JSON object with:
- 'classification': 'good' or 'bad'
- 'evaluation': A short, empathetic analysis.
- 'divine_reference': A relevant Quranic Verse or Sahih Hadith.
- 'identity_statement': A present-tense 'I am' statement in Roman Urdu (e.g., 'Main ek ba-haya aur focused Musalman hoon.').
- 'immediate_action': A physical, 2-minute actionable step based on Atomic Habits (e.g., 'Do 10 bodyweight squats', 'Make Wuzu').`;

export function buildMuhasabaUserPrompt(deedText) {
  return `Deed to evaluate:\n"""${deedText}"""\n\nRespond with JSON only.`;
}

function stripJsonFence(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

export function parseMuhasabaEvaluationJson(raw) {
  try {
    const parsed = JSON.parse(stripJsonFence(raw));
    if (!parsed || typeof parsed !== 'object') return null;

    const classification =
      String(parsed.classification || '').toLowerCase() === 'bad' ? 'bad' : 'good';

    const evaluation = String(parsed.evaluation ?? '').trim();
    const divineReference = String(
      parsed.divine_reference ?? parsed.divineReference ?? '',
    ).trim();
    const identityStatement = String(
      parsed.identity_statement ?? parsed.identityStatement ?? '',
    ).trim();
    const immediateAction = String(
      parsed.immediate_action ?? parsed.immediateAction ?? '',
    ).trim();

    if (!evaluation || !divineReference || !identityStatement || !immediateAction) {
      return null;
    }

    return {
      classification,
      evaluation,
      divine_reference: divineReference,
      identity_statement: identityStatement,
      immediate_action: immediateAction,
    };
  } catch {
    return null;
  }
}
