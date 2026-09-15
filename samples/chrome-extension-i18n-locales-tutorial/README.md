# Tab Tally — one build, every language

A popup that counts your open tabs and windows, an options page with one
setting, and a `_locales` tree that makes the whole thing — including the
Chrome Web Store listing — speak English, Spanish and Arabic from a single
upload. Right-to-left layout included, from one stylesheet.

The part worth reading: `name` and `description` in `manifest.json` go
through `__MSG_`, so the store listing is localized by the same
`messages.json` as the popup. Fallback is **per key**, not per file — the
Arabic locale here has two strings on purpose, and everything else comes
from `default_locale`. `chrome.i18n` has no plural support, so
`Intl.PluralRules` picks the message key (`tabCount_one` / `tabCount_other`)
and `getMessage` returns the string. The
[companion tutorial](https://blog.extenshi.io/posts/chrome-extension-i18n-locales-tutorial)
walks through the three-pass locale resolution, the `@@bidi_*` predefined
messages, and the one bidi trap a partial locale sets for you.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3; `name`, `description` and `action.default_title` are `__MSG_` references; `default_locale: en` |
| `_locales/en/messages.json` | The default locale — every key lives here, with translator `description`s |
| `_locales/es/messages.json` | Full Spanish translation |
| `_locales/ar/messages.json` | Two keys, deliberately partial — everything else falls back to `en` |
| `i18n.js` | `t()`, `tPlural()` (Intl.PluralRules picks the key) and `localizePage()` (fills `data-i18n` elements, sets `lang` and `dir`) |
| `popup.html` / `popup.js` | Counts tabs and windows via `chrome.tabs.query({})` — no `tabs` permission needed for `windowId` / `pinned` |
| `options.html` / `options.js` | One checkbox, saved to `chrome.storage.sync` |
| `shared.css` | One stylesheet for both directions: `__MSG_@@bidi_dir__`, `__MSG_@@bidi_start_edge__`, and `unicode-bidi: plaintext` on the count spans |

## Run it

1. Load the folder via `chrome://extensions` → **Developer mode** → **Load unpacked**.
2. Hover the toolbar icon: the tooltip is `action.default_title`, resolved
   from `_locales`. Open the popup — "17 tabs open in 3 windows", singular
   forms swap in when the count is 1.
3. Relaunch Chrome in Spanish. On macOS, `--lang` is ignored; set a per-app
   language instead:
   ```bash
   defaults write com.google.Chrome AppleLanguages -array es
   ```
   (`defaults delete com.google.Chrome AppleLanguages` to undo.) On Linux
   `LANGUAGE=es ./chrome`, on Windows `--lang=es --user-data-dir=...`.
4. Reload the extension and look at the **card** on `chrome://extensions`,
   not just the popup: its title and description are Spanish now. That is
   the store listing, rendered locally.
5. Do it again with `ar`: the heading turns Arabic, the accent border jumps
   to the right edge, the untranslated strings stay English.

## Permissions

`storage` only — for the extension's own setting. `chrome.i18n` needs no
permission and adds nothing to the install prompt. `chrome.tabs.query({})`
runs without the `tabs` permission because counting needs neither `url`
nor `title`.

Before publishing your own localized extension, run it through the free
pre-publish scan:

```bash
npx @extenshi/cli@latest scan ./chrome-extension-i18n-locales-tutorial
```

## Credits

Written for the extenshi.io blog; grounded in the official
[`chrome.i18n`](https://developer.chrome.com/docs/extensions/reference/api/i18n)
reference, the
[Internationalize the interface](https://developer.chrome.com/docs/extensions/develop/ui/i18n)
guide and Google's Apache-2.0
[`api-samples/il8n`](https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/api-samples/il8n)
sample. Licensed MIT like the rest of this repository.
