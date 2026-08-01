# Executive Flow — Architecture Storybook

> This is the map of the Lego castle (rooms & brick piles). Read it before adding a “new window.”
> **How to play** (Steps 1–2–3, where to click) → **[WORKFLOW.md](./WORKFLOW.md)**
> Update this file when you create a new domain or change data flow.

## What this product is

Premium executive assistant for office ops: meetings, souvenirs, money, orders, dak, tasks, capture inbox, contacts, and laptop↔mobile cloud sync.

**Stack:** React 19 + Vite 6 · Tailwind 4 · localStorage + Supabase · Vercel API · Capacitor (mobile)

---

## Domains (piles of bricks)

| Domain | Nav / tab id | Purpose | Touch these first |
|--------|--------------|---------|-------------------|
| **Shell** | — | Layout, tabs, providers | `App.jsx`, `components/layout/`, `constants/navigation.js`, `utils/tabImports.js` |
| **Meetings** | `calendar`, dashboard widgets | Appointments, reminders, morning board | `pages/ExecutiveCalendar.jsx`, `utils/calendar.js`, `utils/reminders.js`, `utils/morningBoardSettings.js`, `api/morning-meeting-board.js` |
| **Souvenirs** | `souvenirs` | Meeting gift / stock log | `pages/SouvenirLog.jsx`, `utils/souvenirLog.js`, `components/souvenirs/` |
| **Expenditure** | `expenditure` | PKR expenses, categories, weekly email | `pages/ExpenditureLog.jsx`, `utils/expenditure*.js`, `api/categorize-expenditure.js`, `api/weekly-expenditure-summary.js` |
| **Orders** | `orders` | Vendor orders | `pages/OrderLog.jsx`, `utils/orderNumber.js`, `utils/orderWhatsApp.js`, `utils/orderHistoryPdf.js` |
| **Dak** | `dak` | Dispatch / issuance log | `pages/DakIssuanceLog.jsx`, `utils/dakEntries.js`, `utils/dakIssuancePdf.js`, `utils/dakWhatsApp.js` |
| **Tasks** | `tasks` | Task list + done | `pages/TaskLog.jsx`, `utils/taskEntries.js`, `utils/taskLogPdf.js` |
| **Capture** | `capture` | Brain-dump inbox | `pages/CaptureInbox.jsx`, `utils/captureEntries.js` |
| **Contacts** | `contacts` | Contact DB + AI extract | `pages/ContactDatabase.jsx`, `pages/contactDatabase/`, `utils/contact*.js`, `api/extract-contact.js` |
| **Sync** | `sync` | Auth, cloud save/load, Sheets | `pages/SyncBackup.jsx`, `context/CloudSyncContext.jsx`, `context/GoogleSheetsSyncContext.jsx`, `utils/cloudSync*.js`, `utils/googleSheetsSync.js`, `api/sheets-sync.js`, `docs/CLOUD_SYNC.md` |
| **Dashboard** | `dashboard` | Overview only — composes other domains | `pages/DashboardOverview.jsx`, `components/dashboard/` |

Shared UI bricks (GlassCard, Modal, FormField, StatusBadge) live in `src/components/ui/`. Prefer reusing them over inventing new chrome.

---

## Where state lives

```
App
└── ExecutiveProvider          ← domain state (meetings, souvenirs, …) + localStorage
    └── CloudSyncProvider      ← Supabase auth + snapshot push/pull
        └── GoogleSheetsSyncProvider
            └── ReminderHost
                └── AppLayout + tab pages
```

| Context | File | Domain |
|---------|------|--------|
| `MeetingsContext` | `context/executiveDomains.js` | Meetings |
| `SouvenirsContext` | same | Souvenirs |
| `ExpenditureContext` | same | Expenditure |
| `OrdersContext` | same | Orders |
| `DakContext` | same | Dak |
| `TasksContext` | same | Tasks |
| `CaptureContext` | same | Capture |
| `ContactsContext` | same | Contacts |
| `AppMetaContext` | same | Shell / meta |
| `CloudSyncContext` | `context/CloudSyncContext.jsx` | Sync |
| `GoogleSheetsSyncContext` | `context/GoogleSheetsSyncContext.jsx` | Sync |

