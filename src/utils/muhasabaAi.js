/** Client helper — evaluate a deed via /api/muhasaba-evaluate */

export async function evaluateMuhasabaDeed(deedText) {
  const text = String(deedText || '').trim();
  if (!text) {
    throw new Error('Deed text required');
  }

  const res = await fetch('/api/muhasaba-evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deedText: text }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Evaluation failed (${res.status})`);
  }

  return {
    classification: data.classification === 'bad' ? 'bad' : 'good',
    evaluation: String(data.evaluation || '').trim(),
    divineReference: String(data.divine_reference || data.divineReference || '').trim(),
    identityStatement: String(
      data.identity_statement || data.identityStatement || '',
    ).trim(),
    immediateAction: String(data.immediate_action || data.immediateAction || '').trim(),
    via: data.via || 'ai',
  };
}
