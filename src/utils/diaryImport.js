/** Meetings created via Sync & Backup → Diary CSV import */
export function isDiaryImportedMeeting(meeting) {
  return String(meeting?.id ?? '').startsWith('mtg-csv-');
}

export function countDiaryImportedMeetings(meetings) {
  return (meetings || []).filter(isDiaryImportedMeeting).length;
}

export function withoutDiaryImportedMeetings(meetings) {
  return (meetings || []).filter((m) => !isDiaryImportedMeeting(m));
}
