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

1. **Signatures** — set who signs Purchase Slip, Satisfactory Note, Refreshment issuer (optional handwritten image via default PS signature).
2. **Purchase case** — optional meeting link → scan invoice → verify fields → save.
3. **Export** — PDF · Word · Email (Word attach) per document type.
4. **Refreshment Receiving** — items issued from office → receiver details → save → export.

Invoice photo uploads to cloud (`petty-invoices/`) — only URL stored on case.

## Templates

Layout follows PAFDA letterhead + table fields (SOP-aligned). User may share exact SOP doc for field tweaks later.
