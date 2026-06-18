# Diff Tool

Client-only static app for comparing text side by side in the browser.

Default flow:

1. Paste original text.
2. Paste changed text.
3. Click **Find Difference** or press `Cmd+Enter` / `Ctrl+Enter`.
4. Review the summary, counts, line diff, and inline highlights.

## What It Does

- Shows side-by-side line diffs with line numbers.
- Highlights additions, removals, and modified lines.
- Shows change counts and a plain-language classification.
- Syncs scrolling between both diff panes.
- Detects JSON and simple YAML, then offers key sorting before comparing.
- Runs locally in the browser. Text is not uploaded by this app.

## Quick Start

```bash
cd /Users/mkamar/Non_Work/Projects/mac-diff-tool
python3 -m http.server 8000
```

Open: `http://127.0.0.1:8000`

For a quick local-only check, opening `index.html` directly still works for the core diff UI. Use the local server for install/offline behavior because service workers require a secure browser context such as `localhost` or `127.0.0.1`.

## Offline Install

Default path:

1. Open the hosted app once while online.
2. Use the browser install action when it appears.
3. Launch Diff Tool from the installed app shortcut when offline.

Offline support is implemented as a Progressive Web App:

- `manifest.webmanifest` provides the app name, icons, scope, start URL, theme color, and standalone display mode.
- `service-worker.js` precaches the app shell: HTML, CSS, JS, manifest, service worker, and icons.
- Pasted text and generated diff output are never cached by the app.

Limits:

- First use requires a network connection so the browser can install the service worker and fill the offline cache.
- Browser storage can be cleared or evicted.
- Chromium desktop and mobile browsers provide the strongest install experience.

## Analytics

PostHog analytics are configured as a small optional adapter around local workflow events.

Default behavior:

- Localhost, `127.0.0.1`, and unknown hosts do not load PostHog or send analytics.
- Production analytics are allowed only for `katooling.github.io` in `window.DIFF_TOOL_ANALYTICS`.
- The public PostHog project token is safe to ship in `index.html`; do not add a personal API key.
- Autocapture, pageleave, dead-click capture, session recording, surveys, feature flags, and persistent browser storage are disabled.

Tracked events:

- `dt_app_view`
- `dt_diff_run`
- `dt_normalize_run`
- `dt_swap_click`
- `dt_clear_click`
- `dt_theme_change`
- `dt_install_click`

Privacy rules:

- Never send pasted text, raw diff content, local paths, filenames, or raw error messages.
- Send format names, classifications, and size/count buckets instead of exact text details.
- Analytics failure must never block comparing, normalizing, swapping, clearing, or offline use.

Local verification:

```bash
npm run test:e2e:agent -- --grep "analytics"
```

Manual stub mode:

```text
http://127.0.0.1:8000/?analytics=stub
```

Then inspect:

```js
window.__diffToolDebug.getAnalyticsEvents()
```

## Debug Helpers

The app exposes local-only inspection helpers for tests and debugging:

```js
window.__diffToolDebug.getLastDiffSummary()
window.__diffToolDebug.getLastNormalizedFormat()
window.__diffToolDebug.getThemeState()
window.__diffToolDebug.getPwaState()
window.__diffToolDebug.getAnalyticsState()
window.__diffToolDebug.getAnalyticsEvents()
window.__diffToolDebug.getAppEvents()
```

These helpers must not expose pasted text.

## Test

```bash
cd /Users/mkamar/Non_Work/Projects/mac-diff-tool
npm install
npx playwright install chromium
npm run test:e2e:core
```

Useful variants:

```bash
npm run test:e2e:agent
npm run test:e2e:agent -- --grep "offline"
npm run test:e2e:headed
npm run test:e2e:report
```

Coverage includes:

- Core diff flow, shortcut, clear, swap, normalization, synced scrolling, and mobile layout.
- System theme, persisted theme toggle, and accessible theme button state.
- PWA manifest, icons, service worker cache, offline reload, and install prompt state.
- Analytics disabled/stub/live-blocked behavior and privacy leakage checks.

## CI

`.github/workflows/e2e-core.yml` runs the same default proof on pushes, pull requests, and manual dispatch:

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:e2e:core
```

## Requirements

- Any modern browser for app use.
- Node 22 for the Playwright proof path.
- No backend and no build step.
