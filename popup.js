/**
 * popup.js — Extension popup logic.
 * Lists captured flows and provides download/delete actions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const flowList = document.getElementById('flow-list');
  const emptyState = document.getElementById('empty-state');
  const clearBtn = document.getElementById('clear-btn');

  // Clear badge when popup opens
  chrome.action.setBadgeText({ text: '' });

  loadFlows();

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
        <button class="btn" data-action="delete">Delete</button>
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
});
