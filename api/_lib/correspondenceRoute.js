import {
  CLEAR7_SYSTEM_PROMPT,
  buildClear7UserPrompt,
  parseClear7Json,
} from './correspondenceExtract.js';
import { uploadCorrespondencePhoto } from './correspondenceStorage.js';
import { guardPost } from './httpGuard.js';
import { assertImagePayload } from './imageGuard.js';
import {
  requestOpenAI,
  hasOpenAIKey,
  objectSchema,
  stringField as str,
} from './openai.js';

const clear7Schema = objectSchema({
  context: str,
  link: str,
  essence: str,
  authority: str,
  requiredResponse: str,
  deadline: str,
  action: str,
});

const schema = objectSchema({
  subject: str,
  simpleExplanation: str,
  background: str,
  mainCrux: str,
  requiredAction: str,
  responsibleOfficer: str,
  deadline: str,
  dgBriefing: str,
  letterKind: str,
  clear7: clear7Schema,
});

function hasReading(fields) {
  if (!fields) return false;
  return Boolean(
    fields.subject ||
      fields.simpleExplanation ||
      fields.mainCrux ||
      fields.clear7?.essence ||
      fields.clear7?.context,
  );
}

const MAX_PAGES = 6;

function readPages(body) {
  const incoming = Array.isArray(body?.pages) ? body.pages : [];
  const pages = incoming
    .map((page) => ({
      imageBase64: String(page?.imageBase64 || ''),
      imageMimeType: String(page?.imageMimeType || 'image/jpeg'),
    }))
    .filter((page) => page.imageBase64);
  if (pages.length) return pages;
  if (body?.imageBase64) {
    return [{
      imageBase64: String(body.imageBase64),
      imageMimeType: String(body.imageMimeType || 'image/jpeg'),
    }];
  }
  return [];
}

async function generate({ pages, userId }) {
  const rawText = await requestOpenAI({
    instructions: CLEAR7_SYSTEM_PROMPT,
    text: buildClear7UserPrompt(pages.length),
    images: pages,
    name: 'clear7_letter',
    schema,
    usageFeature: 'correspondence_clear7',
    userId,
    timeoutMs: pages.length > 1 ? 50_000 : 25_000,
  });
  const fields = parseClear7Json(rawText);
  if (!hasReading(fields)) {
    throw new Error('AI ne letter nahi padha — seedhi clear photo dubara lagayein');
  }
  return fields;
}

/** Served from extract-petty-invoice so production stays within 12 serverless functions. */
export async function handleCorrespondence(req, res) {
  const gate = await guardPost(req, res, { maxBytes: 6_000_000, bucket: 'clear7' });
  if (!gate) return;

  if (!hasOpenAIKey()) {
    return res.status(503).json({
      error: 'AI not configured — set OPENAI_API_KEY in Vercel env',
      code: 'NO_API_KEY',
    });
  }

  try {
    const pages = readPages(gate.body);
    if (!pages.length) {
      return res.status(400).json({ error: 'Letter, correspondence, ya summary ki photo required' });
    }
    if (pages.length > MAX_PAGES) {
      return res.status(400).json({ error: `Ek letter ki ${MAX_PAGES} pages tak snap ho sakti hain` });
    }

    const safePages = [];
    for (const page of pages) {
      const safeImage = assertImagePayload(page.imageBase64, page.imageMimeType);
      if (!safeImage.ok) {
        return res.status(400).json({ error: safeImage.error, code: 'PAYLOAD_TOO_LARGE' });
      }
      safePages.push({
        imageBase64: safeImage.imageBase64,
        imageMimeType: safeImage.imageMimeType,
      });
    }

    const imageRefs = [];
    let storageWarning = '';
    for (const page of safePages) {
      const uploadResult = await uploadCorrespondencePhoto({
        imageBase64: page.imageBase64,
        imageMimeType: page.imageMimeType,
        userId: gate.userId,
      });
      if (uploadResult.ok && uploadResult.imageRef) imageRefs.push(uploadResult.imageRef);
      else if (!storageWarning) {
        storageWarning = uploadResult.error || 'Letter photo cloud par save nahi hui';
      }
    }
    const imageRef = imageRefs[0] || '';

    try {
      const fields = await generate({ pages: safePages, userId: gate.userId });
      return res.status(200).json({ ...fields, imageRef, imageRefs, storageWarning, via: 'ai' });
    } catch (err) {
      const message = err?.message || 'CLEAR-7 examine fail';
      const status = /timed out/i.test(message) ? 504 : 422;
      return res.status(status).json({ error: message, imageRef, imageRefs, storageWarning });
    }
  } catch (err) {
    return res.status(400).json({ error: err?.message || 'CLEAR-7 examine fail' });
  }
}
