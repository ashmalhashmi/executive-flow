import {
  FILE_LABEL_BORDERS,
  FILE_LABEL_TITLE,
  PAFDA_LABEL_IDENTITY,
  fileLabelTypeFromPt,
  getFileLabelBox,
  resolveFileLabelFormat,
} from '../constants/labelTemplates';
import { fileLabelFilenameStem, normalizeFileLabelDesignation } from './fileLabelEntries';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildFileLabelDocHtml({
  name,
  ...formatRaw
}) {
  const identity = PAFDA_LABEL_IDENTITY;
  const { forest, gold, slate, ink } = identity.colors;
  const title = escapeHtml(normalizeFileLabelDesignation(name) || '—');
  const format = resolveFileLabelFormat(formatRaw);
  const type = fileLabelTypeFromPt(format.fontSize);
  const box = getFileLabelBox(format.orientation);
  const isPortrait = format.orientation === 'portrait';
  const weight = format.nameWeight === 'regular' ? 'normal' : 'bold';
  const borderSpec = FILE_LABEL_BORDERS[format.border];
  const pageSize = isPortrait ? 'A4' : 'A4 landscape';
  const namePt = isPortrait ? Math.min(type.wordPt, 16) : type.wordPt;
  const acrPt = isPortrait ? 13 : 16;
  const legalPt = isPortrait ? 7 : 8.5;
  const copies = format.copies;

  const goldDivider = `<tr>
    <td style="border:none; padding:2pt 20pt 8pt 20pt; text-align:center;">
      <table align="center" style="width:48%; border:none; border-collapse:collapse;">
        <tr>
          <td style="border:none; border-bottom:1pt solid ${gold}; font-size:2pt; line-height:2pt;">&nbsp;</td>
          <td style="width:10pt; border:none; color:${gold}; font-size:7pt; text-align:center;">&#9670;</td>
          <td style="border:none; border-bottom:1pt solid ${gold}; font-size:2pt; line-height:2pt;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>`;

  const inner = `<tr>
    <td style="border:none; padding:14pt 10pt 0 10pt; text-align:center;">
      <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:${acrPt}pt; font-weight:bold; letter-spacing:3pt; color:${forest};">${escapeHtml(identity.acronym)}</p>
    </td>
  </tr>
  <tr>
    <td style="border:none; padding:3pt 14pt 5pt 14pt; text-align:center;">
      <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:${legalPt}pt; font-weight:normal; color:${slate}; line-height:1.3;">${escapeHtml(identity.legalName)}</p>
    </td>
  </tr>
  ${goldDivider}
  <tr>
    <td style="border:none; padding:4pt 14pt 14pt 14pt; text-align:center; vertical-align:middle;">
      <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:${namePt}pt; font-weight:${weight}; color:${ink}; text-align:center; line-height:1.25;">${title}</p>
    </td>
  </tr>`;

  const plates = Array.from({ length: copies }, (_, i) => {
    const pageBreak = i > 0 ? '<br clear="all" style="page-break-before:always;" />' : '';
    return `${pageBreak}${wrapFileLabelWordTable(inner, box, borderSpec)}`;
  }).join('\n');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${FILE_LABEL_TITLE} — ${title}</title>
<!--[if gte mso 9]><xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
 </w:WordDocument>
</xml><![endif]-->
<style>
  @page { size: ${pageSize}; margin: 18mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; }
</style>
</head>
<body>
${plates}
</body>
</html>`;
}

function wrapFileLabelWordTable(innerRows, box, spec) {
  const size = `width:${box.wordW}pt; height:${box.wordH}pt;`;
  const margin = 'margin:48pt auto 0 auto;';
  const kind = spec?.kind || 'solid';
  const forest = PAFDA_LABEL_IDENTITY.colors.forest;
  const gold = PAFDA_LABEL_IDENTITY.colors.gold;

  if (kind === 'triple') {
    return `<table align="center" style="${size} border:1.75pt solid ${forest}; border-collapse:collapse; ${margin}">
  <tr><td style="padding:3.5pt; border:1.2pt solid ${gold};">
    <table style="width:100%; height:100%; border:1pt solid ${forest}; border-collapse:collapse;">${innerRows}</table>
  </td></tr>
</table>`;
  }

  if (kind === 'corners') {
    const arm = '16pt';
    const bw = `1.75pt solid ${forest}`;
    return `<table align="center" style="${size} border:none; border-collapse:collapse; ${margin}">
  <tr>
    <td style="width:${arm}; height:${arm}; border-top:${bw}; border-left:${bw};"></td>
    <td style="border:none;"></td>
    <td style="width:${arm}; border-top:${bw}; border-right:${bw};"></td>
  </tr>
  <tr>
    <td style="border:none;"></td>
    <td style="border:none; vertical-align:middle;">
      <table style="width:100%; border:none; border-collapse:collapse;">${innerRows}</table>
    </td>
    <td style="border:none;"></td>
  </tr>
  <tr>
    <td style="height:${arm}; border-bottom:${bw}; border-left:${bw};"></td>
    <td style="border:none;"></td>
    <td style="border-bottom:${bw}; border-right:${bw};"></td>
  </tr>
</table>`;
  }

  const css = spec.wordCss === 'none' || kind === 'none' ? 'none' : spec.wordCss;
  const radius = kind === 'rounded' && spec.wordRadius ? `border-radius:${spec.wordRadius};` : '';
  return `<table align="center" style="${size} border:${css}; border-collapse:collapse; ${radius} ${margin}">
  ${innerRows}
</table>`;
}

export function downloadWordHtml(html, filename) {
  const blob = new Blob([`\ufeff${html}`], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  link.click();
  URL.revokeObjectURL(url);
}

async function withPlateHtml(options) {
  const format = resolveFileLabelFormat(options);
  const html = buildFileLabelDocHtml({
    ...format,
    name: options.name,
  });
  const filename = `file-label-${fileLabelFilenameStem(options.name)}-${new Date().toISOString().slice(0, 10)}.doc`;
  return { html, filename };
}

export async function downloadFileLabelWord(options) {
  const { html, filename } = await withPlateHtml(options);
  downloadWordHtml(html, filename);
  return filename;
}

export function wordHtmlToBase64(html) {
  const bytes = new TextEncoder().encode(`\ufeff${html}`);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function buildFileLabelDocBase64(options) {
  const { html, filename } = await withPlateHtml(options);
  return { filename, base64: wordHtmlToBase64(html), html };
}
