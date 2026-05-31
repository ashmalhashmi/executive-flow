export const BACKUP_VERSION = 1;
export const BACKUP_APP_ID = 'executive-flow';

export function buildAppSnapshot({ meetings, souvenirs, expenditureState }) {
  return {
    version: BACKUP_VERSION,
    app: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    data: {
      meetings: Array.isArray(meetings) ? meetings : [],
      souvenirs: Array.isArray(souvenirs) ? souvenirs : [],
      expenditure: {
        openingBalance: Number(expenditureState?.openingBalance) || 0,
        expenditures: Array.isArray(expenditureState?.expenditures)
          ? expenditureState.expenditures
          : [],
      },
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
  const { meetings, souvenirs, expenditure } = raw.data;
  if (meetings != null && !Array.isArray(meetings)) {
    return { ok: false, error: 'Meetings data invalid hai' };
  }
  if (souvenirs != null && !Array.isArray(souvenirs)) {
    return { ok: false, error: 'Souvenirs data invalid hai' };
  }
  if (expenditure != null && typeof expenditure !== 'object') {
    return { ok: false, error: 'Expenditure data invalid hai' };
  }
  return {
    ok: true,
    data: {
      meetings: meetings ?? [],
      souvenirs: souvenirs ?? [],
      expenditure: {
        openingBalance: Number(expenditure?.openingBalance) || 0,
        expenditures: Array.isArray(expenditure?.expenditures) ? expenditure.expenditures : [],
      },
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
  const expTotal = (data.expenditure?.expenditures ?? []).length;
  return {
    meetings: data.meetings?.length ?? 0,
    souvenirs: data.souvenirs?.length ?? 0,
    expenditures: expTotal,
    openingBalance: data.expenditure?.openingBalance ?? 0,
  };
}
