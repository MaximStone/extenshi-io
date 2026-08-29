# Extension Auditor — audit every installed extension with chrome.management

A popup-only extension that lists everything installed in the browser with
Chrome's own permission warnings, sorted broadest-capability-first — the
audit you wish the extensions page gave you.

The interesting part is the sort: a heuristic set of high-risk permissions
(`debugger`, `proxy`, `nativeMessaging`, `webRequest`, `cookies`, …) ranks
what you should look at first, while the displayed warnings stay the exact
strings Chrome shows at install time. The
[companion tutorial](https://blog.extenshi.io/posts/chrome-management-api-audit-installed-extensions)
builds it step by step.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3; permission `management` only. No background page — the popup is the whole app |
| `popup.html` / `popup.js` / `popup.css` | `chrome.management.getAll()`, risk sort, per-extension warning list |

## Run it

1. Load the folder via `chrome://extensions` → **Developer mode** → **Load unpacked**.
2. Click the **Extension Auditor** icon.
3. Every installed extension appears with its permission warnings, riskiest first.

## Permissions

`management` — read-only information about installed extensions. Notably no
`tabs`, no host permissions: auditing never needs to touch page content.

MIT, like the rest of this repository.
