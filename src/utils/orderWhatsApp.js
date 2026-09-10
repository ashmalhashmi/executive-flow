import { getWhatsAppShareUrl } from './whatsappShare';
import { formatDisplayDate } from './dates';
import { getReceivingNoteWhatsAppUrl } from './orderReceivingNoteShare';

function orderStatusLabel(status) {
  if (status === 'received') return 'Received';
  if (status === 'cancelled') return 'Cancelled';
  return 'Pending';
}

export function buildOrderWhatsAppMessage(order) {
  const lines = ['Order'];
  if (order.orderNumber) {
    lines.push(`Order#: ${order.orderNumber}`);
  }
  lines.push(
    '',
    `Item: ${order.item}`,
    `Qty: ${order.quantity}`,
    `Vendor: ${order.vendor}`,
    `Placed: ${formatDisplayDate(order.placedDate)}`,
    `Status: ${orderStatusLabel(order.status)}`,
  );
  if (order.status === 'received' && order.receivedAt) {
    const receivedDate = String(order.receivedAt).slice(0, 10);
    lines.push(`Received on: ${formatDisplayDate(receivedDate)}`);
  }
  return lines.join('\n');
}

/** Pending = order text; Received = Receiving Note share text. */
export function getOrderWhatsAppUrl(order, phoneE164) {
  if (order?.status === 'received') {
    return getReceivingNoteWhatsAppUrl(order, phoneE164);
  }
  return getWhatsAppShareUrl(buildOrderWhatsAppMessage(order), phoneE164);
}
