import { uploadCloudImage } from './cloudImageStorage.js';

const DEFAULT_BUCKET = 'contact-cards';

/** Upload visiting-card photo — returns public URL only (no base64 in DB). */
export async function uploadContactCardPhoto({ imageBase64, imageMimeType = 'image/jpeg' }) {
  const result = await uploadCloudImage({
    imageBase64,
    imageMimeType,
    prefix: 'contact-cards',
    supabaseBucket: process.env.CONTACT_CARD_BUCKET || DEFAULT_BUCKET,
  });
  if (!result.ok) return result;
  return { ...result, cardPhotoUrl: result.url };
}
