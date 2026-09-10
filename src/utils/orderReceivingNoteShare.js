import { formatDisplayDate } from './dates';
import { getWhatsAppShareUrl } from './whatsappShare';

/**
 * Display / share name: Rec Note_<Order No>_<item>
 */
export function buildReceivingNoteShareLabel(order) {
  const orderNo = String(order?.orderNumber || '').trim() || 'Order';
  const item = String(order?.item || 'Item')
    .trim()
    .replace(/\s+/g, ' ');
  return `Rec Note_${orderNo}_${item}`;
}

/** Safe download basename (no extension). */
export function sanitizeReceivingNoteFilename(label) {
  return String(label || 'Rec_Note')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80) || 'Rec_Note';
}

export function buildReceivingNoteWhatsAppMessage(order) {
  const label = buildReceivingNoteShareLabel(order);
  const lines = [label, ''];
  if (order?.orderNumber) lines.push(`Order#: ${order.orderNumber}`);
  lines.push(
    `Item: ${order?.item || '—'}`,
    `Qty: ${order?.quantity ?? '—'}`,
    `Vendor: ${order?.vendor || '—'}`,
  );
  if (order?.receivedAt) {
    const receivedDate = String(order.receivedAt).slice(0, 10);
    lines.push(`Received on: ${formatDisplayDate(receivedDate)}`);
  }
  lines.push(
    '',
    'Receiving Note PDF + Word download ready — WhatsApp pe attach karke bhej dein.',
  );
  return lines.join('\n');
}

export function getReceivingNoteWhatsAppUrl(order, phoneE164) {
  return getWhatsAppShareUrl(buildReceivingNoteWhatsAppMessage(order), phoneE164);
}

/** Payload for PDF / Word from an order row. */
export function receivingPayloadFromOrder(order, statement, dateISO) {
  const itemsReceived = `${order.item} — Qty ${order.quantity}`;
  return {
    orderNo: String(order.orderNumber || '').trim(),
    dateISO: dateISO || String(order.receivedAt || '').slice(0, 10),
    vendor: String(order.vendor || '').trim(),
    statement: String(statement || '').trim(),
    itemsReceived,
    fileBaseName: sanitizeReceivingNoteFilename(buildReceivingNoteShareLabel(order)),
  };
}
