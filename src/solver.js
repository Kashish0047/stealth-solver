const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const { MODEL_POOL, getNextModel, cooldown, isRateLimitError } = require('./modelRotator');

const SOLVE_PROMPT = `You are an expert programming assistant and exam solver. Analyze this screenshot carefully.

CRITICAL: ZERO TOLERANCE FOR COMMENTS. 
- DO NOT use //, /* */, <!-- -->, or # comments.
- DO NOT include explanations, summary text, or markdown formatting outside the JSON.
- PROVIDE ONLY RAW, WORKING CODE LINES.
- MAINTAIN STANDARD INDENTATION AND VERTICAL SPACING (New lines between logic blocks).

STEP 1 — Identify the question type:
- "mcq": Multiple choice / theory questions
- "dsa": Data structures & algorithms problem
- "web": Web development / MERN stack
- "mixed": A mix of the above

STEP 2 — Solve accordingly:

If DSA ("dsa"):
- Detect the question name (e.g., "TwoSum")
- Provide the optimized code with PROPER INDENTATION and STANDARD FORMATTING.
- Provide as a SINGLE file.

If Web/MERN ("web"):
- Detect the project name (e.g., "TodoApp")
- Provide ALL necessary files with PROPER FORMATTING.
- Each file must have its proper name.

If MCQ ("mcq"):
- Provide ONLY the correct answer text. NO EXPLANATION.

IMPORTANT: Respond ONLY with a valid JSON object:
{
  "type": "dsa" or "web" or "mcq" or "mixed",
  "questionName": "ShortName",
  "language": "language",
  "files": [{"name": "file.ext", "content": "ONE SINGLE STRING WITH \\n FOR NEWLINES. DO NOT USE ARRAYS."}],
  "answers": [{"answer": "correct_option_text"}],
  "summary": ""
}`;

async function solveWithGemini(model, base64DataUrl, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({ model: model.model });

  // Strip data URL prefix
  const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');

  const result = await genModel.generateContent([
    SOLVE_PROMPT,
    {
      inlineData: {
        mimeType: 'image/png',
        data: base64
      }
    }
  ]);

  return parseResponse(result.response.text());
}

async function solveWithOpenAICompat(model, base64DataUrl, apiKey, baseURL = null) {
  const clientConfig = { apiKey };
  if (baseURL) clientConfig.baseURL = baseURL;

  const client = new OpenAI(clientConfig);

  const response = await client.chat.completions.create({
    model: model.model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SOLVE_PROMPT },
          { type: 'image_url', image_url: { url: base64DataUrl } }
        ]
      }
    ],
    max_tokens: 2000
  });

  return parseResponse(response.choices[0].message.content);
}

function parseResponse(text) {
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // fall through to raw text
    }
  }
  // Fallback for non-JSON responses
  return {
    type: 'text',
    answers: [{ question: 'Result', answer: text, explanation: '' }],
    summary: 'Answer received'
  };
}

async function solve(base64DataUrl, config) {
  const keys = config.keys || {};

  for (let attempt = 0; attempt < MODEL_POOL.length; attempt++) {
    const model = getNextModel(keys);
    if (!model) {
      throw new Error('All models exhausted or no API keys configured.\nPlease wait 60s or add more API keys.');
    }

    try {
      console.log(`[Solver] Trying ${model.name}...`);
      let result;

      switch (model.provider) {
        case 'gemini':
          result = await solveWithGemini(model, base64DataUrl, keys.gemini);
          break;
        case 'groq':
          result = await solveWithOpenAICompat(model, base64DataUrl, keys.groq, 'https://api.groq.com/openai/v1');
          break;
        case 'openrouter':
          result = await solveWithOpenAICompat(model, base64DataUrl, keys.openrouter, 'https://openrouter.ai/api/v1');
          break;
        case 'openai':
          result = await solveWithOpenAICompat(model, base64DataUrl, keys.openai);
          break;
        default:
          throw new Error(`Unknown provider: ${model.provider}`);
      }

      result.usedModel = model.name;
      console.log(`[Solver] Success with ${model.name}`);
      return result;

    } catch (err) {
      console.warn(`[Solver] ${model.name} failed: ${err.message}`);
      if (isRateLimitError(err)) {
        cooldown(model.id, 60);
      } else {
        // Non-rate-limit error: short cooldown before retrying
        cooldown(model.id, 10);
      }
    }
  }

  throw new Error('All models failed. Check your API keys and try again.');
}

module.exports = { solve };
