# Domain: Sync

Laptop ↔ mobile cloud, auth, backup snapshot, Google Sheets presentation.

## Touch first

| Layer | Paths |
|-------|--------|
| UI | `src/pages/SyncBackup.jsx`, `src/components/sync/` |
| State | `src/context/CloudSyncContext.jsx`, `src/context/GoogleSheetsSyncContext.jsx` |
| Logic | `src/utils/cloudSyncPush.js`, `cloudSyncState.js`, `backup.js`, `authRedirect.js`, `googleSheetsSync.js` |
| Client | `src/lib/supabase.js` |
| API | `api/sheets-sync.js`, `api/_lib/sheetsMirror.js`, `api/_lib/sheetsPresentation*.js` |
| Apps Script | `scripts/apps-script/Code.gs` (redeploy after sheet logic changes) |
| Ops docs | `docs/CLOUD_SYNC.md` |

## Snapshot contract

`utils/backup.js` → `buildAppSnapshot` / `validateBackup`.

Domains inside `data`: `meetings`, `souvenirs`, `expenditure`, `orders`, `dak`, `tasks`, `captures`, `contacts`, `settings`.

Changing a field that must survive cloud Pulse sync means updating:

1. Domain normalizer (`*Entries` or expenditure state)
2. `buildAppSnapshot` / `validateBackup` if shape changes
3. Restore path in `ExecutiveContext` / sync apply

## Real-time Pulse (hybrid)

`useCloudSync` watches `dataRevision` → debounced silent push; polls / Realtime → silent pull when cloud is newer and there are no local edits. UI: `RealtimePulseStatus` + emergency **Save now / Load now** on Sync & Backup.

Cloud preview must **not** mark `updated_at` as already applied — that race skipped pulls (mobile expenses never reached laptop). Login reconcile auto-pulls when cloud has more domain rows than local.

Cloud push always writes a **full** snapshot (`cloudSyncPush.js`). Never write partial section payloads — those zeroed domains like `contacts: []` and Pulse wiped Contact Database across devices. `importAppData` also refuses to replace non-empty local contacts with an empty cloud list when other domains still have data.

## Google Sheet backup (one correct copy)

Sheet sync uses **mirror** mode (`syncMode: 'mirror'`): each tab is cleared and rewritten from the current app snapshot (deduped by Record ID). Meta stores only the last sync status — not a growing pile of sync log rows.

- Client: `utils/googleSheetsSync.js`, `hooks/useGoogleSheetsSync.js` (skips identical fingerprints)
- Server: `api/sheets-sync.js` + `api/_lib/sheetsMirror.js`
- Apps Script: redeploy `Code.gs` after changes

Empty app snapshots cannot wipe a populated sheet.

## Do / don’t

- **Do** fix auth/redirect and Supabase URL config via `docs/CLOUD_SYNC.md` first.
- **Do** keep morning-board / weekly-expenditure **settings** in their utils; Sync UI only hosts the cards.
- **Don’t** put log CRUD (add meeting, add expense) in Sync pages.
- **Don’t** change `BACKUP_VERSION` without a migration story.
- **Don’t** reintroduce primary Save/Load buttons — Pulse is the sync path.
- **Don’t** reintroduce append-forever sheet rows — mirror keeps one correct copy.
- **Do** keep hybrid **Save now / Load now** for missed multi-device updates.
