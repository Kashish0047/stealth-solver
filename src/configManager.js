const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.stealth-solver');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const STATE_FILE = path.join(CONFIG_DIR, 'state.json');

const DEFAULT_CONFIG = {
  hasSetup: false,
  keys: {
    gemini: '',
    groq: '',
    openrouter: '',
    openai: ''
  },
  panicKey: '`',
  captureKey: 'CommandOrControl+Shift+S'
};

// Load secrets if they exist (for npm users)
let secrets = {};
try {
  secrets = require('./secrets');
} catch (e) {
  // Not found
}

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function load() {
  ensureDir();
  let config = { ...DEFAULT_CONFIG };

  // Fallback to secrets if available
  if (secrets.gemini) config.keys.gemini = secrets.gemini;
  if (secrets.groq) config.keys.groq = secrets.groq;
  if (secrets.gemini || secrets.groq) config.hasSetup = true;

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      // Only merge if keys are actually set (not placeholders)
      if (saved.keys) {
        for (const [p, k] of Object.entries(saved.keys)) {
          if (k && k !== 'USE_ENV_VARIABLE' && !k.startsWith('env:')) {
            config.keys[p] = k;
          }
        }
      }
      if (saved.panicKey) config.panicKey = saved.panicKey;
      if (saved.captureKey) config.captureKey = saved.captureKey;
      if (saved.hasSetup !== undefined) config.hasSetup = saved.hasSetup || config.hasSetup;
    } catch {
      // Use defaults on error
    }
  }

  // ─── Override with Environment Variables ──────────────────────────────────────
  // This allows the user to skip setup if keys are in .env
  const envKeys = {
    gemini: process.env.GEMINI_KEY || process.env.GEMINI_API_KEY,
    groq: process.env.GROQ_KEY || process.env.GROQ_API_KEY,
    openrouter: process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY,
    openai: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
  };

  // If any key is found in env, merge it and consider setup complete
  let hasEnvKey = false;
  for (const [provider, val] of Object.entries(envKeys)) {
    if (val) {
      config.keys[provider] = val;
      hasEnvKey = true;
    }
  }

  if (hasEnvKey) {
    config.hasSetup = true;
  }

  return config;
}

function save(config) {
  ensureDir();
  const current = load();
  const merged = { ...current, ...config, hasSetup: true };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

function loadState() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

module.exports = { load, save, loadState, saveState, CONFIG_DIR };
