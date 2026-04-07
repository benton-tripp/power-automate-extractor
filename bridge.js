/**
 * bridge.js — Runs in the ISOLATED world.
 * Relays messages from the MAIN world (interceptor.js) to the background service worker.
 * The MAIN world cannot talk to chrome.runtime directly, so this script bridges the gap.
 */

(function () {
  'use strict';

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== 'PA_EXTRACTOR_FLOW_CAPTURED') return;

    chrome.runtime.sendMessage({
      action: 'flowCaptured',
      flow: event.data.flow
    }).catch((err) => {
      console.debug('[PA Extractor Bridge] Could not send to background:', err.message);
    });
  });
})();
