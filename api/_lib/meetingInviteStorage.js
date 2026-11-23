import { uploadCloudImage } from './cloudImageStorage.js';

/** Saves the invitation photo. The meeting stores the returned link, not the image bytes. */
export async function uploadMeetingInvite({ imageBase64, imageMimeType = 'image/jpeg', userId }) {
  const result = await uploadCloudImage({
    imageBase64,
    imageMimeType,
    prefix: 'meeting-invites',
    userId,
  });
  if (!result.ok) return result;
  const invitationImageRef = String(result.storageRef || result.url || '').trim();
  if (!invitationImageRef) {
    return { ok: false, error: 'Invitation photo save nahi hui' };
  }
  return { ...result, invitationImageRef };
}
