/** Addressee presets — user can pick "Other" and type name / designation manually */
export const DAK_DESIGNATION_OPTIONS = [
  'COO',
  'CIA',
  'CFO',
  'PD',
  'Mem(Pharma)',
  'Mem(Food)',
  'Mem(Agri)',
  'Mem(R&T)',
  'GM(Proc)',
  'GM(Fin)',
  'GM(Comm)',
  'GM(IT)',
  'GM(HR&Admin)',
  'GM(Legal)',
  'Manager(IT)',
  'Manager(Comm)',
];

export const DAK_DESIGNATION_CUSTOM = '__custom__';

export function resolveDakDesignation(preset, customText) {
  if (preset === DAK_DESIGNATION_CUSTOM) {
    return String(customText ?? '').trim();
  }
  return String(preset ?? '').trim();
}

export function designationToFormValue(storedDesignation) {
  const d = String(storedDesignation ?? '').trim();
  if (DAK_DESIGNATION_OPTIONS.includes(d)) {
    return { preset: d, custom: '' };
  }
  return { preset: DAK_DESIGNATION_CUSTOM, custom: d };
}
