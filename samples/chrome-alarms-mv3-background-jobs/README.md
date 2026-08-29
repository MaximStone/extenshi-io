# Tab Curfew — background jobs that outlive the MV3 service worker

`setInterval` dies with the service worker. This extension counts your open
tabs on a schedule and badges the toolbar when you're over your limit — using
`chrome.alarms`, which is the one timer Chrome will actually wake a dead
worker for.

The part worth reading: `createAlarm()` sets `persistAcrossSessions: true`
through a guard, because the flag is Chrome 150+ only and handing it to an
older Chrome throws a TypeError — while the get-or-create `ensureAlarm()` at
the top of the worker is what keeps the alarm alive everywhere else. The
[companion tutorial](https://blog.extenshi.io/posts/chrome-alarms-mv3-background-jobs)
walks through why every listener sits at the top level and why state lives in
`chrome.storage`, not in variables.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3; permissions `alarms`, `storage` — both install-warning-free |
| `service-worker.js` | Top-level listeners; get-or-create alarm; per-wake tab count and badge |
| `popup.html` / `popup.js` | Sets the tab threshold; reads the nudge counter |

## Run it

1. Load the folder via `chrome://extensions` → **Developer mode** → **Load unpacked**.
2. Open a handful of tabs — the badge shows the live count on every alarm tick and at worker startup.
3. Set a threshold of 3 in the popup, open more tabs than that, and watch the badge turn orange.

## Permissions

`alarms` and `storage` only — no warning at install. The tab *count* needs no
`"tabs"` permission at all; `chrome.tabs.query({}).length` works without it.

MIT, like the rest of this repository.
