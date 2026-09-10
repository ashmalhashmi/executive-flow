/** Shared Petty Cash document formatting — PDF, Word, email. */

export const PETTY_CASH_BLANK = '___________________________';

export function escapePettyCashHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function underlineValueHtml(value, width = 28) {
  const text = String(value ?? '').trim();
  if (text) return escapePettyCashHtml(text);
  return '_'.repeat(width);
}

export function signatureLineHtml() {
  return `<span style="display:inline-block; min-width:220pt; border-bottom:1px solid #333;">&nbsp;</span>`;
}

export function buildSignatoryBlockHtml({ title, name, date }) {
  return `<p style="margin:18pt 0 6pt 0; font-weight:bold;">${title}</p>
<p style="margin:0 0 6pt 0;">Name: ${underlineValueHtml(name)}</p>
<p style="margin:0 0 6pt 0;">Date: ${underlineValueHtml(date)}</p>
<p style="margin:0 0 12pt 0;">Signature: ${signatureLineHtml()}</p>`;
}

export const PETTY_CASH_DOC_TITLE_STYLE =
  'text-align:center; font-size:14pt; font-weight:bold; margin:18pt 0 12pt 0;';

export const PETTY_CASH_TABLE_CELL =
  "border:1px solid #333; padding:6pt 8pt; font-family:'Times New Roman',Times,serif; font-size:11pt;";

export function pettyCashHeadCellStyle(cellStyle) {
  return `${cellStyle} font-weight:bold; background:#f5f5f5;`;
}
