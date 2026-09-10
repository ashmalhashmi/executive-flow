export const PETTY_INVOICE_SYSTEM_PROMPT = `You are an invoice / bill OCR extraction engine for Pakistani petty cash Purchase Slips (PAFDA office).

TASK: Read the invoice or receipt image/text and return ONE JSON object for a Purchase Slip.

RULES:
1. Return ONLY valid JSON — no markdown.
2. Schema:
{
  "vendor": "shop / supplier name",
  "invoiceNo": "bill or invoice number",
  "date": "YYYY-MM-DD if visible else empty",
  "description": "items purchased (short)",
  "quantity": "qty or units as text",
  "amountPkr": number (total PKR amount, digits only),
  "paymentMode": "Cash / Petty Cash / etc."
}
3. Do not invent data — use empty string or 0 when missing.
4. amountPkr must be a number (not string).`;

export function buildPettyInvoiceUserPrompt(textHint = '') {
  const hint = String(textHint || '').trim();
  if (hint) {
    return `Extract purchase slip fields from invoice:\n\n---\n${hint}\n---\n\nReturn JSON only.`;
  }
  return 'Extract purchase slip fields from this invoice image. Return JSON only.';
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

  const amount = Number(parsed.amountPkr ?? parsed.amount ?? parsed.total);
  return {
    vendor: String(parsed.vendor ?? parsed.supplier ?? '').trim(),
    invoiceNo: String(parsed.invoiceNo ?? parsed.billNo ?? parsed.invoice ?? '').trim(),
    date: String(parsed.date ?? parsed.invoiceDate ?? '').trim(),
    description: String(parsed.description ?? parsed.items ?? parsed.subject ?? '').trim(),
    quantity: String(parsed.quantity ?? parsed.qty ?? '').trim(),
    amountPkr: Number.isFinite(amount) && amount > 0 ? amount : '',
    paymentMode: String(parsed.paymentMode ?? parsed.payment ?? 'Petty Cash').trim(),
  };
}

export function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('');
  const reason = data?.candidates?.[0]?.finishReason || '';
  return { text, reason };
}
