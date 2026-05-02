/**
 * Smart model rotation pool.
 * Models are tried in priority order.
 * When a model hits a rate limit, it enters a cooldown period
 * and the next available model is used automatically.
 */

const MODEL_POOL = [
  {
    id: 'gemini-3.1-pro',
    provider: 'gemini',
    model: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    requiresKey: 'gemini'
  },
  {
    id: 'gemini-3-flash',
    provider: 'gemini',
    model: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    requiresKey: 'gemini'
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    requiresKey: 'gemini'
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    requiresKey: 'gemini'
  },
  {
    id: 'groq-llama-4-scout',
    provider: 'groq',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Groq Llama 4 Scout',
    requiresKey: 'groq'
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    requiresKey: 'openai'
  }
];

// modelId -> timestamp until which it's cooling down
const coolingModels = new Map();

function getAvailableModels(keys) {
  const now = Date.now();
  return MODEL_POOL.filter((m) => {
    if (!keys[m.requiresKey]) return false; // no API key configured
    const coolUntil = coolingModels.get(m.id) || 0;
    return now > coolUntil; // not cooling
  });
}

function cooldown(modelId, seconds = 60) {
  coolingModels.set(modelId, Date.now() + seconds * 1000);
  console.log(`[ModelRotator] ${modelId} cooling for ${seconds}s`);
}

function getNextModel(keys) {
  const available = getAvailableModels(keys);
  return available[0] || null;
}

function isRateLimitError(err) {
  const msg = (err?.message || '').toLowerCase();
  const status = err?.status || err?.statusCode || 0;
  return (
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('resource exhausted') ||
    msg.includes('too many requests')
  );
}

function getModelStatus(keys) {
  const now = Date.now();
  return MODEL_POOL.map((m) => {
    const hasKey = !!keys[m.requiresKey];
    const coolUntil = coolingModels.get(m.id) || 0;
    const cooling = now < coolUntil;
    return {
      ...m,
      hasKey,
      cooling,
      coolRemaining: cooling ? Math.ceil((coolUntil - now) / 1000) : 0
    };
  });
}

module.exports = { MODEL_POOL, getNextModel, cooldown, isRateLimitError, getModelStatus };
