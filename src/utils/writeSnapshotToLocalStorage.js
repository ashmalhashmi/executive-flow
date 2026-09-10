/**
 * Write cloud snapshot into localStorage — same keys as ExecutiveContext.
 * Used by emergency /restore page only; overwrites local domains from cloud.
 */
export function writeSnapshotToLocalStorage(snapshotData) {
  if (!snapshotData || typeof snapshotData !== 'object') {
    throw new Error('Snapshot data invalid hai');
  }

  localStorage.setItem('executive_flow_meetings', JSON.stringify(snapshotData.meetings ?? []));
  localStorage.setItem('executive_flow_souvenirs', JSON.stringify(snapshotData.souvenirs ?? []));
  localStorage.setItem(
    'executive_flow_expenditure',
    JSON.stringify({
      openingBalance: Number(snapshotData.expenditure?.openingBalance) || 0,
      openingBalanceDate: String(snapshotData.expenditure?.openingBalanceDate ?? '').trim(),
      expenditures: Array.isArray(snapshotData.expenditure?.expenditures)
        ? snapshotData.expenditure.expenditures
        : [],
    }),
  );
  localStorage.setItem('executive_flow_orders', JSON.stringify(snapshotData.orders ?? []));
  localStorage.setItem('executive_flow_dak', JSON.stringify(snapshotData.dak ?? []));
  localStorage.setItem('executive_flow_tasks', JSON.stringify(snapshotData.tasks ?? []));
  localStorage.setItem('executive_flow_captures', JSON.stringify(snapshotData.captures ?? []));
  localStorage.setItem('executive_flow_contacts', JSON.stringify(snapshotData.contacts ?? []));
  localStorage.setItem(
    'executive_flow_petty_cash',
    JSON.stringify({
      cases: Array.isArray(snapshotData.pettyCash?.cases) ? snapshotData.pettyCash.cases : [],
      refreshmentNotes: Array.isArray(snapshotData.pettyCash?.refreshmentNotes)
        ? snapshotData.pettyCash.refreshmentNotes
        : [],
    }),
  );
  localStorage.setItem(
    'executive_flow_file_labels',
    JSON.stringify(Array.isArray(snapshotData.fileLabels) ? snapshotData.fileLabels : []),
  );

  const settings = snapshotData.settings && typeof snapshotData.settings === 'object'
    ? snapshotData.settings
    : {};
  if (settings.dakClearedAt) {
    localStorage.setItem(
      'executive_flow_dak_cleared_at',
      JSON.stringify(settings.dakClearedAt),
    );
  }
  if (settings.morningMeetingBoard) {
    localStorage.setItem(
      'executive_flow_morning_board',
      JSON.stringify(settings.morningMeetingBoard),
    );
  }
  if (settings.weeklyExpenditureEmail) {
    localStorage.setItem(
      'executive_flow_weekly_expenditure_email',
      JSON.stringify(settings.weeklyExpenditureEmail),
    );
  }
  if (settings.pettyCashSignatures) {
    localStorage.setItem(
      'executive_flow_petty_cash_signatures',
      JSON.stringify(settings.pettyCashSignatures),
    );
  }
}

export function summarizeSnapshotCounts(snapshotData) {
  const d = snapshotData || {};
  const exp = d.expenditure?.expenditures ?? [];
  return {
    meetings: (d.meetings ?? []).length,
    souvenirs: (d.souvenirs ?? []).length,
    expenditures: exp.length,
    orders: (d.orders ?? []).length,
    dak: (d.dak ?? []).filter((x) => x.status !== 'cancelled').length,
    tasks: (d.tasks ?? []).filter((x) => x.status !== 'cancelled').length,
    contacts: (d.contacts ?? []).filter((c) => c.status !== 'archived').length,
    fileLabels: (d.fileLabels ?? []).length,
  };
}
