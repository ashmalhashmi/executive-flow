/**
 * Parse free-text souvenir presentation into { label, quantity }[].
 * Examples:
 *   "Crystal Award: 2, Leather Portfolio: 1"
 *   "2 pens, 3x coffee sets"
 *   "Fountain Pen - 6"
 */
export function parseSouvenirPresentationText(text) {
  if (!text?.trim()) return [];

  const items = [];
  const seen = new Set();

  const parts = text
    .split(/[\n;]+|,(?![^(]*\))/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    let label = '';
    let qty = 0;

    // "Label: 3" or "Label - 3" or "Label = 3"
    let m = part.match(/^(.+?)\s*[:=\-–]\s*(\d+)\s*$/u);
    if (m) {
      label = m[1].trim();
      qty = parseInt(m[2], 10);
    } else {
      // "3x Label" or "3 Label"
      m = part.match(/^(\d+)\s*x?\s+(.+)$/iu);
      if (m) {
        qty = parseInt(m[1], 10);
        label = m[2].trim();
      }
    }

    if (!label || !qty || qty < 1) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) {
      const existing = items.find((i) => i.label.toLowerCase() === key);
      if (existing) existing.quantity += qty;
    } else {
      seen.add(key);
      items.push({ label, quantity: qty });
    }
  }

  return items;
}
