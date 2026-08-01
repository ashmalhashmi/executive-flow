import { getWhatsAppShareUrl } from './whatsappShare';
import { formatDisplayDate } from './dates';

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

export function getOrderWhatsAppUrl(order, phoneE164) {
  return getWhatsAppShareUrl(buildOrderWhatsAppMessage(order), phoneE164);
}
