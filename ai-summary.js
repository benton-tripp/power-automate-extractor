/**
 * ai-summary.js — Generates flow summaries via OpenAI or Anthropic APIs.
 * Called from the background service worker.
 */

export const SYSTEM_PROMPT = `You are an expert at documenting Microsoft Power Automate flows.
Given a flow definition JSON, produce a clear, structured summary in Markdown.

Include:
1. **Overview** — One-paragraph description of what the flow does
2. **Trigger** — What starts the flow (e.g., "When a new email arrives")
3. **Steps** — Numbered list of each action/condition in order, with brief descriptions
4. **Connections** — List of services/connectors used (e.g., SharePoint, Outlook, Teams)
5. **Error Handling** — Any configure-run-after or try/catch patterns, or "None" if absent

Keep it concise. Use plain language a non-developer could understand.
Do NOT reproduce raw JSON. Summarize the logic.`;

/**
 * Generate a summary for a captured flow.
 * @param {object} flowRaw - The full flow definition JSON (flow.raw)
 * @returns {Promise<string>} Markdown summary
 */
export async function generateFlowSummary(flowRaw) {
  const settings = await chrome.storage.sync.get(['aiProvider', 'aiModel', 'aiApiKey']);
  const { aiProvider, aiModel, aiApiKey } = settings;

  if (!aiApiKey) {
    throw new Error('No API key configured. Open extension settings to add one.');
  }

  // Extract only the relevant parts to reduce token usage
  const payload = buildFlowPayload(flowRaw);
  const userMessage = `Summarize this Power Automate flow:\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;

  if (aiProvider === 'anthropic') {
    return callAnthropic(aiApiKey, aiModel, userMessage);
  }
  return callOpenAI(aiApiKey, aiModel, userMessage);
}

/**
 * Extract the important parts of a flow definition to minimize tokens.
 */
function buildFlowPayload(raw) {
  const props = raw.properties || {};
  return {
    displayName: props.displayName,
    description: props.description,
    state: props.state,
    definition: props.definition || null,
    connectionReferences: props.connectionReferences || null
  };
}

async function callOpenAI(apiKey, model, userMessage) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 2048,
      temperature: 0.3
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${resp.status}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'No summary generated.';
}

async function callAnthropic(apiKey, model, userMessage) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model || 'claude-haiku-4-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error: ${resp.status}`);
  }

  const data = await resp.json();
  const textBlock = data.content?.find((b) => b.type === 'text');
  return textBlock?.text || 'No summary generated.';
}
