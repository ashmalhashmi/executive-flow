export const PETTY_INVOICE_SYSTEM_PROMPT = `You are an invoice / bill OCR extraction engine for Pakistani petty cash Purchase Slips (PAFDA office).

TASK: Read the invoice or receipt image/text and return ONE JSON object for a Purchase Slip.

RULES:
1. Return ONLY valid JSON — no markdown.
2. Schema:
{
  "vendor": "shop / supplier name",
  "invoiceNo": "bill or invoice number",
  "date": "YYYY-MM-DD if visible else empty",
  "items": [
    {
      "description": "ONE product or line item only",
      "quantity": "qty or units as text",
      "unitCost": number or empty,
      "totalCost": number or empty
    }
  ],
  "amountPkr": number (grand total PKR, digits only),
  "paymentMode": "Cash / Petty Cash / etc."
}
3. Each distinct product / SKU / billed line MUST be its own items[] row.
   NEVER join two products into one description.
   Example: "Mix Biscuit Premium" and "Slab Cake" → two items, two rows.
4. Do not invent data — use empty string or 0 when missing.
5. amountPkr, unitCost, and totalCost must be numbers when present (not strings).`;

export function buildPettyInvoiceUserPrompt(textHint = '') {
  const hint = String(textHint || '').trim();
  if (hint) {
    return `Extract purchase slip fields from invoice. Split every product into a separate items[] row.\n\n---\n${hint}\n---\n\nReturn JSON only.`;
  }
  return 'Extract purchase slip fields from this invoice image. Each product is a separate items[] row. Return JSON only.';
}

function parseMoney(raw) {
  const n = Number(String(raw ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : '';
}

export function splitInvoiceDescription(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*])\s*/, '').trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;

  const parts = raw
    .split(/\s*(?:,|;|&|\band\b)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [raw];
}

function normalizeExtractedItem(row) {
  if (typeof row === 'string') {
    const description = row.trim();
    return description
      ? { description, quantity: '', unitCost: '', totalCost: '' }
      : null;
  }
  if (!row || typeof row !== 'object') return null;
  const description = String(row.description ?? row.item ?? row.name ?? '').trim();
  if (!description) return null;
  return {
    description,
    quantity: String(row.quantity ?? row.qty ?? '').trim(),
    unitCost: parseMoney(row.unitCost ?? row.rate ?? row.price ?? row.unit),
    totalCost: parseMoney(row.totalCost ?? row.amount ?? row.total ?? row.lineTotal),
  };
}

function itemsFromParsed(parsed) {
  if (Array.isArray(parsed.items)) {
    const fromArray = parsed.items.map(normalizeExtractedItem).filter(Boolean);
    if (fromArray.length === 1) {
      const parts = splitInvoiceDescription(fromArray[0].description);
      if (parts.length > 1) {
        return parts.map((description) => ({
          description,
          quantity: '',
          unitCost: '',
          totalCost: '',
        }));
      }
    }
    if (fromArray.length) return fromArray;
  }

  const description = String(
    parsed.description ?? (typeof parsed.items === 'string' ? parsed.items : '') ?? parsed.subject ?? '',
  ).trim();
  const parts = splitInvoiceDescription(description);
  const quantity = String(parsed.quantity ?? parsed.qty ?? '').trim();
  const amount = parseMoney(parsed.amountPkr ?? parsed.amount ?? parsed.total);
  if (!parts.length) return [];

  return parts.map((part, index) => ({
    description: part,
    quantity: parts.length === 1 ? quantity : '',
    unitCost: '',
    totalCost: parts.length === 1 ? amount : '',
  }));
}

export function parsePettyInvoiceJson(raw) {
  let cleaned = String(raw || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const amount = parseMoney(parsed.amountPkr ?? parsed.amount ?? parsed.total);
  const items = itemsFromParsed(parsed);
  const description =
    items.map((row) => row.description).filter(Boolean).join(', ') ||
    String(parsed.description ?? parsed.subject ?? '').trim();
  const quantity =
    items.length === 1
      ? items[0].quantity || String(parsed.quantity ?? parsed.qty ?? '').trim()
      : String(parsed.quantity ?? parsed.qty ?? '').trim();

  return {
    vendor: String(parsed.vendor ?? parsed.supplier ?? '').trim(),
    invoiceNo: String(parsed.invoiceNo ?? parsed.billNo ?? parsed.invoice ?? '').trim(),
    date: String(parsed.date ?? parsed.invoiceDate ?? '').trim(),
    description,
    quantity,
    amountPkr: amount,
    paymentMode: String(parsed.paymentMode ?? parsed.payment ?? 'Petty Cash').trim(),
    items,
  };
}

export function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('');
  const reason = data?.candidates?.[0]?.finishReason || '';
  return { text, reason };
}
