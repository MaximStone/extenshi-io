# SPA Route Panel — content scripts that survive single-page-app navigation

A content script that shows the current route in a small on-page panel on
YouTube — and, unlike the naive version, keeps it correct after in-app
navigation, because YouTube never reloads the page.

The tutorial
([content scripts vs SPAs](https://blog.extenshi.io/posts/content-script-spa-navigation-mv3))
compares the two fixes: a declarative `webNavigation` listener with the
`frameId !== 0` guard, and a permission-free variant that catches YouTube's
own route events. The `content/` subfolder is the injected part; the service
worker decides when to re-run it.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3; permission `webNavigation`; content script registered for `*.youtube.com` |
| `content/panel.js` / `content/panel.css` | The on-page route panel (injected, re-runnable) |
| `service-worker.js` | Listens for history/state navigations and tells the panel to re-render |

## Run it

1. Load the folder via `chrome://extensions` → **Developer mode** → **Load unpacked**.
2. Open any YouTube video page — a small panel shows the current route.
3. Click to another video (no full reload) — the panel updates, where a naive content script would have gone stale.

## Permissions

`webNavigation` for the route-change events. The content script itself is
declared in the manifest for `*.youtube.com` — a host-scoped registration, not
`<all_urls>`.

MIT, like the rest of this repository.
