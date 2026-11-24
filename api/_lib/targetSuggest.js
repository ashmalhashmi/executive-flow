import { guardPost } from './httpGuard.js';
import {
  requestOpenAI,
  hasOpenAIKey,
  objectSchema,
  stringField as str,
} from './openai.js';

const SYSTEM_PROMPT = `You turn one personal target into an identity-based practice.

The operator writes only the target and the deadline. You write:
- identity: one Roman Urdu sentence that starts with "Main woh shakhs hoon jo". It names the person they are becoming, not the deadline.
- actions: exactly 3 favorable actions in Roman Urdu.

Each action is a small vote for that identity. It must be repeatable on an ordinary day, possible in one short sitting, and include when or where to do it. Do not write a one-time task list. Do not say the target is already achieved.

Rules:
- Stay with the operator's target. Do not invent a different goal.
- Keep the language modest and practical.
- For body, fitness, or strength targets, use sleep, walking, simple strength practice, breathing, and consistency. Do not give medicines, doses, medical treatment, or explicit sexual instructions.
- If the target is vague, still produce one clear identity and 3 small repeats that point toward it.`;

const schema = objectSchema({
  identity: str,
  actions: { type: 'array', items: str, minItems: 3, maxItems: 3 },
});

function cleanActions(list) {
  const seen = new Set();
  const actions = [];
  for (const item of Array.isArray(list) ? list : []) {
    const text = String(item || '').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    actions.push(text);
    if (actions.length === 3) break;
  }
  return actions;
}

export async function handleTargetSuggest(req, res) {
  const gate = await guardPost(req, res, { maxBytes: 16_000, bucket: 'target-suggest' });
  if (!gate) return;

  if (!hasOpenAIKey()) {
    return res.status(503).json({
      error: 'AI not configured — set OPENAI_API_KEY',
      code: 'NO_API_KEY',
    });
  }

  const title = String(gate.body?.title || '').trim();
  const deadline = String(gate.body?.deadline || '').trim().slice(0, 10);
  if (!title) return res.status(400).json({ error: 'Target likhein' });
  if (!deadline) return res.status(400).json({ error: 'Deadline specify karein' });

  try {
    const raw = await requestOpenAI({
      instructions: SYSTEM_PROMPT,
      text: `Target: ${title}\nDeadline: ${deadline}\nWrite the identity and exactly 3 favorable actions to repeat until this deadline.`,
      name: 'target_practice',
      schema,
      usageFeature: 'target_suggest',
      userId: gate.userId,
    });
    const data = JSON.parse(String(raw || '').trim());
    const identity = String(data?.identity || '').trim();
    const actions = cleanActions(data?.actions);
    if (!identity || actions.length < 3) {
      throw new Error('AI ne identity aur 3 actions nahi likhein — dubara try karein');
    }
    return res.status(200).json({ ok: true, identity, actions });
  } catch (err) {
    const message = err?.message || 'AI suggest fail';
    const status = /timed out/i.test(message) ? 504 : 422;
    return res.status(status).json({ error: message });
  }
}
