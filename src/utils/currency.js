/** Format amount in Pakistani Rupees */
export function formatPKR(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'Rs. 0';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Parse user input like "1,500" or "1500.50" */
export function parsePKRInput(value) {
  if (value === '' || value == null) return NaN;
  const cleaned = String(value).replace(/,/g, '').trim();
  return parseFloat(cleaned);
}