**Persistence keys** (in `ExecutiveContext.jsx`): `executive_flow_*` in `localStorage`. Cloud sync serializes via `utils/backup.js` (`buildAppSnapshot`).

---

## Data flow (how bricks connect)

```
UI page  →  domain Context hooks  →  utils/*Entries (normalize)  →  localStorage
                                      ↓
                               Cloud Sync (Supabase)     optional Sheets API
                                      ↓
                               Vercel api/*              (PDF email, AI extract, categorize)
```

| Concern | Client | Server (`api/`) |
|---------|--------|-----------------|
| Morning meeting board PDF/email | `meetingBoardPdf.js`, settings utils | `morning-meeting-board.js` + `_lib/meetingBoard*` |
| Weekly expenditure summary | settings + PDF utils | `weekly-expenditure-summary.js` + `_lib/expenditureWeekly*` |
| AI categorize spend | `expenditureAiCategorize.js` | `categorize-expenditure.js` |
| AI contact extract | `contactAiExtract.js` | `extract-contact.js` |
| Google Sheets presentation | `googleSheetsSync.js` | `sheets-sync.js` |

Timezone / “today” for office jobs: Karachi — see `api/_lib/karachiDate.js`.

---

## How to add a “new window” (change recipes)

| You want to… | Do this |
|--------------|---------|
| New sidebar tab | 1) Add to `constants/navigation.js` 2) Add page under `pages/` 3) Register in `utils/tabImports.js` 4) Wire state in `ExecutiveContext` + `executiveDomains.js` if needed 5) Update this table |
| Change one log’s fields | Edit that domain’s page + `*Entries` util + PDF/export if any — **do not** rewrite `ExecutiveContext` wholesale |
| New email/PDF job | Add `_lib` helper + thin `api/*.js` route; mirror settings in `src/utils/*Settings.js` and Sync UI card |
| UI-only tweak | Prefer `components/ui/` or the feature’s `components/<domain>/` |
| Auth / sync bug | Start at `docs/CLOUD_SYNC.md` + `CloudSyncContext` — not domain log pages |

**Rule of thumb:** one feature = one domain column. If a change needs more than two domains, stop and update this story first.

---

## What must not happen

- Dumping new global state into `App.jsx` instead of a domain context
- Cross-importing page A’s private helpers into page B (extract to `utils/` or shared component)
- Duplicating date/currency logic (use `utils/dates.js`, `utils/currency.js`)
- Editing `dist/` — build output only
- Silent schema changes to localStorage without bumping / migrating in `*Entries` normalizers

---

## Quick file map

```
src/
  App.jsx                 Shell: providers + tabs
  constants/navigation.js Tab list (source of truth for nav)
  context/                Domain contexts + ExecutiveProvider
  pages/                  One primary page per tab
  components/
    layout/               Shell chrome
    ui/                   Shared bricks
    dashboard|calendar|souvenirs|sync|…  Domain UI
  utils/                  Domain logic, PDF, AI client helpers
  lib/supabase.js         Sync client
api/                      Vercel serverless (jobs + AI + sheets)
docs/CLOUD_SYNC.md        Sync user/ops story
```

---

## Domain deep-dives

| Domain | Guide |
|--------|--------|
| Sync | [docs/domains/SYNC.md](./docs/domains/SYNC.md) |
| Meetings | [docs/domains/MEETINGS.md](./docs/domains/MEETINGS.md) |
| Expenditure | [docs/domains/EXPENDITURE.md](./docs/domains/EXPENDITURE.md) |

Agent entrypoint: **[AGENTS.md](./AGENTS.md)**

## When you finish a feature

1. Domain still matches the table above?  
2. If you added a pile, add a row here.  
3. If Cursor/AI will touch this area often, mirror the rule in `.cursor/rules/`.