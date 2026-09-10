/**
 * Fixed organizational blueprints for Compose Desk (Punjab / PAFDA / DG office).
 * Structure is owned here — AI only fills slot values; assembler emits final body.
 */

export const NOTE_SUBMISSION_LINE =
  'Submitted for kind perusal and orders, please.';

export const COMPOSE_BLUEPRINTS = {
  letter: {
    id: 'letter',
    label: 'Letter',
    sections: [
      'letterNo',
      'date',
      'to',
      'subject',
      'salutation',
      'reference',
      'bodyParagraphs',
      'closing',
      'signature',
    ],
  },
  note_sheet: {
    id: 'note_sheet',
    label: 'Note Sheet',
    sections: [
      'fileNo',
      'date',
      'submittedTo',
      'subject',
      'referencePuc',
      'briefFacts',
      'previousPolicy',
      'proposal',
      'submissionLine',
      'signature',
    ],
  },
};

/** Empty slot shell (merged with intent/AI). */
export function emptyComposeSlots() {
  return {
    subject: '',
    addressee: '',
    letterNo: '',
    dateLine: '',
    salutation: '',
    referenceLine: '',
    enclosureLine: '',
    bodyParagraphs: [],
    briefFacts: [],
    previousPolicy: '',
    proposal: '',
    closing: '',
    signature: '',
  };
}
