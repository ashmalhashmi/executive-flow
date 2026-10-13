# Petty Cash Record domain

Meeting petty-cash paperwork: **Purchase Slip**, **Satisfactory Note**, and **Refreshment Receiving Note** — with invoice scan, configurable signatures, PDF / Word / Email.

## Touch these files

| Layer | Files |
|-------|--------|
| UI | `pages/PettyCashRecord.jsx` |
| Data | `utils/pettyCashEntries.js`, `utils/pettyCashSignatureSettings.js` |
| Scan | `utils/pettyCashInvoiceAi.js` → `api/extract-petty-invoice.js` |
| Export | `utils/pettyCashPdf.js`, `utils/pettyCashDocHtml.js`, `utils/pettyCashEmail.js`, `api/petty-cash-email.js` |

## Hook

`usePettyCashExecutive` — cases, refreshment notes, signatures, CRUD.

## Flow

1. **Purchase case** — optional meeting link → scan invoice → long bills: **Scan next page** (merge items + extra photo on same draft) → fill Requested By / approver / Satisfactory Note on the form → **one** Save case.
2. **Export** — PDF · Word · Email (Word attach) per document type.
3. **Refreshment Receiving** — items issued from office → receiver details → save → export.

Invoice photo(s) upload to cloud (`petty-invoices/`) — `invoicePhotoUrls[]` on case (legacy `invoicePhotoUrl` = first page).

## Templates

Purchase Slip uses the official PAFDA wordmark centered above a typed heading — **Punjab Agriculture, Food & Drug Authority (PAFDA)** / **Government of the Punjab** — not the full letterhead banner (avoids duplicate titles). Quantity cells always include a unit (`0.7` → `0.7 kg`, `2` → `2 pcs`). Amount cells are numeric with two decimals and commas (`1,383.00`); `(Rs.)` stays in the column header only. **Requested By** supports multiple people (`requestedBy[]`); PDF/Word print one signature block per requester. Signature lines stay blank for wet-ink (name is not repeated under the line; “Section Head” is not duplicated in both the Approved-by heading and the designation field).

Satisfactory Note and Refreshment Receiving still use the PAFDA letterhead image.
