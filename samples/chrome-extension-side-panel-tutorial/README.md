# Browsing Notepad — a side panel that stays open while you browse

A notepad that docks in Chrome's side panel and persists across tabs and
navigations, with per-site notes: the Step 5 variant keeps one note per
hostname, driven by the active tab.

The companion tutorial
([side panels end to end](https://blog.extenshi.io/posts/chrome-extension-side-panel-tutorial))
covers the parts people trip on: opening the panel in response to the toolbar
click via `sidePanel.setPanelBehavior`, why the panel is a real document with
its own storage, and which permission each feature actually needs.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3; permissions `sidePanel`, `storage`, `tabs` |
| `service-worker.js` | `onInstalled` wiring for `openPanelOnActionClick`; picks the note key from the active tab |
| `sidepanel.html` / `sidepanel.js` / `sidepanel.css` | The panel UI: load, edit, and save the note for the current site |

## Run it

1. Load the folder via `chrome://extensions` → **Developer mode** → **Load unpacked**.
2. Click the toolbar icon — the notepad docks on the right.
3. Type a note, switch tabs and sites — the panel stays open and swaps notes per hostname.

## Permissions

`sidePanel` for the panel itself, `storage` for the notes, `tabs` to read the
active tab's URL so notes can be per-site. Drop the per-site feature and you
can drop `tabs` with it.

MIT, like the rest of this repository.
