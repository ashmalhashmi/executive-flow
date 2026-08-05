# Agent guide — Executive Flow

Before changing code, read **[ARCHITECTURE.md](./ARCHITECTURE.md)** and name the domain you are editing.  
For *user* click-paths (how operators play), see **[WORKFLOW.md](./WORKFLOW.md)** — do not confuse with builder steps.

## Default workflow

1. Name the domain (Meetings, Souvenirs, Expenditure, Orders, Dak, Tasks, Capture, Contacts, Sync, Dashboard, Ask, or Shell).
2. Open the matching domain guide under `docs/domains/` when one exists.
3. Prefer that domain’s page → utils → context/API. Do not wander across unrelated tabs.
4. If you invent a new pile of bricks, update `ARCHITECTURE.md` in the same change.

## Domain hooks (use these, not a god-object)

| Domain | Hook |
|--------|------|
| Meetings | `useMeetingsExecutive` |
| Souvenirs | `useSouvenirsExecutive` |
| Expenditure | `useExpenditureExecutive` |
| Orders | `useOrdersExecutive` |
| Dak | `useDakExecutive` |
| Tasks | `useTasksExecutive` |
| Capture | `useCaptureExecutive` |
| Contacts | `useContactsExecutive` |
| Meta / shell | `useAppMetaExecutive` |
| Legacy catch-all | `useExecutive` — avoid for new UI |

Cloud / Sheets: `CloudSyncContext`, `GoogleSheetsSyncContext` (Sync domain).

## Hard limits

- Do not edit `dist/` or commit secrets (`.env`, service keys).
- Do not rewrite `ExecutiveContext.jsx` for a single-field UI tweak — extend normalizers in `utils/*Entries` when schema changes.
- Shared dates/currency: `utils/dates.js`, `utils/currency.js`.
- Server jobs: thin `api/*.js` + helpers in `api/_lib/`.

## Cursor rule

`.cursor/rules/executive-flow-domains.mdc` mirrors this map for globs under `src/` and `api/`.
