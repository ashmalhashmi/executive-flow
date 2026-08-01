/** Stable JSON key for snapshot `data` — exportedAt ignore */
export function snapshotDataKey(snapshotOrData) {
  const data = snapshotOrData?.data ?? snapshotOrData;
  return JSON.stringify(data ?? {});
}

export function countDiff(localSummary, cloudSummary) {
  if (!cloudSummary) return null;
  const keys = ['meetings', 'calendarMeetings', 'souvenirs', 'expenditures', 'orders', 'dak', 'tasks', 'contacts'];
  const diff = {};
  for (const key of keys) {
    const local = localSummary[key] ?? 0;
    const cloud = cloudSummary[key] ?? 0;
    if (local !== cloud) diff[key] = { local, cloud };
  }
  return Object.keys(diff).length ? diff : null;
}
