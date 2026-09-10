import {
  buildSlotsFromIntent,
  buildDraftFromSlots,
  parseCoreIdeas,
} from './composeBlueprintAssemble';

/**
 * Local Structure + Mechanics from Intent (works without AI).
 * Structure comes only from blueprint assembler — never free-form.
 */
export function buildComposeDraftFromIntent(intent) {
  const slots = buildSlotsFromIntent(intent);
  return buildDraftFromSlots(intent, slots, 'template');
}

export function composeIntentIsReady(intent) {
  const ideas = parseCoreIdeas(intent?.coreIdeas);
  return ideas.length > 0;
}

export {
  buildSlotsFromIntent,
  assembleComposeBody,
  mergeComposeSlots,
  assertBlueprintShape,
  buildDraftFromSlots,
  parseCoreIdeas,
} from './composeBlueprintAssemble';
