import { parseOpenAIUsage, recordAiUsage } from './aiUsage.js';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const REQUEST_TIMEOUT_MS = 25_000;

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export const stringField = { type: 'string' };
export const numberField = { type: 'number' };

export function arrayOf(items) {
  return { type: 'array', items };
}

export function objectSchema(properties) {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

function classifyError(err, signal, fallback) {
  if (fallback) return fallback;
  const message = String(err?.message || '');
  if (signal?.aborted || /timed out/i.test(message)) return 'timeout';
  return 'network';
}

export async function requestOpenAI({
  instructions, text, imageBase64, imageMimeType = 'image/jpeg', images, name, schema,
  usageFeature = 'unknown',
  userId = null,
  timeoutMs = REQUEST_TIMEOUT_MS,
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('AI not configured — set OPENAI_API_KEY');

  const model = getOpenAIModel();
  const content = [{ type: 'input_text', text }];
  const shots = Array.isArray(images) && images.length
    ? images
    : (imageBase64 ? [{ imageBase64, imageMimeType }] : []);
  for (const shot of shots) {
    if (!shot?.imageBase64) continue;
    content.push({
      type: 'input_image',
      image_url: `data:${shot.imageMimeType || 'image/jpeg'};base64,${shot.imageBase64}`,
      detail: 'high',
    });
  }

  const signal = AbortSignal.timeout(timeoutMs);
  let response;
  let data;
  let status = 'failed';
  let errorKind = '';
  let usage = null;

  try {
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify({
          model,
          instructions,
          input: [{ role: 'user', content }],
          text: { format: { type: 'json_schema', name, schema, strict: true } },
          store: false,
        }),
      });
      data = await response.json().catch(() => null);
      usage = parseOpenAIUsage(data);
    } catch (err) {
      errorKind = classifyError(err, signal, signal.aborted ? 'timeout' : 'network');
      if (signal.aborted) throw new Error('OpenAI request timed out');
      throw new Error('OpenAI request failed or returned an invalid response');
    }

    if (response.status === 429) {
      errorKind = 'rate_limit';
      throw new Error('OpenAI rate or usage limit reached');
    }
    if (!response.ok) {
      errorKind = 'http';
      throw new Error(`OpenAI request failed (HTTP ${response.status})`);
    }
    if (data?.status !== 'completed') {
      errorKind = 'incomplete';
      throw new Error('OpenAI response incomplete');
    }

    const parts = (data.output || [])
      .filter((item) => item.type === 'message')
      .flatMap((item) => item.content || []);
    if (parts.some((part) => part.type === 'refusal')) {
      errorKind = 'refusal';
      throw new Error('OpenAI declined the request');
    }
    const output = parts.filter((part) => part.type === 'output_text').map((part) => part.text).join('');
    if (!output.trim()) {
      errorKind = 'empty';
      throw new Error('AI ne koi jawab nahi diya');
    }
    status = 'success';
    return output;
  } finally {
    void recordAiUsage({
      feature: usageFeature,
      model,
      status,
      usage,
      errorKind,
      userId,
    });
  }
}
