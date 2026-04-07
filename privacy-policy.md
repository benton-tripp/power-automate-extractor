---
layout: default
title: Privacy Policy — Power Automate Flow Extractor
---

# Privacy Policy — Power Automate Flow Extractor

**Last updated:** April 7, 2026

## Overview

Power Automate Flow Extractor is a browser extension that captures Power Automate flow definitions from network traffic for local use. Your privacy is important — this extension is designed to keep your data under your control.

## Data Collection

This extension does **not** collect, transmit, or store any personal information on external servers.

### What the extension accesses

- **Power Automate API responses** — The extension intercepts flow definition JSON from `*.powerautomate.com` and `*.powerautomate.us` domains while you browse. This data is stored locally in your browser using `chrome.storage.local`.
- **AI API keys** — If you use the optional AI summary feature, your API key is stored locally in your browser using `chrome.storage.sync`. The key is never sent anywhere other than directly to the API provider you selected (OpenAI or Anthropic).

### What the extension does NOT access

- No browsing history
- No personal identity information
- No cookies or authentication tokens
- No data from websites other than Power Automate domains

## AI Summary Feature

The optional AI summary feature sends flow definition data directly from your browser to either:

- **OpenAI** (`api.openai.com`) — governed by [OpenAI's Privacy Policy](https://openai.com/privacy)
- **Anthropic** (`api.anthropic.com`) — governed by [Anthropic's Privacy Policy](https://www.anthropic.com/privacy)

No intermediate servers are involved. API calls go directly from your browser to the provider. You supply your own API key and are subject to the provider's terms of service.

## Data Storage

All data is stored locally in your browser:

| Data | Storage | Scope |
|---|---|---|
| Captured flow definitions | `chrome.storage.local` | Local to your browser |
| AI summaries | `chrome.storage.local` | Local to your browser |
| AI provider, model, API key | `chrome.storage.sync` | Synced across your signed-in browsers |

You can delete all stored data at any time by clicking **Clear All** in the extension popup or by uninstalling the extension.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Save captured flows and settings locally |
| `activeTab` | Access the current Power Automate tab |
| Host access to `*.powerautomate.com` / `*.powerautomate.us` | Intercept flow API responses |
| Host access to `api.openai.com` / `api.anthropic.com` | Send flow data for AI summarization (optional, user-initiated) |

## Third-Party Services

- **ExtensionPay** (`extensionpay.com`) — Used for optional payment processing. See [ExtensionPay's Privacy Policy](https://extensionpay.com/privacy).
- **OpenAI / Anthropic** — Used only when you explicitly request an AI summary. See their respective privacy policies linked above.

## Changes to This Policy

If this policy is updated, the changes will be posted here with an updated date.

## Contact

If you have questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/benton-tripp/power-automate-extractor/issues).
