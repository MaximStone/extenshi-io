# Page Lens — runtime script injection: ISOLATED vs MAIN world

Click the toolbar icon and a small panel appears on the page summarizing what
it's built with — link/image/script counts plus known framework globals it
finds on `window`.

The reason this exists: `chrome.scripting.executeScript` has two worlds, and
picking the wrong one is the classic runtime-injection bug. The extension
uses both on purpose — an **ISOLATED**-world panel that can't collide with
the page's own variables, and a **MAIN**-world probe that can see the page's
`window` — with a `bridge.js` that forwards the findings back. The
[companion tutorial](https://blog.extenshi.io/posts/chrome-scripting-runtime-injection-isolated-main-world)
explains the world model, argument passing, and the re-injection IIFE.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3; permissions `scripting`, `activeTab` — no host permissions |
| `service-worker.js` | Injects on the toolbar click: panel into ISOLATED, probe into MAIN |
| `bridge.js` | MAIN-world results → isolated world → worker, without touching page globals |
| `probe-main.js` | Reads framework globals from the page's real `window` |
| `panel.css` | Panel styling, injected with the panel |

## Run it

1. Load the folder via `chrome://extensions` → **Developer mode** → **Load unpacked**.
2. Open any page and click the **Page Lens** icon — a panel appears with page stats and detected frameworks.
3. Click again on the same page — the panel re-renders without "already declared" errors (that's the IIFE).

## Permissions

`activeTab` + `scripting`: the click grants one-tab access at invocation
time, and nothing is injected anywhere the user didn't click. This is the
pattern that lets an injector skip host permissions entirely.

MIT, like the rest of this repository.
