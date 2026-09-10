/**
 * AI / local helpers for Receiving Note formal statement.
 */

export function buildReceivingNoteStatementLocal({ orderNo, vendor, itemsReceived }) {
  const items = String(itemsReceived || '').trim() || 'the ordered goods';
  const ord = String(orderNo || '').trim();
  const ven = String(vendor || '').trim();
  let s = 'It is hereby confirmed that the following have been received';
  if (ord) s += ` against Order No. ${ord}`;
  if (ven) s += ` from ${ven}`;
  s += `: ${items.replace(/\s+/g, ' ').trim()}.`;
  return s;
}

/**
 * Prefer AI polish; fall back to local template statement.
 */
export async function generateReceivingNoteStatement({
  orderNo,
  vendor,
  itemsReceived,
  date,
}) {
  const local = buildReceivingNoteStatementLocal({ orderNo, vendor, itemsReceived });

  try {
    const res = await fetch('/api/receiving-note-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNo: String(orderNo || '').trim(),
        vendor: String(vendor || '').trim(),
        itemsReceived: String(itemsReceived || '').trim(),
        date: String(date || '').trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        statement: local,
        via: 'template',
        warning:
          data.code === 'NO_API_KEY'
            ? 'AI off — local statement used.'
            : data.error || 'AI unavailable — local statement used.',
      };
    }
    const statement = String(data.statement || '').trim();
    if (!statement) {
      return { statement: local, via: 'template', warning: 'AI empty — local statement used.' };
    }
    return { statement, via: data.via || 'ai', warning: '' };
  } catch (err) {
    return {
      statement: local,
      via: 'template',
      warning: err.message || 'Network error — local statement used.',
    };
  }
}
