# Permission Desk — optional permissions requested at the click, not at install

An extension that installs with **no permission warning at all**, then asks
for what it needs the moment you switch a feature on: `topSites` for the
most-visited list, a single host permission for the page-count feature.

The pattern this demonstrates — declare features `optional` in the manifest,
call `chrome.permissions.request()` inside the click that turns the feature
on, and degrade gracefully when the user says no — is the single most
effective way to shrink an extension's install-time warning wall. The
[companion tutorial](https://blog.extenshi.io/posts/optional-permissions-request-at-runtime-tutorial)
builds the whole flow, including revocation.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3; `permissions: ["storage", "activeTab"]` + `optional_permissions: ["topSites"]` + `optional_host_permissions: ["https://*/*"]` (the request narrows it to one origin at runtime) |
| `popup.html` / `popup.js` / `popup.css` | Feature switches wired to `permissions.request()` / `.remove()` |
| `service-worker.js` | Feature implementations once the permission lands |

## Run it

1. Load the folder via `chrome://extensions` → **Developer mode** → **Load unpacked** — note the install warning says nothing scary.
2. Open the popup and flip a feature on — Chrome asks for that feature's permission right there.
3. Decline, and the feature shows its empty state instead of breaking; flip it off to revoke.

## Permissions

`storage` and `activeTab` are the only upfront grants (neither warns at
install). Everything sensitive — `topSites`, the per-host page check — is
requested at runtime, per feature, revocable — the exact opposite of
`<all_urls>` at install.

MIT, like the rest of this repository.
