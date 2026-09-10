import { uploadCloudImage } from './cloudImageStorage.js';

/** Upload invoice scan — public URL only. */
export async function uploadPettyInvoicePhoto({ imageBase64, imageMimeType = 'image/jpeg' }) {
  const result = await uploadCloudImage({
    imageBase64,
    imageMimeType,
    prefix: 'petty-invoices',
    supabaseBucket: process.env.PETTY_INVOICE_BUCKET || 'contact-cards',
  });
  if (!result.ok) return result;
  return { ...result, invoicePhotoUrl: result.url };
}
