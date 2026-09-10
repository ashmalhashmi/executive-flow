/**
 * Official PAFDA plate / file-label identity.
 * Acronym + legal name are template-owned (never user-editable).
 */
export const PAFDA_LABEL_IDENTITY = {
  acronym: 'PAFDA',
  legalName: 'Punjab Agriculture, Food and Drug Authority',
  colors: {
    forest: '#1B4D3E',
    gold: '#C5A35A',
    slate: '#3A4549',
    ink: '#1C1C1C',
    forestRgb: [27, 77, 62],
    goldRgb: [197, 163, 90],
    slateRgb: [58, 69, 73],
    inkRgb: [28, 28, 28],
  },
};

const FOREST = PAFDA_LABEL_IDENTITY.colors.forest;
const GOLD = PAFDA_LABEL_IDENTITY.colors.gold;

/** Physical size of one official plate (mm) — landscape default. */
export const FILE_LABEL_SIZE = {
  widthMm: 140,
  heightMm: 72,
};

export const FILE_LABEL_ORIENTATIONS = {
  landscape: {
    id: 'landscape',
    label: 'Landscape',
    page: 'landscape',
    widthMm: 140,
    heightMm: 72,
    previewW: 400,
    previewH: 206,
    wordW: 400,
    wordH: 206,
  },
  portrait: {
    id: 'portrait',
    label: 'Portrait',
    page: 'portrait',
    widthMm: 72,
    heightMm: 140,
    previewW: 206,
    previewH: 400,
    wordW: 206,
    wordH: 400,
  },
};

export function getFileLabelBox(orientation) {
  return FILE_LABEL_ORIENTATIONS[orientation] || FILE_LABEL_ORIENTATIONS.landscape;
}

export const FILE_LABEL_TITLE = 'Box / File Label';

export const FILE_LABEL_NAME_SIZES = {
  sm: { id: 'sm', label: 'Small', pdfPt: 12, previewPx: 13, wordPt: 12 },
  md: { id: 'md', label: 'Medium', pdfPt: 16, previewPx: 18, wordPt: 16 },
  lg: { id: 'lg', label: 'Large', pdfPt: 20, previewPx: 22, wordPt: 20 },
};

/** Designation type size (pt) — preview / PDF / Word. */
export const FILE_LABEL_FONT_SIZES = [10, 12, 14, 16, 18, 20, 22, 24];

export function resolveFileLabelFontSize(raw) {
  const n = Number(raw?.fontSize);
  if (FILE_LABEL_FONT_SIZES.includes(n)) return n;
  if (raw?.nameSize === 'sm') return 12;
  if (raw?.nameSize === 'lg') return 20;
  if (raw?.nameSize === 'md') return 16;
  return 16;
}

export function fileLabelTypeFromPt(pt) {
  const size = FILE_LABEL_FONT_SIZES.includes(Number(pt)) ? Number(pt) : 16;
  return {
    pdfPt: size,
    wordPt: size,
    previewPx: Math.round(size * 1.12),
  };
}

function nameSizeFromFontPt(pt) {
  if (pt <= 12) return 'sm';
  if (pt <= 16) return 'md';
  return 'lg';
}

export const FILE_LABEL_LOGO_SIZES = {
  compact: {
    id: 'compact',
    label: 'Compact',
    pdfMaxW: 40,
    wordMaxW: 120,
    wordMaxH: 52,
    previewW: 110,
    previewH: 50,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    pdfMaxW: 54,
    wordMaxW: 168,
    wordMaxH: 72,
    previewW: 160,
    previewH: 72,
  },
  large: {
    id: 'large',
    label: 'Large',
    pdfMaxW: 68,
    wordMaxW: 200,
    wordMaxH: 86,
    previewW: 190,
    previewH: 82,
  },
};

/**
 * File-label border presets.
 * kind: none | solid | dashed | dotted | double | triple | rounded | corners
 */
