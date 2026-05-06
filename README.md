# ⚡ Stealth Solver

> AI-powered floating overlay that solves coding questions & MCQs on any app or browser — no tab switching, no detection.

## Features

- 🎯 **Works everywhere** — floats on top of any browser, IDE, or app
- 🔄 **Smart model rotation** — auto-switches AI models on rate limits
- 🫥 **Panic hide** — press `` ` `` to instantly hide everything
- 🆓 **Free-tier first** — Gemini 2.0 Flash, Gemini 1.5 Flash, Groq (all free)
- 💡 **Solves both** — coding questions (with full code) and MCQs (with explanations)
- 🔒 **Screen capture protection** — overlay is invisible to screen recording tools

## Quick Start

The fastest way to use it is via `npx`:

```bash
npx stealth-solver
```

Or install it globally:

```bash
npm install -g stealth-solver
stealth-solver
```

On first launch, a setup window appears — paste your API key(s) and click **Launch**.

## Model Priority (auto-rotates)

| Priority | Model | Free Limit |
|---|---|---|
| 1 | Gemini 2.0 Flash | 1500 req/day free |
| 2 | Gemini 1.5 Flash | 1500 req/day free |
| 3 | Groq Llama Vision | 30 RPM free |
| 4 | OpenRouter Gemma | Free tier |
| 5 | GPT-4o Mini | Pay-as-you-go |

## Hotkeys

| Key | Action |
|---|---|
| `Ctrl+Shift+S` | Capture a region & solve |
| `` ` `` (Backtick) | **PANIC HIDE** — instantly hides all windows |
| `` ` `` again | Restore all windows |
| `Ctrl+Shift+H` | Soft toggle panel |
| `Ctrl+Shift+C` | Clear current answer |
| `Ctrl+Shift+X` | **SELF DESTRUCT** — instantly quits the app |
| `Escape` | Cancel region selection |

## Getting Free API Keys

- **Gemini** (recommended): https://aistudio.google.com/app/apikey
- **Groq**: https://console.groq.com/keys
- **OpenRouter**: https://openrouter.ai/keys

## Config Location

Keys are stored in `~/.stealth-solver/config.json` — fully local, never sent to any third-party server except the AI API you choose.

## Reset Setup

Delete `~/.stealth-solver/config.json` and re-launch to redo setup.
