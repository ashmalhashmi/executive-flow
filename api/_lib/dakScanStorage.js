import { uploadCloudImage } from './cloudImageStorage.js';

const DEFAULT_SUPABASE_BUCKET = 'dak-scans';

/** Upload compressed register scan — returns public URL only. */
export async function uploadDakScanPhoto({ imageBase64, imageMimeType = 'image/jpeg' }) {
  const result = await uploadCloudImage({
    imageBase64,
    imageMimeType,
    prefix: 'dak-scans',
    supabaseBucket: process.env.DAK_SCAN_BUCKET || DEFAULT_SUPABASE_BUCKET,
  });
  if (!result.ok) return result;
  return { ...result, scanPhotoUrl: result.url };
}
