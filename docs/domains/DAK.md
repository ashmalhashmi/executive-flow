# Dak domain

Outward dispatch **metadata index** — subject, dates, marked to. System auto-assigns `DAK-YYYY-####`.

## User flow

1. **Digital register (top)** — manual register jaisi table; app reopen par bhi yahi dikhega (localStorage + cloud sync).
2. **Add / Scan (neeche)** — nayi entry ya register scan.
3. Save ke baad auto-scroll + green **Saved** highlight upar wali table mein.
4. Search / filter / PDF export register se hi.

## Touch these files

| Layer | Files |
|-------|--------|
| UI | `pages/DakIssuanceLog.jsx`, `components/dak/DakScanCapture.jsx` |
| Data | `utils/dakEntries.js`, `constants/dakDesignations.js` |
| Scan | `utils/dakAiExtract.js` → `api/extract-dak.js` |
| Export | `utils/dakIssuancePdf.js`, `utils/dakWhatsApp.js` |

## Hook

`useDakExecutive` — `dakEntries`, `addDakEntry`, `updateDakEntry`, `eraseAllDakEntries`.

## Scan notes

- Image resized client-side before API (~1200px JPEG).
- On scan: photo **uploads to Vercel Blob** (cloud); app stores **only `scanPhotoUrl`** on each entry — no local gallery / device memory for the image.
- Register page: AI extracts **all visible rows** into editable table (same headers as manual form).
- User verifies table → **Dak Log mein save** → entries appear in register with optional scan photo link (image icon).

### Storage setup (automatic)

Production uses **Vercel Blob** store `executive-flow-dak-scans` (public URLs). Linked project gets `BLOB_READ_WRITE_TOKEN` on deploy — no manual Supabase bucket needed.

Without service role key, AI extract still works but `storageWarning` shows — photo URL empty.

**Sync:** Cloud pull/push **merges** dak rows by id — `scanPhotoUrl` and register `Sr#` are not wiped when laptop/mobile sync. **Erase Dak** writes `dakClearedAt` so Pulse cannot resurrect the old register; entries added after erase still sync. A new empty device with no erase tombstone still restores dak from cloud.
