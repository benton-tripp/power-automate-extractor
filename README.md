# Power Automate Flow Extractor

A Chrome/Edge extension that captures Power Automate flow definitions directly from network traffic — no HAR export or DevTools workflow needed.

## How It Works

1. A content script patches `window.fetch()` and `XMLHttpRequest` on Power Automate pages
2. API responses containing flow definitions are detected and captured automatically
3. Captured flows appear in the extension popup, ready to download or copy

```
interceptor.js  (MAIN world)  — patches fetch + XHR, posts captured flows via postMessage
       ↓
bridge.js       (ISOLATED world) — relays messages to the extension runtime
       ↓
background.js   (Service Worker) — stores flows in chrome.storage.local
       ↓
popup.html/js   (Popup UI) — lists captured flows, download/copy/delete
```

## Installation (Developer Mode)

1. Open `edge://extensions` or `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this project folder
5. Navigate to a flow in [Power Automate](https://make.gov.powerautomate.us) — the extension captures flow definitions automatically

## Usage

1. Open any flow in Power Automate (the flow editor or details page)
2. The extension badge shows `!` when a flow is captured
3. Click the extension icon to open the popup
4. For each captured flow you can:
   - **Download JSON** — saves the full flow definition as a `.json` file
   - **Copy to Clipboard** — copies the formatted JSON
   - **Delete** — removes from the captured list

## Placeholder Icons

The `icons/` directory needs 16×16, 48×48, and 128×128 PNG icons. You can generate simple placeholders:

```powershell
# Quick SVG → PNG via browser, or just drop any PNGs named:
#   icons/icon16.png
#   icons/icon48.png
#   icons/icon128.png
```

The extension works without icons — Chrome/Edge will show a default puzzle piece.

## Project Structure

```
power-automate-extractor/
├── manifest.json       MV3 extension manifest
├── interceptor.js      Fetch + XHR interceptor (MAIN world content script)
├── bridge.js           Message bridge (ISOLATED world content script)
├── background.js       Service worker — stores captured flows
├── popup.html          Extension popup markup
├── popup.css           Popup styles
├── popup.js            Popup logic — list, download, copy, delete
├── icons/              Extension icons (16/48/128 PNG)
├── .gitignore
└── README.md
```

## Future Ideas

- [ ] AI-powered flow summaries (OpenAI / Anthropic API)
- [ ] Auto-generate markdown documentation from flow definitions
- [ ] Flow diff — compare two captured versions
- [ ] Export as Power Automate-compatible package
- [ ] Options page for API key configuration

## Compatibility

- **Chrome** 109+ (MV3, `world: "MAIN"` support)
- **Edge** 109+ (same Chromium base)
- Targets `*.powerautomate.us` and `*.powerautomate.com`
