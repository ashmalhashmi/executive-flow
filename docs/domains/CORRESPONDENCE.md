# Domain: Correspondence

Correspondence. The operator snaps a letter, notification, office memorandum, or summary. Extra pages of the same letter can be snapped before one CLEAR-7 examine. Each photo is saved.

## Touch first

| Layer | Paths |
|-------|--------|
| UI | `src/pages/CorrespondenceReview.jsx` |
| State | `CorrespondenceContext` via `useCorrespondenceExecutive` |
| Logic | `src/utils/correspondenceEntries.js`, `src/utils/correspondenceAi.js` |
| API | `api/_lib/correspondenceRoute.js`, `api/_lib/correspondenceExtract.js`, `api/_lib/correspondenceStorage.js` |

The handler runs inside `api/extract-petty-invoice.js` when `purpose` is `clear7`. That keeps the deployment inside the 12-function limit. The client posts to `/api/extract-petty-invoice`.

## Storage

- Key: `executive_flow_correspondence`
- Snapshot field: `data.correspondence`
- `imageRef` is the first saved photo link. `imageRefs` lists every page. The image bytes are not stored on the review. Up to 6 pages per letter.
- Login is required for the AI call. A signed-out operator is told to sign in from Sync & Backup.

## CLEAR-7

The model reads only what is printed. Empty fields stay empty. `clear7.action` and the DG line's recommendation are not treated as facts from the letter.

## Do / don't

- **Do** keep this independent of Dak Issuance Log and Compose Desk.
- **Don't** add another root file under `api/` for this route.
