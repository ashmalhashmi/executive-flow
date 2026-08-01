import { buildAppSnapshot } from './backup';

export const CLOUD_SMALL_PAYLOAD_BYTES = 80_000;

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

export function buildPartialSnapshot(snapshot, includedSections) {
  const { meetings, souvenirs, expenditure, orders, dak, tasks, contacts, settings } =
    snapshot.data;
  return {
    ...snapshot,
    exportedAt: new Date().toISOString(),
    data: {
      meetings: includedSections.includes('meetings') ? meetings : [],
      souvenirs: includedSections.includes('souvenirs') ? souvenirs : [],
      expenditure: includedSections.includes('expenditure')
        ? expenditure
        : { openingBalance: 0, expenditures: [] },
      orders: includedSections.includes('orders') ? orders : [],
      dak: includedSections.includes('dak') ? dak : [],
      tasks: includedSections.includes('tasks') ? tasks : [],
      contacts: includedSections.includes('contacts') ? contacts : [],
      settings: settings && typeof settings === 'object' ? settings : {},
    },
  };
}

function upsertPayload({ supabase, table, userId, payload }) {
  return supabase.from(table).upsert(
    {
      user_id: userId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

/** Single request — chhota data (optimistic UI ke saath). */
export async function pushSnapshotSingle({ supabase, table, userId, snapshot, onProgress }) {
  onProgress?.({ progress: 15, phase: 'Preparing backup…' });
  onProgress?.({ progress: 55, phase: 'Uploading to cloud…' });

  const { error } = await upsertPayload({ supabase, table, userId, payload: snapshot });
  if (error) throw error;

  onProgress?.({ progress: 100, phase: 'Complete' });
}

/** Section-by-section upload — bara data, progress har step par. */
export async function pushSnapshotChunked({ supabase, table, userId, snapshot, onProgress }) {
  onProgress?.({ progress: 5, phase: 'Preparing backup…' });

  for (let i = 0; i < SECTIONS.length; i += 1) {
    const section = SECTIONS[i];
    const included = SECTIONS.slice(0, i + 1);
    const label = SECTION_LABELS[section];
    const stepBase = 10 + Math.round((i / SECTIONS.length) * 80);
    const stepEnd = 10 + Math.round(((i + 1) / SECTIONS.length) * 80);

    onProgress?.({
      progress: stepBase,
      phase: `Uploading ${label}… (${i + 1}/${SECTIONS.length})`,
    });

    const partial = buildPartialSnapshot(snapshot, included);
    const { error } = await upsertPayload({ supabase, table, userId, payload: partial });
    if (error) throw error;

    onProgress?.({
      progress: stepEnd,
      phase: `${label} saved`,
    });
  }

  onProgress?.({ progress: 98, phase: 'Finalizing…' });

  const { error: finalError } = await upsertPayload({
    supabase,
    table,
    userId,
    payload: {
      ...snapshot,
      exportedAt: new Date().toISOString(),
    },
  });
  if (finalError) throw finalError;

  onProgress?.({ progress: 100, phase: 'Complete' });
}

export async function pushSnapshotToCloud({
  supabase,
  table,
  userId,
  getAppSnapshot,
  onProgress,
}) {
  const snapshot = getAppSnapshot();
  const payloadBytes = getSnapshotPayloadBytes(snapshot);
  const isSmall = payloadBytes <= CLOUD_SMALL_PAYLOAD_BYTES;

  if (isSmall) {
    await pushSnapshotSingle({ supabase, table, userId, snapshot, onProgress });
  } else {
    await pushSnapshotChunked({ supabase, table, userId, snapshot, onProgress });
  }

  return { snapshot, payloadBytes, isSmall };
}

export { buildAppSnapshot };
