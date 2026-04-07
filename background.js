/**
 * background.js — MV3 Service Worker (ES module).
 * Stores captured flows, serves them to the popup, and handles AI summaries.
 */

import { generateFlowSummary } from './ai-summary.js';

const STORAGE_KEY = 'capturedFlows';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'flowCaptured') {
    handleFlowCaptured(message.flow);
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#0078d4' });
    sendResponse({ ok: true });
  }

  if (message.action === 'getFlows') {
    getFlows().then((flows) => sendResponse(flows));
    return true;
  }

  if (message.action === 'clearFlows') {
    chrome.storage.local.set({ [STORAGE_KEY]: {} }, () => {
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.action === 'deleteFlow') {
    deleteFlow(message.flowId).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.action === 'summarizeFlow') {
    handleSummarize(message.flowId)
      .then((summary) => sendResponse({ ok: true, summary }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

async function handleFlowCaptured(flow) {
  const flows = await getFlows();
  flows[flow.id] = flow;
  await chrome.storage.local.set({ [STORAGE_KEY]: flows });
}

async function getFlows() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {};
}

async function deleteFlow(flowId) {
  const flows = await getFlows();
  delete flows[flowId];
  await chrome.storage.local.set({ [STORAGE_KEY]: flows });

  if (Object.keys(flows).length === 0) {
    chrome.action.setBadgeText({ text: '' });
  }
}

async function handleSummarize(flowId) {
  const flows = await getFlows();
  const flow = flows[flowId];
  if (!flow) throw new Error('Flow not found');
  return generateFlowSummary(flow.raw);
}

// Clear badge when popup opens
chrome.action.onClicked?.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});
