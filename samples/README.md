# Sample extensions

Complete, loadable extension code from the extenshi.io blog tutorials — the
exact code the articles walk through, kept runnable. Every sample here builds
and loads via the same checker the tutorials are verified with, and was
driven end-to-end in a real Chrome before publishing. Load one via
`chrome://extensions` → **Developer mode** → **Load unpacked**.

| Sample | What it demonstrates | Tutorial |
|---|---|---|
| [`chrome-management-api-audit-installed-extensions/`](./chrome-management-api-audit-installed-extensions/) | `chrome.management`: audit every installed extension with Chrome's own permission warnings, broadest capability first | [Build a permission audit popup](https://blog.extenshi.io/posts/chrome-management-api-audit-installed-extensions) |
| [`chrome-alarms-mv3-background-jobs/`](./chrome-alarms-mv3-background-jobs/) | `chrome.alarms`: background jobs that outlive service-worker termination; get-or-create alarm pattern; the `persistAcrossSessions` Chrome-150+ trap | [Background jobs in MV3](https://blog.extenshi.io/posts/chrome-alarms-mv3-background-jobs) |
| [`chrome-extension-side-panel-tutorial/`](./chrome-extension-side-panel-tutorial/) | `chrome.sidePanel`: a notepad docked beside the page that persists across tabs, with per-site notes | [Build a UI that stays open](https://blog.extenshi.io/posts/chrome-extension-side-panel-tutorial) |
| [`content-script-spa-navigation-mv3/`](./content-script-spa-navigation-mv3/) | Content scripts in single-page apps: keeping an on-page panel correct across YouTube route changes | [Surviving a route change in MV3](https://blog.extenshi.io/posts/content-script-spa-navigation-mv3) |
| [`chrome-scripting-runtime-injection-isolated-main-world/`](./chrome-scripting-runtime-injection-isolated-main-world/) | `chrome.scripting.executeScript`: inject on click with `activeTab`, pass args safely, ISOLATED vs MAIN world with a bridge | [Runtime script injection](https://blog.extenshi.io/posts/chrome-scripting-runtime-injection-isolated-main-world) |
| [`declarativenetrequest-block-rewrite-requests-tutorial/`](./declarativenetrequest-block-rewrite-requests-tutorial/) | `declarativeNetRequest`: block domains and strip tracking parameters as declarative rules, no code on the request path | [A hands-on declarativeNetRequest tutorial](https://blog.extenshi.io/posts/declarativenetrequest-block-rewrite-requests-tutorial) |
| [`optional-permissions-request-at-runtime-tutorial/`](./optional-permissions-request-at-runtime-tutorial/) | Optional permissions: install with no warning, request `topSites` and a single host at the click that needs them | [Ask at the click, not at install](https://blog.extenshi.io/posts/optional-permissions-request-at-runtime-tutorial) |
| [`offscreen-documents-mv3-service-worker-dom/`](./offscreen-documents-mv3-service-worker-dom/) | Offscreen documents: `DOMParser` and clipboard work from a hidden page, controlled by a DOM-less service worker | [Using the DOM from an MV3 service worker](https://blog.extenshi.io/posts/offscreen-documents-mv3-service-worker-dom) |
| [`record-current-tab-tabcapture-offscreen-mv3/`](./record-current-tab-tabcapture-offscreen-mv3/) | `chrome.tabCapture` + `MediaRecorder`: record the current tab's video and audio via the stream-ID hand-off into an offscreen document | [Record the current tab from an MV3 extension](https://blog.extenshi.io/posts/record-current-tab-tabcapture-offscreen-mv3) |
| [`chrome-privacy-panel-levelofcontrol-browsingdata/`](./chrome-privacy-panel-levelofcontrol-browsingdata/) | `chrome.privacy` + `chrome.browsingData` + `chrome.contentSettings`: a privacy panel that reads `levelOfControl` before it draws a switch, with the loud permissions requested at the click | [A panel that admits what it can't change](https://blog.extenshi.io/posts/chrome-privacy-panel-levelofcontrol-browsingdata) |

Each sample directory carries its own README with the file map, run steps,
and the permission bill. All MIT.
