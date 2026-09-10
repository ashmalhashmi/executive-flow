# Domain: Compose

Intent (20%) → **Blueprint slots** (AI or local) → **Assembler** (fixed structure 80%) → human judgment (editor).

Structure is never free-form. Organizational blueprints own section order and labels; AI only fills content slots.

## Operator flow

1. **Metadata configuration** — User pehle Intent (Letter / Note Sheet) select karta hai aur zaroori details define karta hai: purpose, addressee, reference/PUC, aur PAFDA header (plus letter/file no. as needed).
2. **Content parameters** — Core ideas, preferred tone, language, aur presentation style (tables / lists / free text) ka intekhab.
3. **AI generation** — **Generate** se AI ya local templates data slots populate karte hain aur content ko official blueprint mein format karte hain.
4. **Refinement & output** — User draft review/edit (optional **Improve**) karta hai; final document **Copy**, **PDF**, **Word**, ya **Email** se export.

## Touch first

| Layer | Paths |
|-------|--------|
| UI | `src/pages/ComposeDesk.jsx` |
| Constants | `src/constants/composePurposes.js`, `composeBlueprints.js`, `composeLetterhead.js` |
| Logic | `src/utils/composeBlueprintAssemble.js`, `composeDraft.js`, `composeAiDraft.js`, `composeLetterPdf.js`, `composeLetterDoc.js`, `composeLetterEmail.js` |
| API | `api/compose-draft.js`, `api/compose-letter-email.js`, `api/_lib/composeDraft.js`, `composeLetterDoc.js` |

## Technical pipeline

1. **Intent** — Type, purpose, letter/file no., addressee, optional reference/PUC, core ideas, optional presentation, tone, language (human)
2. **Slots** — local `buildSlotsFromIntent` and/or AI slot JSON (no full `body` from model)
3. **Assemble** — `assembleComposeBody` emits fixed blueprint text:
   - **Letter** — No. → Date → To → Subject → Salutation → Reference → Body paras → Closing → Signature
   - **Note Sheet** — File No. → Date → Submitted to → Subject → PUC → Brief → Policy → Proposal → submission line → Writer
   - Optional **PAFDA Letter Header** (Letter aur Note Sheet dono — export/preview)
4. **Judgment** — edit body; **Improve** returns improved slots → re-assemble
5. **Export** — Copy / PDF / **Word (.doc)** / **Email Word** (Resend)
   - Email needs `RESEND_API_KEY`
   - Letterhead: `public/pafda-letterhead.png`

## Do / don’t

- **Do** require core ideas before generate.
- **Do** keep local blueprint path so AI-off still works.
- **Do** treat assembler as the only writer of final structure.
- **Don’t** accept free-form AI `body` as source of truth.
- **Don’t** auto-send without human edit step.
- **Don’t** store compose drafts in ExecutiveContext yet (session UI state).
