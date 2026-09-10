import {
  buildComposeDraftFromIntent,
  buildSlotsFromIntent,
  mergeComposeSlots,
  buildDraftFromSlots,
} from './composeDraft';

async function postCompose(body) {
  const res = await fetch('/api/compose-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * Prefer AI slot polish when useAi; always assemble via blueprint (never free-form body).
 */
export async function generateComposeDraft(intent, { useAi = true } = {}) {
  const local = buildComposeDraftFromIntent(intent);

  if (!useAi) {
    return { ...local, via: 'template', warning: '' };
  }

  try {
    const { res, data } = await postCompose({ action: 'generate', intent });

    if (!res.ok) {
      return {
        ...local,
        via: 'template',
        warning:
          data.code === 'NO_API_KEY'
            ? 'AI off (GEMINI_API_KEY) — local blueprint used.'
            : data.error || 'AI unavailable — local blueprint used.',
      };
    }

    if (!data?.slots || typeof data.slots !== 'object') {
      return {
        ...local,
        via: 'template',
        warning: 'AI slots missing — local blueprint used.',
      };
    }

    const localSlots = buildSlotsFromIntent(intent);
    const merged = mergeComposeSlots(localSlots, data.slots, intent);
    const draft = buildDraftFromSlots(intent, merged, 'ai');
    return { ...draft, warning: '' };
  } catch (err) {
    return {
      ...local,
      via: 'template',
      warning: err.message || 'Network error — local blueprint used.',
    };
  }
}

/** AI polish of slots; assembler rebuilds body (blueprint order preserved). */
export async function improveComposeDraftWithAi({ intent, draft }) {
  const localSlots =
    draft?.slots && typeof draft.slots === 'object'
      ? draft.slots
      : buildSlotsFromIntent(intent);

  const { res, data } = await postCompose({
    action: 'improve',
    intent,
    draftBody: draft?.body || '',
    slots: localSlots,
  });

  if (!res.ok) {
    throw new Error(
      data.code === 'NO_API_KEY'
        ? 'AI configure nahi — Vercel pe GEMINI_API_KEY set karein.'
        : data.error || 'AI improve failed',
    );
  }
  if (!data?.slots || typeof data.slots !== 'object') {
    throw new Error('AI ne improved slots nahi diye');
  }

  const merged = mergeComposeSlots(localSlots, data.slots, intent);
  return buildDraftFromSlots(intent, merged, 'ai');
}

/**
 * AI reads attached reference letter image (or PDF note limited) → No. / Date fields.
 */
export async function extractReferenceWithAi({ dataUrl, mimeType, textHint = '' }) {
  let imageBase64 = '';
  let imageMimeType = mimeType || 'image/jpeg';

  if (dataUrl?.startsWith('data:')) {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      imageMimeType = match[1] || imageMimeType;
      imageBase64 = match[2];
    }
  }

  if (imageMimeType === 'application/pdf') {
    throw new Error('PDF se AI extract abhi image scan ke liye hai — JPG/PNG attach karein.');
  }

  const { res, data } = await postCompose({
    action: 'extract-reference',
    imageBase64,
    imageMimeType,
    draftBody: textHint,
  });

  if (!res.ok) {
    throw new Error(
      data.code === 'NO_API_KEY'
        ? 'AI configure nahi — GEMINI_API_KEY set karein.'
        : data.error || 'AI extract failed',
    );
  }

  return {
    referenceLetterNo: String(data.referenceLetterNo || '').trim(),
    referenceDate: String(data.referenceDate || '').trim(),
    referenceNote: String(data.referenceNote || '').trim(),
    via: 'ai',
  };
}
