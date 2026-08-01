const PREFIX = 'ORD';

export function formatOrderNumber(seq) {
  const n = Math.max(1, Math.floor(Number(seq) || 0));
  return `${PREFIX}-${String(n).padStart(4, '0')}`;
}

export function parseOrderNumber(orderNumber) {
  if (!orderNumber || typeof orderNumber !== 'string') return 0;
  const m = orderNumber.trim().match(/^ORD-(\d+)$/i);
  return m ? Number(m[1], 10) : 0;
}

export function nextOrderNumber(existingOrders) {
  let max = 0;
  for (const o of existingOrders || []) {
    const n = parseOrderNumber(o.orderNumber);
    if (n > max) max = n;
  }
  return formatOrderNumber(max + 1);
}

/** Backfill orderNumber for orders saved before this field existed */
export function normalizeOrders(orders) {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  let max = 0;
  for (const o of orders) {
    const n = parseOrderNumber(o.orderNumber);
    if (n > max) max = n;
  }

  let changed = false;
  const next = orders.map((o) => {
    if (o.orderNumber) return o;
    changed = true;
    max += 1;
    return { ...o, orderNumber: formatOrderNumber(max) };
  });

  return changed ? next : orders;
}
