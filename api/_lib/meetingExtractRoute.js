import {
  MEETING_EXTRACT_SYSTEM_PROMPT,
  buildMeetingExtractUserPrompt,
  parseMeetingExtractJson,
} from './meetingExtract.js';
import { uploadMeetingInvite } from './meetingInviteStorage.js';
import { guardPost } from './httpGuard.js';
import { assertImagePayload } from './imageGuard.js';
import {
  requestOpenAI,
  hasOpenAIKey,
  objectSchema,
  stringField as str,
} from './openai.js';

const schema = objectSchema({
  title: str,
  location: str,
  time: str,
  date: str,
  agenda: str,
  attendees: str,
});

async function generate({ brief, todayISO, imageBase64, imageMimeType, userId }) {
  const rawText = await requestOpenAI({
    instructions: MEETING_EXTRACT_SYSTEM_PROMPT,
    text: buildMeetingExtractUserPrompt({ brief, todayISO }),
    imageBase64,
    imageMimeType,
    name: 'meeting_fields',
    schema,
    usageFeature: 'meeting_invite',
    userId,
  });
  const fields = parseMeetingExtractJson(rawText);
  if (!fields || (!fields.title && !fields.location && !fields.time && !fields.agenda)) {
    throw new Error('AI ne meeting ki detail nahi nikali — jagah, waqt, aur topic likhein ya clear invitation photo dein');
  }
  return fields;
}

/** Served from extract-petty-invoice so production stays within 12 serverless functions. */
export async function handleExtractMeeting(req, res) {
  const gate = await guardPost(req, res, { maxBytes: 6_000_000, bucket: 'extract-meeting' });
  if (!gate) return;

  if (!hasOpenAIKey()) {
    return res.status(503).json({
      error: 'AI not configured — set OPENAI_API_KEY in Vercel env',
      code: 'NO_API_KEY',
    });
  }

  try {
    const brief = String(gate.body.brief || '').trim();
    const todayISO = String(gate.body.todayISO || '').trim();
    const imageBase64 = String(gate.body.imageBase64 || '');
    const imageMimeType = String(gate.body.imageMimeType || 'image/jpeg');

    let invitationImageRef = '';
    let storageWarning = '';
    let safeImage = null;

    if (imageBase64) {
      safeImage = assertImagePayload(imageBase64, imageMimeType);
      if (!safeImage.ok) {
        return res.status(400).json({ error: safeImage.error, code: 'PAYLOAD_TOO_LARGE' });
      }
      const uploadResult = await uploadMeetingInvite({
        imageBase64: safeImage.imageBase64,
        imageMimeType: safeImage.imageMimeType,
        userId: gate.userId,
      });
      if (uploadResult.ok) {
        invitationImageRef = uploadResult.invitationImageRef;
      } else {
        storageWarning = uploadResult.error || 'Invitation photo cloud par save nahi hui';
      }
    } else if (brief.length < 3) {
      return res.status(400).json({
        error: 'Jagah, waqt, aur topic likhein — ya invitation ki photo attach karein',
      });
    }

    try {
      const fields = await generate({
        brief,
        todayISO,
        imageBase64: safeImage?.imageBase64,
        imageMimeType: safeImage?.imageMimeType,
        userId: gate.userId,
      });
      return res.status(200).json({
        fields,
        invitationImageRef,
        storageWarning,
        via: 'ai',
      });
    } catch (err) {
      const message = err?.message || 'Meeting extract fail';
      const status = /timed out/i.test(message) ? 504 : 422;
      return res.status(status).json({
        error: message,
        invitationImageRef,
        storageWarning,
      });
    }
  } catch (err) {
    return res.status(400).json({ error: err?.message || 'Meeting extract fail' });
  }
}
