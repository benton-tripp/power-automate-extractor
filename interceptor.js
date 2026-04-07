/**
 * interceptor.js — Runs in the MAIN world (page context).
 * Monkey-patches window.fetch AND XMLHttpRequest to capture Power Automate
 * flow definition responses.
 * Communicates captured data to the ISOLATED world via window.postMessage.
 */

(function () {
  'use strict';

  const TAG = '[PA Extractor]';

  const FLOW_API_PATTERNS = [
    /\/providers\/Microsoft\.ProcessSimple\/environments\/[^/]+\/flows\/[^/?]+/i,
    /\/flows\/[0-9a-f-]{36}/i
  ];

  const MIN_RESPONSE_SIZE = 500; // Skip tiny responses that aren't flow definitions

  // ── Patch fetch ────────────────────────────────────────────────────────────

  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const request = args[0];
    const url = typeof request === 'string' ? request : request?.url;

    const response = await originalFetch.apply(this, args);

    if (url && isFlowApiUrl(url)) {
      console.log(`${TAG} [fetch] Matched URL: ${url.substring(0, 160)}`);
      const clone = response.clone();

      processResponseFromFetch(clone, url).catch((err) => {
        console.warn(`${TAG} [fetch] Error processing response:`, err.message);
      });
    }

    return response;
  };

  // ── Patch XMLHttpRequest ───────────────────────────────────────────────────

  const XHRProto = XMLHttpRequest.prototype;
  const originalOpen = XHRProto.open;
  const originalSend = XHRProto.send;

  XHRProto.open = function (method, url, ...rest) {
    this._paExtractorUrl = typeof url === 'string' ? url : url?.toString();
    return originalOpen.call(this, method, url, ...rest);
  };

  XHRProto.send = function (...args) {
    const url = this._paExtractorUrl;

    if (url && isFlowApiUrl(url)) {
      console.log(`${TAG} [XHR] Matched URL: ${url.substring(0, 160)}`);

      this.addEventListener('load', function () {
        try {
          processResponseText(this.responseText, url, this.status);
        } catch (err) {
          console.warn(`${TAG} [XHR] Error processing response:`, err.message);
        }
      });
    }

    return originalSend.apply(this, args);
  };

  // ── URL matching ───────────────────────────────────────────────────────────

  function isFlowApiUrl(url) {
    return FLOW_API_PATTERNS.some((pattern) => pattern.test(url));
  }

  // ── Response processing (fetch path) ───────────────────────────────────────

  async function processResponseFromFetch(response, url) {
    if (!response.ok) {
      console.log(`${TAG} Skipping non-OK response (${response.status}) for ${url.substring(0, 120)}`);
      return;
    }

    const text = await response.text();
    processResponseText(text, url, response.status);
  }

  // ── Response processing (shared) ───────────────────────────────────────────

  function processResponseText(text, url, status) {
    if (!text || text.length < MIN_RESPONSE_SIZE) {
      console.log(`${TAG} Skipping small response (${text?.length ?? 0} chars)`);
      return;
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.log(`${TAG} Response is not valid JSON`);
      return;
    }

    // Accept if it has displayName — don't require definition (details page may omit it)
    if (!json.properties?.displayName) {
      console.log(`${TAG} Response JSON has no properties.displayName — skipping`);
      console.log(`${TAG} Top-level keys: ${Object.keys(json).join(', ')}`);
      return;
    }

    const hasDef = !!json.properties?.definition;
    console.log(`${TAG} Flow found: "${json.properties.displayName}" (has definition: ${hasDef}, size: ${text.length})`);

    const flowData = {
      id: json.name || extractFlowId(url),
      displayName: json.properties.displayName,
      description: json.properties.description || '',
      state: json.properties.state,
      hasDefinition: hasDef,
      capturedAt: new Date().toISOString(),
      url: url,
      raw: json
    };

    console.log(`${TAG} ✔ Posting captured flow: ${flowData.displayName}`);

    window.postMessage({
      type: 'PA_EXTRACTOR_FLOW_CAPTURED',
      flow: flowData
    }, '*');
  }

  function extractFlowId(url) {
    const match = url.match(/flows\/([0-9a-f-]{36})/i);
    return match ? match[1] : 'unknown';
  }

  console.log(`${TAG} Interceptor active (fetch + XHR)`);
})();