export const FILE_LABEL_BORDERS = {
  none: {
    id: 'none',
    label: 'None',
    kind: 'none',
    pdfWidth: 0,
    wordCss: 'none',
    preview: 'none',
  },
  thin: {
    id: 'thin',
    label: 'Thin',
    kind: 'solid',
    pdfWidth: 0.4,
    wordCss: `1.25pt solid ${FOREST}`,
    preview: `1px solid ${FOREST}`,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    kind: 'solid',
    pdfWidth: 0.65,
    wordCss: `1.75pt solid ${FOREST}`,
    preview: `2px solid ${FOREST}`,
  },
  thick: {
    id: 'thick',
    label: 'Thick',
    kind: 'solid',
    pdfWidth: 0.9,
    wordCss: `2.5pt solid ${FOREST}`,
    preview: `3px solid ${FOREST}`,
  },
  heavy: {
    id: 'heavy',
    label: 'Heavy',
    kind: 'solid',
    pdfWidth: 1.45,
    wordCss: `3.75pt solid ${FOREST}`,
    preview: `5px solid ${FOREST}`,
  },
  dashed: {
    id: 'dashed',
    label: 'Dashed',
    kind: 'dashed',
    pdfWidth: 0.55,
    pdfDash: [2.4, 1.5],
    wordCss: `1.75pt dashed ${FOREST}`,
    preview: `2px dashed ${FOREST}`,
  },
  dotted: {
    id: 'dotted',
    label: 'Dotted',
    kind: 'dotted',
    pdfWidth: 0.55,
    pdfDash: [0.45, 0.85],
    wordCss: `1.75pt dotted ${FOREST}`,
    preview: `2px dotted ${FOREST}`,
  },
  double: {
    id: 'double',
    label: 'Double',
    kind: 'double',
    pdfWidth: 0.4,
    pdfInnerGap: 1.35,
    pdfInnerWidth: 0.32,
    wordCss: `3pt double ${FOREST}`,
    preview: `3px double ${FOREST}`,
  },
  triple: {
    id: 'triple',
    label: 'Triple',
    kind: 'triple',
    pdfWidth: 0.38,
    pdfInnerGap: 1.15,
    pdfMidGap: 2.25,
    pdfInnerWidth: 0.28,
    wordCss: `1.5pt solid ${FOREST}`,
    preview: `2px solid ${FOREST}`,
  },
  rounded: {
    id: 'rounded',
    label: 'Rounded',
    kind: 'rounded',
    pdfWidth: 0.55,
    pdfRadius: 2.6,
    wordCss: `1.75pt solid ${FOREST}`,
    wordRadius: '8pt',
    preview: `2px solid ${FOREST}`,
    previewRadius: 10,
  },
  corners: {
    id: 'corners',
    label: 'Corners',
    kind: 'corners',
    pdfWidth: 0.7,
    pdfCornerLen: 8,
    wordCss: 'none',
    preview: 'none',
  },
};

export function fileLabelPreviewBorderStyle(spec) {
  const kind = spec?.kind || 'solid';
  if (kind === 'none') return { border: 'none' };
  if (kind === 'corners') {
    return {
      border: 'none',
      backgroundImage: [
        `linear-gradient(${FOREST},${FOREST})`,
        `linear-gradient(${FOREST},${FOREST})`,
        `linear-gradient(${FOREST},${FOREST})`,
        `linear-gradient(${FOREST},${FOREST})`,
        `linear-gradient(${FOREST},${FOREST})`,
        `linear-gradient(${FOREST},${FOREST})`,
        `linear-gradient(${FOREST},${FOREST})`,
        `linear-gradient(${FOREST},${FOREST})`,
      ].join(','),
      backgroundRepeat: 'no-repeat',
      backgroundSize:
        '18px 2px, 2px 18px, 18px 2px, 2px 18px, 18px 2px, 2px 18px, 18px 2px, 2px 18px',
      backgroundPosition:
        'left top, left top, right top, right top, left bottom, left bottom, right bottom, right bottom',
    };
  }
  if (kind === 'triple') {
    return {
      border: spec.preview,
      boxShadow: `inset 0 0 0 3px #fff, inset 0 0 0 5px ${GOLD}, inset 0 0 0 8px #fff, inset 0 0 0 10px ${FOREST}`,
    };
  }
  if (kind === 'rounded') {
    return {
      border: spec.preview,
      borderRadius: spec.previewRadius || 10,
    };
  }
  return { border: spec.preview };
}

export const DEFAULT_FILE_LABEL_FORMAT = {
  nameSize: 'md',
  fontSize: 16,
  nameWeight: 'bold',
  nameAlign: 'center',
  logoSize: 'compact',
  border: 'double',
  orientation: 'landscape',
  copies: 1,
};

/** How many identical plates to preview / print (scrollable select). */
export const FILE_LABEL_COPIES_MAX = 30;

export function resolveFileLabelCopies(raw) {
  const n = Math.round(Number(raw?.copies));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(FILE_LABEL_COPIES_MAX, n);
}

export function resolveFileLabelFormat(raw) {
  const fontSize = resolveFileLabelFontSize(raw);
  const weight = raw?.nameWeight === 'regular' ? 'regular' : 'bold';
  const logo = FILE_LABEL_LOGO_SIZES[raw?.logoSize] ? raw.logoSize : DEFAULT_FILE_LABEL_FORMAT.logoSize;
  const border = FILE_LABEL_BORDERS[raw?.border] ? raw.border : DEFAULT_FILE_LABEL_FORMAT.border;
  const orientation =
    raw?.orientation === 'portrait' ? 'portrait' : DEFAULT_FILE_LABEL_FORMAT.orientation;
  const copies = resolveFileLabelCopies(raw);
  return {
    nameSize: nameSizeFromFontPt(fontSize),
    fontSize,
    nameWeight: weight,
    nameAlign: 'center',
    logoSize: logo,
    border,
    orientation,
    copies,
  };
}
