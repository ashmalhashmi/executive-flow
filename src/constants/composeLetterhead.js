/** Official Compose letterhead — Punjab Agriculture, Food and Drug Authority */

export const COMPOSE_LETTERHEAD = {
  id: 'pafda',
  /** Served from Vite `public/` */
  imagePath: '/pafda-letterhead.png',
  govLine: 'GOVERNMENT OF THE PUNJAB',
  orgLine: 'PUNJAB AGRICULTURE, FOOD AND DRUG AUTHORITY',
  shortName: '(PAFDA)',
  addressLine: 'Punjab Science Enclave, Multan Road, Lahore-53700',
};

/** Plain-text fallback if image unavailable. */
export function formatComposeLetterheadText(letterhead = COMPOSE_LETTERHEAD) {
  const { govLine, orgLine, shortName, addressLine } = letterhead;
  return [govLine, orgLine, shortName, addressLine].join('\n');
}
