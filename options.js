/**
 * options.js — Settings page for AI provider configuration.
 */

const MODELS = {
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (fast, cheap)', default: true },
    { id: 'gpt-4o', label: 'GPT-4o (best quality)' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (fastest)' }
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (best quality)' },
    { id: 'claude-haiku-4-20250414', label: 'Claude Haiku 4 (fast, cheap)', default: true }
  ]
};

const KEY_HINTS = {
  openai: 'Get your key at <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>',
  anthropic: 'Get your key at <a href="https://console.anthropic.com/settings/keys" target="_blank">console.anthropic.com</a>'
};

const providerEl = document.getElementById('provider');
const modelEl = document.getElementById('model');
const modelHintEl = document.getElementById('model-hint');
const apiKeyEl = document.getElementById('api-key');
const keyHintEl = document.getElementById('key-hint');
const toggleKeyEl = document.getElementById('toggle-key');
const form = document.getElementById('settings-form');
const statusEl = document.getElementById('status');

// Load saved settings
chrome.storage.sync.get(['aiProvider', 'aiModel', 'aiApiKey'], (data) => {
  if (data.aiProvider) providerEl.value = data.aiProvider;
  populateModels();
  if (data.aiModel) modelEl.value = data.aiModel;
  if (data.aiApiKey) apiKeyEl.value = data.aiApiKey;
});

providerEl.addEventListener('change', () => {
  populateModels();
});

toggleKeyEl.addEventListener('click', () => {
  const isPassword = apiKeyEl.type === 'password';
  apiKeyEl.type = isPassword ? 'text' : 'password';
  toggleKeyEl.textContent = isPassword ? 'Hide' : 'Show';
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const provider = providerEl.value;
  const model = modelEl.value;
  const apiKey = apiKeyEl.value.trim();

  if (!apiKey) {
    showStatus('API key is required', true);
    return;
  }

  chrome.storage.sync.set({ aiProvider: provider, aiModel: model, aiApiKey: apiKey }, () => {
    showStatus('Settings saved');
  });
});

function populateModels() {
  const provider = providerEl.value;
  const models = MODELS[provider] || [];

  modelEl.innerHTML = '';
  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label;
    if (m.default) opt.selected = true;
    modelEl.appendChild(opt);
  }

  keyHintEl.innerHTML = KEY_HINTS[provider] || '';
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = 'status' + (isError ? ' error' : '');
  statusEl.hidden = false;
  setTimeout(() => { statusEl.hidden = true; }, 3000);
}
