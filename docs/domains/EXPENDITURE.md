# Domain: Expenditure

Opening balance, PKR expense log, AI categorize, weekly summary email/PDF.

## Touch first

| Layer | Paths |
|-------|--------|
| UI | `src/pages/ExpenditureLog.jsx`, `src/components/sync/WeeklyExpenditureEmailCard.jsx` |
| State | **`useExpenditureExecutive`** only — do not pull expenditure from legacy `useExecutive` |
| Logic | `src/utils/expenditureAnalytics.js`, `expenditureLogPdf.js`, `expenditureAiCategorize.js`, `weeklyExpenditureEmailSettings.js`, `currency.js` |
| Constants | `src/constants/expenditureCategories.js` |
| API | `api/categorize-expenditure.js`, `api/weekly-expenditure-summary.js`, `api/_lib/expenditureCategorize.js`, `expenditureWeeklyPdf.js`, `weekRange.js`, `loadWeeklyExpenditureJobs.js`, `sendResendPdfEmail.js` |

## Storage

- Key: `executive_flow_expenditure`
- Shape: `{ openingBalance, openingBalanceDate, expenditures[] }`
- Also mirrored in cloud snapshot under `data.expenditure` (`utils/backup.js`)

## Related (not this domain)

| Feature | Owner |
|---------|--------|
| Weekly email card on Sync tab | Settings = this domain; card host = **Sync** |
| Orders / souvenirs cost | **Orders** / **Souvenirs** — separate logs |

## Do / don’t

- **Do** run balance math through `computeExpenditureBalance` / analytics utils.
- **Do** keep category lists in `expenditureCategories.js` and server categorize `_lib` in sync.
- **Don’t** invent a second opening-balance store.
- **Don’t** put vendor order lines into expenditures — use Orders.
