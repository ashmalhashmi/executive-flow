/**
 * Cloud import safety — never wipe a non-empty local domain with an empty
 * incoming list when the snapshot still has other domain data (partial / stale pulse).
 */

export function snapshotHasOtherDomainData(data, skipKey = '') {
  const checks = {
    meetings: Array.isArray(data?.meetings) && data.meetings.length > 0,
    souvenirs: Array.isArray(data?.souvenirs) && data.souvenirs.length > 0,
    orders: Array.isArray(data?.orders) && data.orders.length > 0,
    dak: Array.isArray(data?.dak) && data.dak.length > 0,
    tasks: Array.isArray(data?.tasks) && data.tasks.length > 0,
    captures: Array.isArray(data?.captures) && data.captures.length > 0,
    contacts: Array.isArray(data?.contacts) && data.contacts.length > 0,
    pettyCash:
      (Array.isArray(data?.pettyCash?.cases) && data.pettyCash.cases.length > 0) ||
      (Array.isArray(data?.pettyCash?.refreshmentNotes) &&
        data.pettyCash.refreshmentNotes.length > 0),
    fileLabels: Array.isArray(data?.fileLabels) && data.fileLabels.length > 0,
    expenditures:
      Array.isArray(data?.expenditure?.expenditures) &&
      data.expenditure.expenditures.length > 0,
    openingBalance: Number(data?.expenditure?.openingBalance) > 0,
  };
  return Object.entries(checks).some(([key, present]) => key !== skipKey && present);
}

/** Keep local list when cloud sends [] but other domains in same snapshot still have data. */
export function preferLocalListIfIncomingEmpty(prev, incoming, data, skipKey) {
  const next = Array.isArray(incoming) ? incoming : [];
  if (next.length > 0) return next;
  if (!Array.isArray(prev) || !prev.length) return next;
  if (snapshotHasOtherDomainData(data, skipKey)) return prev;
  return next;
}

/** Expenditure: refuse empty wipe of opening + rows when other domains present. */
export function preferLocalExpenditureIfIncomingEmpty(prev, data) {
  const incoming = {
    openingBalance: Number(data?.expenditure?.openingBalance) || 0,
    openingBalanceDate: String(data?.expenditure?.openingBalanceDate ?? '').trim(),
    expenditures: Array.isArray(data?.expenditure?.expenditures)
      ? data.expenditure.expenditures
      : [],
  };

  const incomingEmpty =
    incoming.expenditures.length === 0 &&
    incoming.openingBalance <= 0 &&
    !incoming.openingBalanceDate;
  const prevHasData =
    (Array.isArray(prev?.expenditures) && prev.expenditures.length > 0) ||
    Number(prev?.openingBalance) > 0 ||
    Boolean(prev?.openingBalanceDate);

  if (!incomingEmpty) return incoming;
  if (!prevHasData) return incoming;
  if (snapshotHasOtherDomainData(data, 'expenditures') || snapshotHasOtherDomainData(data, 'openingBalance')) {
    return prev;
  }
  return incoming;
}
