export const BACKUP_VERSION = 1;
export const BACKUP_APP_ID = 'executive-flow';

export function buildAppSnapshot({
  meetings,
  souvenirs,
  expenditureState,
  orders,
  dakEntries,
  taskEntries,
  captureEntries,
  contacts,
  settings,
}) {
  return {
    version: BACKUP_VERSION,
    app: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    data: {
      meetings: Array.isArray(meetings) ? meetings : [],
      souvenirs: Array.isArray(souvenirs) ? souvenirs : [],
      expenditure: {
        openingBalance: Number(expenditureState?.openingBalance) || 0,
        openingBalanceDate: String(expenditureState?.openingBalanceDate ?? '').trim(),
        expenditures: Array.isArray(expenditureState?.expenditures)
          ? expenditureState.expenditures
          : [],
      },
      orders: Array.isArray(orders) ? orders : [],
      dak: Array.isArray(dakEntries) ? dakEntries : [],
      tasks: Array.isArray(taskEntries) ? taskEntries : [],
      captures: Array.isArray(captureEntries) ? captureEntries : [],
      contacts: Array.isArray(contacts) ? contacts : [],
      settings: settings && typeof settings === 'object' ? settings : {},
    },
  };
}

export function validateBackup(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'File valid JSON backup nahi hai' };
  }
  if (raw.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'Yeh Executive Flow ki backup file nahi lagti' };
  }
  if (!raw.data || typeof raw.data !== 'object') {
    return { ok: false, error: 'Backup mein data missing hai' };
  }

  const { meetings, souvenirs, expenditure, orders, dak, tasks, captures, contacts, settings } =
    raw.data;

  if (meetings != null && !Array.isArray(meetings)) {
    return { ok: false, error: 'Meetings data invalid hai' };
  }
  if (souvenirs != null && !Array.isArray(souvenirs)) {
    return { ok: false, error: 'Souvenirs data invalid hai' };
  }
  if (expenditure != null && typeof expenditure !== 'object') {
    return { ok: false, error: 'Expenditure data invalid hai' };
  }
  if (orders != null && !Array.isArray(orders)) {
    return { ok: false, error: 'Orders data invalid hai' };
  }
  if (dak != null && !Array.isArray(dak)) {
    return { ok: false, error: 'Dak data invalid hai' };
  }
  if (tasks != null && !Array.isArray(tasks)) {
    return { ok: false, error: 'Tasks data invalid hai' };
  }
  if (captures != null && !Array.isArray(captures)) {
    return { ok: false, error: 'Captures data invalid hai' };
  }
  if (contacts != null && !Array.isArray(contacts)) {
    return { ok: false, error: 'Contacts data invalid hai' };
  }

  return {
    ok: true,
    data: {
      meetings: meetings ?? [],
      souvenirs: souvenirs ?? [],
      expenditure: {
        openingBalance: Number(expenditure?.openingBalance) || 0,
        openingBalanceDate: String(expenditure?.openingBalanceDate ?? '').trim(),
        expenditures: Array.isArray(expenditure?.expenditures) ? expenditure.expenditures : [],
      },
      orders: orders ?? [],
      dak: dak ?? [],
      tasks: tasks ?? [],
      captures: captures ?? [],
      contacts: contacts ?? [],
      settings: settings && typeof settings === 'object' ? settings : {},
    },
    exportedAt: raw.exportedAt,
  };
}

export function downloadBackup(snapshot) {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `executive-flow-backup-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File read nahi ho saki — valid JSON file choose karein' };
  }
  return validateBackup(parsed);
}

export function summarizeBackup(data) {
  const meetings = data.meetings ?? [];
  const expTotal = (data.expenditure?.expenditures ?? []).length;
  return {
    meetings: meetings.length,
    calendarMeetings: meetings.filter((m) => m.scheduledViaCalendar === true).length,
    souvenirs: data.souvenirs?.length ?? 0,
    expenditures: expTotal,
    openingBalance: data.expenditure?.openingBalance ?? 0,
    orders: data.orders?.length ?? 0,
    dak: (data.dak ?? []).filter((d) => d.status !== 'cancelled').length,
    tasks: (data.tasks ?? []).filter((t) => t.status !== 'cancelled').length,
    captures: (data.captures ?? []).filter((c) => c.status === 'active').length,
    contacts: (data.contacts ?? []).filter((c) => c.status !== 'archived').length,
  };
}

/** True when device has no user-entered records (used to block accidental cloud overwrite). */
export function hasAnyAppData(summary) {
  if (!summary) return false;
  return (
    (summary.meetings ?? 0) > 0 ||
    (summary.souvenirs ?? 0) > 0 ||
    (summary.expenditures ?? 0) > 0 ||
    (summary.orders ?? 0) > 0 ||
    (summary.dak ?? 0) > 0 ||
    (summary.tasks ?? 0) > 0 ||
    (summary.captures ?? 0) > 0 ||
    (summary.contacts ?? 0) > 0 ||
    (summary.openingBalance ?? 0) > 0
  );
}
