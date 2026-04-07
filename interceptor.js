/**
 * interceptor.js — Runs in the MAIN world (page context).
 * Monkey-patches window.fetch to capture Power Automate flow definition responses.
 * Communicates captured data to the ISOLATED world via window.postMessage.
 */

(function () {
  'use strict';

  const FLOW_API_PATTERNS = [
    /\/providers\/Microsoft\.ProcessSimple\/environments\/[^/]+\/flows\/[^/?]+/i,
    /\/flows\/[0-9a-f-]{36}/i
  ];

  const MIN_RESPONSE_SIZE = 500; // Skip tiny responses that aren't flow definitions

  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const request = args[0];
    const url = typeof request === 'string' ? request : request?.url;

    const response = await originalFetch.apply(this, args);

    if (url && isFlowApiUrl(url)) {
      // Clone so the page still gets its original response
      const clone = response.clone();

      processResponse(clone, url).catch((err) => {
        console.debug('[PA Extractor] Error processing response:', err.message);
      });
    }

    return response;
  };

  function isFlowApiUrl(url) {
    return FLOW_API_PATTERNS.some((pattern) => pattern.test(url));
  }

  async function processResponse(response, url) {
    if (!response.ok) return;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) return;

    const text = await response.text();
    if (text.length < MIN_RESPONSE_SIZE) return;

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return;
    }

    // Only capture if it looks like a flow definition
    if (!json.properties?.displayName || !json.properties?.definition) return;

    const flowData = {
      id: json.name || extractFlowId(url),
      displayName: json.properties.displayName,
      description: json.properties.description || '',
      state: json.properties.state,
      capturedAt: new Date().toISOString(),
      url: url,
      raw: json
    };

    console.log(`[PA Extractor] Captured flow: ${flowData.displayName}`);

    window.postMessage({
      type: 'PA_EXTRACTOR_FLOW_CAPTURED',
      flow: flowData
    }, '*');
  }

  function extractFlowId(url) {
    const match = url.match(/flows\/([0-9a-f-]{36})/i);
    return match ? match[1] : 'unknown';
  }

  console.log('[PA Extractor] Fetch interceptor active');
})();
