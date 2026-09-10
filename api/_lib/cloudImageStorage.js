import { put } from '@vercel/blob';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function buildCloudPath(prefix, imageMimeType = 'image/jpeg') {
  const ext = String(imageMimeType).includes('png') ? 'png' : 'jpg';
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${prefix}/${folder}/${randomUUID()}.${ext}`;
}

async function uploadViaVercelBlob({ imageBase64, imageMimeType, prefix }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, code: 'NO_BLOB', error: 'Vercel Blob token missing' };
  }

  const buffer = Buffer.from(String(imageBase64), 'base64');
  const pathname = buildCloudPath(prefix, imageMimeType);
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: imageMimeType || 'image/jpeg',
    addRandomSuffix: false,
  });

  return { ok: true, url: blob.url, provider: 'vercel-blob', path: pathname };
}

async function uploadViaSupabase({ imageBase64, imageMimeType, prefix, bucket }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false,
      code: 'NO_STORAGE',
      error: 'Cloud storage configure nahi — Vercel Blob ya Supabase set karein',
    };
  }

  const path = buildCloudPath(prefix, imageMimeType).replace(`${prefix}/`, '');
  const buffer = Buffer.from(String(imageBase64), 'base64');

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: imageMimeType || 'image/jpeg',
    upsert: false,
  });

  if (error) {
    return {
      ok: false,
      code: 'UPLOAD_FAILED',
      error: error.message || 'Cloud upload fail',
    };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, provider: 'supabase', bucket, path };
}

export async function uploadCloudImage({
  imageBase64,
  imageMimeType = 'image/jpeg',
  prefix = 'uploads',
  supabaseBucket = 'uploads',
}) {
  if (!imageBase64) {
    return { ok: false, code: 'NO_IMAGE', error: 'Photo missing' };
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      return await uploadViaVercelBlob({ imageBase64, imageMimeType, prefix });
    } catch (err) {
      const supabaseFallback = await uploadViaSupabase({
        imageBase64,
        imageMimeType,
        prefix,
        bucket: supabaseBucket,
      });
      if (supabaseFallback.ok) return supabaseFallback;
      return {
        ok: false,
        code: 'UPLOAD_FAILED',
        error: err.message || 'Vercel Blob upload fail',
      };
    }
  }

  return uploadViaSupabase({ imageBase64, imageMimeType, prefix, bucket: supabaseBucket });
}
