const api = window.electronAPI;

const saveBtn      = document.getElementById('saveBtn');
const errorMsg     = document.getElementById('errorMsg');

// Toggle password visibility
document.querySelectorAll('.eye-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

// Load existing config if re-opening setup
api.getConfig().then((config) => {
  if (config?.keys) {
    const k = config.keys;
    if (k.gemini)     document.getElementById('geminiKey').value = k.gemini;
    if (k.groq)       document.getElementById('groqKey').value = k.groq;
    if (k.openrouter) document.getElementById('openrouterKey').value = k.openrouter;
    if (k.openai)     document.getElementById('openaiKey').value = k.openai;
  }
});

// Save & launch
saveBtn.addEventListener('click', () => {
  const keys = {
    gemini:     document.getElementById('geminiKey').value.trim(),
    groq:       document.getElementById('groqKey').value.trim(),
    openrouter: document.getElementById('openrouterKey').value.trim(),
    openai:     document.getElementById('openaiKey').value.trim()
  };

  // At least one key required
  const hasAny = Object.values(keys).some(Boolean);
  if (!hasAny) {
    errorMsg.classList.remove('hidden');
    return;
  }

  errorMsg.classList.add('hidden');
  saveBtn.innerHTML = '<span>Launching...</span>';
  saveBtn.disabled = true;

  api.completeSetup({ keys });
});
