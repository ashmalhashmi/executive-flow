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

async function generate({ imageBase64, imageMimeType, userId }) {
  const rawText = await requestOpenAI({
    instructions: CLEAR7_SYSTEM_PROMPT,
    text: buildClear7UserPrompt(),
    imageBase64,
    imageMimeType,
    name: 'clear7_letter',
    schema,
    usageFeature: 'correspondence_clear7',
    userId,
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
    const imageBase64 = String(gate.body.imageBase64 || '');
    const imageMimeType = String(gate.body.imageMimeType || 'image/jpeg');
    if (!imageBase64) {
      return res.status(400).json({ error: 'Letter, correspondence, ya summary ki photo required' });
    }

    const safeImage = assertImagePayload(imageBase64, imageMimeType);
    if (!safeImage.ok) {
      return res.status(400).json({ error: safeImage.error, code: 'PAYLOAD_TOO_LARGE' });
    }

    const uploadResult = await uploadCorrespondencePhoto({
      imageBase64: safeImage.imageBase64,
      imageMimeType: safeImage.imageMimeType,
      userId: gate.userId,
    });
    const imageRef = uploadResult.ok ? uploadResult.imageRef : '';
    const storageWarning = uploadResult.ok
      ? ''
      : uploadResult.error || 'Letter photo cloud par save nahi hui';

    try {
      const fields = await generate({
        imageBase64: safeImage.imageBase64,
        imageMimeType: safeImage.imageMimeType,
        userId: gate.userId,
      });
      return res.status(200).json({ ...fields, imageRef, storageWarning, via: 'ai' });
    } catch (err) {
      const message = err?.message || 'CLEAR-7 examine fail';
      const status = /timed out/i.test(message) ? 504 : 422;
      return res.status(status).json({ error: message, imageRef, storageWarning });
    }
  } catch (err) {
    return res.status(400).json({ error: err?.message || 'CLEAR-7 examine fail' });
  }
}
