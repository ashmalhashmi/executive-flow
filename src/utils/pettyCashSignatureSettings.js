const STORAGE_KEY = 'executive_flow_petty_cash_signatures';

export const DEFAULT_PETTY_CASH_SIGNATURES = {
  purchaseSlip: [
    { name: 'Ashmal Hashmi', designation: 'PS to DG PAFDA', useSignatureImage: false },
  ],
  purchaseSlipApprover: {
    name: '',
    designation: '',
    useSignatureImage: false,
  },
  satisfactoryNote: [
    { name: '', designation: '', useSignatureImage: false },
  ],
  refreshmentIssuer: {
    name: 'Ashmal Hashmi',
    designation: 'PS to DG PAFDA',
    useSignatureImage: true,
  },
};

function normalizeSignatory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name ?? '').trim();
  const designation = String(raw.designation ?? '').trim();
  if (!name && !designation) return null;
  return {
    name,
    designation,
    useSignatureImage: Boolean(raw.useSignatureImage),
  };
}

export function loadPettyCashSignatures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PETTY_CASH_SIGNATURES };
    const parsed = JSON.parse(raw);
    const purchaseSlip = Array.isArray(parsed.purchaseSlip)
      ? parsed.purchaseSlip.map(normalizeSignatory).filter(Boolean)
      : DEFAULT_PETTY_CASH_SIGNATURES.purchaseSlip;
    const satisfactoryNote = Array.isArray(parsed.satisfactoryNote)
      ? parsed.satisfactoryNote.map(normalizeSignatory).filter(Boolean)
      : DEFAULT_PETTY_CASH_SIGNATURES.satisfactoryNote;
    const issuer = normalizeSignatory(parsed.refreshmentIssuer) ||
      DEFAULT_PETTY_CASH_SIGNATURES.refreshmentIssuer;
    const approver = normalizeSignatory(parsed.purchaseSlipApprover) ||
      DEFAULT_PETTY_CASH_SIGNATURES.purchaseSlipApprover;
    return {
      purchaseSlip: purchaseSlip.length ? purchaseSlip : DEFAULT_PETTY_CASH_SIGNATURES.purchaseSlip,
      purchaseSlipApprover: approver,
      satisfactoryNote,
      refreshmentIssuer: issuer,
    };
  } catch {
    return { ...DEFAULT_PETTY_CASH_SIGNATURES };
  }
}

export function savePettyCashSignatures(settings) {
  const next = {
    purchaseSlip: (settings.purchaseSlip || [])
      .map(normalizeSignatory)
      .filter(Boolean),
    satisfactoryNote: (settings.satisfactoryNote || [])
      .map(normalizeSignatory)
      .filter(Boolean),
    refreshmentIssuer:
      normalizeSignatory(settings.refreshmentIssuer) ||
      DEFAULT_PETTY_CASH_SIGNATURES.refreshmentIssuer,
    purchaseSlipApprover:
      normalizeSignatory(settings.purchaseSlipApprover) ||
      DEFAULT_PETTY_CASH_SIGNATURES.purchaseSlipApprover,
  };
  if (!next.purchaseSlip.length) {
    next.purchaseSlip = [...DEFAULT_PETTY_CASH_SIGNATURES.purchaseSlip];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
