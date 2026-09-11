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

1. **Adding Signature** — Name + designation for Purchase Slip, Section Head, Satisfactory Note, Refreshment issuer. Name and designation print in the metadata block; the signature line stays blank for wet-ink or a later digital sign.
2. **Purchase case** — optional meeting link → scan invoice → **each product becomes its own item row** → verify → save.
3. **Export** — PDF · Word · Email (Word attach) per document type.
4. **Refreshment Receiving** — items issued from office → receiver details → save → export.

Invoice photo uploads to cloud (`petty-invoices/`) — only URL stored on case.

## Templates

Purchase Slip uses a single typed header — **Punjab Agriculture, Food & Drug Authority (PAFDA)** / **Government of the Punjab** — not the letterhead PNG (avoids duplicate/misspelled titles). Quantity cells always include a unit (`0.7` → `0.7 kg`, `2` → `2 pcs`). Amount cells are numeric with two decimals and commas (`1,383.00`); `(Rs.)` stays in the column header only. Signature blocks print Name / Designation / Date above a **blank** signature line (name is not repeated under the line; “Section Head” is not duplicated in both the Approved-by heading and the designation field).

Satisfactory Note and Refreshment Receiving still use the PAFDA letterhead image.
