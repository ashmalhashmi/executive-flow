/** Shared Petty Cash document formatting — server email attachments. */

export const PETTY_CASH_BLANK = '___________________________';

export const PETTY_CASH_ORG_TITLE =
  'Punjab Agriculture, Food & Drug Authority (PAFDA)';
export const PETTY_CASH_GOV_LINE = 'Government of the Punjab';

export const PETTY_CASH_DOC_TITLE_STYLE =
  'text-align:center; font-size:14pt; font-weight:bold; margin:6pt 0 12pt 0;';

export const PETTY_CASH_TABLE_CELL =
  "border:1px solid #333; padding:6pt 8pt; font-family:'Times New Roman',Times,serif; font-size:11pt;";

export function pettyCashHeadCellStyle(cellStyle) {
  return `${cellStyle} font-weight:bold; background:#f5f5f5;`;
}

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

const QTY_UNIT_RE =
  /\b(kgs?|g|gm|grams?|ml|ltrs?|litres?|liters?|l|pcs?|pc|pkt|packs?|packets?|dozen|doz|nos?|units?|pieces?|boxes?|bottles?|tins?)\b/i;

export function formatPettyCashQuantity(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '—';
  if (QTY_UNIT_RE.test(text)) return text.replace(/\s+/g, ' ');
  const n = Number(String(text).replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return text;
  if (!Number.isInteger(n) || String(text).includes('.')) return `${n} kg`;
  return `${n} pcs`;
}

export function formatPettyCashTableMoney(value) {
  const cleaned = String(value ?? '')
    .replace(/\brs\.?\s*/gi, '')
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** @deprecated use formatPettyCashTableMoney — kept for existing email table cells */
export function formatPettyCashMoney(value) {
  return formatPettyCashTableMoney(value);
}

export function designationRepeatsTitle(title, designation) {
  const des = String(designation ?? '').trim().toLowerCase();
  const heading = String(title ?? '').toLowerCase();
  if (!des) return true;
  return heading.includes(des);
}

function buildHeaderLogoHtml({ logoDataUrl = '', logoWidth = 0, logoHeight = 0 } = {}) {
  const src = String(logoDataUrl || '').trim();
  if (!src.startsWith('data:image/')) return '';
  const w = Number(logoWidth) || 210;
  const h = Number(logoHeight) || 0;
  const sizeAttrs =
    h > 0
      ? `width="${w}" height="${h}" style="width:${w}px;height:${h}px;display:block;margin:0 auto;"`
      : `width="${w}" style="width:${w}px;height:auto;display:block;margin:0 auto;"`;
  return `<p style="text-align:center; margin:0 0 8pt 0;">
<img src="${src}" ${sizeAttrs} alt="PAFDA" />
</p>`;
}

export function buildOfficialHeaderHtml(logo = {}) {
  return `${buildHeaderLogoHtml(logo)}<p style="text-align:center; font-size:14pt; font-weight:bold; margin:0 0 2pt 0; font-family:'Times New Roman',Times,serif;">${escapePettyCashHtml(PETTY_CASH_ORG_TITLE)}</p>
<p style="text-align:center; font-size:11pt; margin:0 0 16pt 0; font-family:'Times New Roman',Times,serif;">${escapePettyCashHtml(PETTY_CASH_GOV_LINE)}</p>`;
}

export function buildSignatoryBlockHtml({ title, name, designation = '', date }) {
  const shownDesignation = designationRepeatsTitle(title, designation)
    ? ''
    : String(designation ?? '').trim();
  return `<p style="margin:18pt 0 6pt 0; font-weight:bold;">${title}</p>
<p style="margin:0 0 6pt 0;">Name: ${underlineValueHtml(name)}</p>
<p style="margin:0 0 6pt 0;">Designation: ${underlineValueHtml(shownDesignation)}</p>
<p style="margin:0 0 6pt 0;">Date: ${underlineValueHtml(date)}</p>
<p style="margin:0 0 12pt 0;">Signature: ${signatureLineHtml()}</p>`;
}
