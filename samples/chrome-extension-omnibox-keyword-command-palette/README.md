# Jump — a command palette in Chrome's address bar, for zero permissions

Type `go`, press space, and the address bar becomes your own command line:
live suggestions with native-looking highlighting, Enter to navigate,
anything unmatched falling through to a web search.

The part worth reading: the whole omnibox surface costs **no permission
warning at all**. `"omnibox": { "keyword": "go" }` is a manifest key, not a
permission — the only entry in `permissions` here is `storage`, and that is
for the user's own shortcut list. Every listener sits at the top level of the
worker because Chrome is free to terminate and respawn it between two
keystrokes of the same session, and `onInputChanged` warms its cache in
`onInputStarted` so it is only ever async on the first keystroke. The
[companion tutorial](https://blog.extenshi.io/posts/chrome-extension-omnibox-keyword-command-palette)
walks through the `<match>`/`<dim>`/`<url>` markup, the five-entity escaping
rule, and why `disposition` is the argument everyone forgets.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3; `omnibox.keyword` is a manifest key, not a permission; `storage` is the only entry in `permissions` |
| `service-worker.js` | Top-level `onInputStarted` / `onInputChanged` / `onInputEntered`; escaping, highlighting, disposition handling |
| `options.html` / `options.js` | One shortcut per line, saved to `chrome.storage.sync` |

## Run it

1. Load the folder via `chrome://extensions` → **Developer mode** → **Load unpacked**.
2. Click into the address bar, type `go`, then press **space** (or Tab). The
   chip that appears carries the extension's name.
3. Type `ma` — Gmail appears with the typed letters in bold. Enter navigates
   the current tab; Ctrl/Cmd+Enter opens a new one.
4. Type something that matches nothing and press Enter: you get a web search,
   because the resolver fell through.
5. Open **Details → Extension options** to edit the list; the new shortcut is
   live in the address bar immediately, via `storage.onChanged`.

## Permissions

`storage` only — no install warning. The omnibox itself declares nothing:
one manifest key buys the entire address-bar surface. Note that accepting an
omnibox suggestion is one of the four gestures Chrome treats as consent for
`activeTab`, so an extension that also declares `activeTab` can script the
page right after the user picks a suggestion. This one doesn't.

MIT, like the rest of this repository.
