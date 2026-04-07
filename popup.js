/**
 * popup.js — Extension popup logic.
 * Lists captured flows and provides download/delete actions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const flowList = document.getElementById('flow-list');
  const emptyState = document.getElementById('empty-state');
  const clearBtn = document.getElementById('clear-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const coffeeBtn = document.getElementById('coffee-btn');

  let isPaid = false;

  // Clear badge when popup opens
  chrome.action.setBadgeText({ text: '' });

  // Check payment status then load flows
  chrome.runtime.sendMessage({ action: 'getPaidStatus' }).then((resp) => {
    isPaid = resp?.paid || false;
    loadFlows();
  }).catch(() => {
    loadFlows();
  });

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  coffeeBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://buymeacoffee.com/PLACEHOLDER' });
  });

  clearBtn.addEventListener('click', async () => {
    if (!confirm('Clear all captured flows?')) return;
    await chrome.runtime.sendMessage({ action: 'clearFlows' });
    loadFlows();
  });

  async function loadFlows() {
    const flows = await chrome.runtime.sendMessage({ action: 'getFlows' });
    const entries = Object.values(flows || {});

    flowList.innerHTML = '';

    if (entries.length === 0) {
      emptyState.hidden = false;
      clearBtn.hidden = true;
      return;
    }

    emptyState.hidden = true;
    clearBtn.hidden = false;

    // Sort by capture time, newest first
    entries.sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt));

    for (const flow of entries) {
      flowList.appendChild(createFlowItem(flow));
    }
  }

  function createFlowItem(flow) {
    const li = document.createElement('li');
    li.className = 'flow-item';

    const captured = new Date(flow.capturedAt);
    const timeStr = captured.toLocaleString();

    li.innerHTML = `
      <div class="flow-name">${escapeHtml(flow.displayName)}</div>
      <div class="flow-meta">
        ID: ${escapeHtml(flow.id)}<br>
        Captured: ${timeStr}
        ${flow.state ? `· State: ${escapeHtml(flow.state)}` : ''}
      </div>
      <div class="flow-actions">
        <button class="btn btn-primary" data-action="download">Download JSON</button>
        <button class="btn" data-action="copy">Copy to Clipboard</button>
        <button class="btn btn-ai" data-action="summarize">Summarize</button>
        <button class="btn" data-action="delete">Delete</button>
      </div>
      <div class="summary-panel" hidden>
        <div class="summary-header">
          <strong>AI Summary</strong>
          <button class="btn-small" data-action="copy-summary">Copy</button>
          <button class="btn-small" data-action="download-summary">Download</button>
        </div>
        <div class="summary-content"></div>
      </div>
    `;

    li.querySelector('[data-action="download"]').addEventListener('click', () => {
      downloadFlow(flow);
    });

    li.querySelector('[data-action="copy"]').addEventListener('click', async (e) => {
      await copyFlow(flow);
      e.target.textContent = 'Copied!';
      setTimeout(() => { e.target.textContent = 'Copy to Clipboard'; }, 1500);
    });

    li.querySelector('[data-action="summarize"]').addEventListener('click', async (e) => {
      const btn = e.target;
      const panel = li.querySelector('.summary-panel');
      const content = li.querySelector('.summary-content');

      // Check if user has paid for AI features
      if (!isPaid) {
        panel.hidden = false;
        content.innerHTML = `
          <div class="paywall-message">
            <strong>AI Summaries — Premium Feature</strong><br>
            Unlock AI-powered flow summaries with a one-time purchase.
            <br><br>
            <button class="btn btn-primary" data-action="unlock">Unlock for $4.99</button>
          </div>
        `;
        panel.querySelector('[data-action="unlock"]').addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: 'openPaymentPage' });
        });
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Generating…';
      content.textContent = '';
      panel.hidden = false;

      try {
        const resp = await chrome.runtime.sendMessage({ action: 'summarizeFlow', flowId: flow.id });
        if (resp.ok) {
          content.innerHTML = markdownToHtml(resp.summary);
          btn.textContent = 'Re-summarize';
        } else {
          content.textContent = resp.error || 'Summary generation failed.';
          btn.textContent = 'Summarize';
        }
      } catch (err) {
        content.textContent = err.message;
        btn.textContent = 'Summarize';
      }
      btn.disabled = false;
    });

    li.querySelector('[data-action="copy-summary"]').addEventListener('click', async (e) => {
      const text = li.querySelector('.summary-content').innerText;
      await navigator.clipboard.writeText(text);
      e.target.textContent = 'Copied!';
      setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
    });

    li.querySelector('[data-action="download-summary"]').addEventListener('click', () => {
      const text = li.querySelector('.summary-content').innerText;
      const safeName = flow.displayName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName} - Summary.md`;
      a.click();
      URL.revokeObjectURL(url);
    });

    li.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ action: 'deleteFlow', flowId: flow.id });
      loadFlows();
    });

    return li;
  }

  function downloadFlow(flow) {
    const json = JSON.stringify(flow.raw, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName = flow.displayName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyFlow(flow) {
    const json = JSON.stringify(flow.raw, null, 2);
    await navigator.clipboard.writeText(json);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /** Minimal markdown → HTML (bold, headings, lists, line breaks) */
  function markdownToHtml(md) {
    return escapeHtml(md)
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  }
});
