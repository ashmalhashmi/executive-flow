# Domain: Orders

Vendor / purchase orders, WhatsApp share, history PDF, receiving note.

## Touch first

| Layer | Paths |
|-------|--------|
| UI | `src/pages/OrderLog.jsx` |
| Hook | `useOrdersExecutive` |
| ** | `pages/OrderLog.jsx`, `utils/orderNumber.js`, `utils/orderWhatsApp.js`, `utils/orderHistoryPdf.js`, `utils/orderReceivingNotePdf.js`, `utils/orderReceivingNoteDoc.js`, `utils/orderReceivingNoteAi.js`, `utils/orderReceivingNoteEmail.js`, `utils/orderReceivingNoteShare.js`, `api/receiving-note-statement.js`, `api/receiving-note-email.js` |
| API | `api/receiving-note-statement.js`, `api/receiving-note-email.js` |

## Receiving Note

Session form: Order No. · Date · **Vendor** · item notes → optional **Generate statement (AI)** → PDF / Word / Email.

### Received button (Order History)

1. Marks order **received**
2. Enables **Receiving Note** sub-section with label `Rec Note_<Order No>_<item>` (date = **received date**)
3. Buttons: **PDF** · **Word** · **Email** (no auto-download / auto-WhatsApp)
4. Optional **Generate statement (AI)** for preview/edit
5. On PDF / Word / Email: if statement empty → AI/backend statement, then file (Email = Word attach)

Already-received rows: **Rec Note** re-opens the same sub-section.

Layout of the note file:

1. PAFDA letterhead (top)
2. **Date + Order No.** — right side
3. **Vendor** — left
4. **Receiving Note** title + formal **statement** — mid page
5. Small gap → handwritten signature image (above) + typed name right: `Ashmal Hashmi, PS to DG PAFDA` (`public/receiving-note-signature.png`)

Export: **PDF** / **Word (.doc)** / **Email Word** (Resend + PAFDA letterhead + signature image).

Helpers: `utils/orderReceivingNoteShare.js`

AI uses `GEMINI_API_KEY` (same as Compose); email uses `RESEND_API_KEY`. Falls back to local one-paragraph template when AI off.

## Do / don’t

- **Do** keep order CRUD on Order Log only.
- **Don’t** put Receiving Note into cloud snapshot unless product asks to persist notes.
