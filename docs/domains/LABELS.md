# Domain: Labels (File Labels)

**Principle:** Official plate protocol. Template owns verified **PAFDA** (never PAFOA), the legal name **Punjab Agriculture, Food and Drug Authority**, 3-tier hierarchy, gold divider, forest/gold/slate palette, and center alignment. User supplies **Designation** as one integrated phrase (e.g. Member (Pharma)). No logo on the plate.

Govt **box / file / door-badge** labels — administrative print, one label per A4.

## Touch first

| Layer | Paths |
|-------|--------|
| UI | `src/pages/LabelGenerator.jsx` |
| Identity | `PAFDA_LABEL_IDENTITY` in `src/constants/labelTemplates.js` |
| Data | `src/utils/fileLabelEntries.js` |
| Export | `src/utils/labelPdf.js`, `fileLabelDocHtml.js`, `fileLabelEmail.js` |
| Email | `api/compose-letter-email.js` (`type: 'file_label'`) — no extra Hobby function |
| State | `useLabelsExecutive` · `executive_flow_file_labels` · snapshot `data.fileLabels` |

## 3-tier plate

1. **Acronym** — locked `PAFDA`, prominent, forest green  
2. **Legal name** — locked `Punjab Agriculture, Food and Drug Authority` (commas intact), secondary weight, slate  
3. **Gold divider**, then **designation** — user field, one phrase, ink

Layout is always center-aligned with balanced margins and official border framing.

## Pipeline

1. **Designation** + format presets (size / weight / border / landscape·portrait / **copies**)
2. **Save** — list + Pulse cloud (format stored with the label)
3. **View** — saved list + live official-plate preview (**N identical plates** when copies > 1)
4. **Export** — PDF · Word · **Email PDF** — **N pages**, one plate centered per A4 (140×72 mm landscape)

## Do / don’t

- **Do** keep acronym + legal name in `PAFDA_LABEL_IDENTITY` only — never an input.
- **Do** collapse designation whitespace so Member / (Pharma) stay one line.
- **Do** keep formatting inside PDF/Word helpers + template size constants. Border presets live in `FILE_LABEL_BORDERS`.
- **Don’t** put a PAFDA wordmark/logo on the plate — typeset acronym is the identity.
- **Don’t** add a 13th `api/*.js` file for email — extend compose-letter-email.
