import { uploadCloudImage } from './cloudImageStorage.js';

/** Saves the correspondence photo. The review stores the returned link, not the image bytes. */
export async function uploadCorrespondencePhoto({ imageBase64, imageMimeType = 'image/jpeg', userId }) {
  const result = await uploadCloudImage({
    imageBase64,
    imageMimeType,
    prefix: 'correspondence-scans',
    userId,
  });
  if (!result.ok) return result;
  const imageRef = String(result.storageRef || result.url || '').trim();
  if (!imageRef) return { ok: false, error: 'Letter photo save nahi hui' };
  return { ...result, imageRef };
}
