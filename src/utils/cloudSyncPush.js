import { buildAppSnapshot } from './backup';

const SECTIONS = ['meetings', 'souvenirs', 'expenditure', 'orders', 'dak', 'tasks', 'contacts'];

const SECTION_LABELS = {
  meetings: 'Meetings',
  souvenirs: 'Souvenirs',
  expenditure: 'Expenditure',
  orders: 'Orders',
  dak: 'Dak Issuance',
  tasks: 'Tasks',
  contacts: 'Contacts',
};

export function getSnapshotPayloadBytes(snapshot) {
  return new Blob([JSON.stringify(snapshot)]).size;
}

/**
 * Progress-only phases — NEVER write partial snapshots to cloud.
 * Partial payloads zeroed other domains (e.g. contacts: []) and Real-time Pulse
 * on the other device imported them, wiping Contact Database on every device.
 */
export async function pushSnapshotToCloud({
  supabase,
  table,
  userId,
  getAppSnapshot,
  onProgress,
}) {
  const snapshot = {
    ...getAppSnapshot(),
    exportedAt: new Date().toISOString(),
  };
  const payloadBytes = getSnapshotPayloadBytes(snapshot);

  onProgress?.({ progress: 10, phase: 'Preparing backup…' });

  for (let i = 0; i < SECTIONS.length; i += 1) {
    const section = SECTIONS[i];
    const label = SECTION_LABELS[section];
    const progress = 15 + Math.round(((i + 1) / SECTIONS.length) * 70);
    onProgress?.({
      progress,
      phase: `Packing ${label}… (${i + 1}/${SECTIONS.length})`,
    });
  }

  onProgress?.({ progress: 90, phase: 'Uploading full snapshot…' });

  const { error } = await supabase.from(table).upsert(
    {
      user_id: userId,
      payload: snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;

  onProgress?.({ progress: 100, phase: 'Complete' });
  return { snapshot, payloadBytes, isSmall: true };
}

export { buildAppSnapshot };
