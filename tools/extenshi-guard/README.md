# @extenshi/guard

See, check and clean up the browser extensions installed on your machine.

```bash
npx @extenshi/guard          # same as `list` — show what's installed
npx @extenshi/guard scan     # guided: check them with extenshi.io and clean up
```

Every example below uses `npx @extenshi/guard` — the tool is meant to be run
through npx and nothing installs an `extenshi-guard` binary onto your PATH.

`@extenshi/guard` reads the on-disk profile files of the Chromium-family browsers
(Chrome, Edge, Brave, Vivaldi, Opera, Arc, Yandex, Chromium) and Firefox — across
every profile it can find, including Snap and Flatpak installs.

## Two commands, in order

### 1. `list` — see what's installed (local, no account, no network)

```bash
npx @extenshi/guard list                    # every extension, grouped by browser + profile
npx @extenshi/guard list --json             # machine-readable JSON to stdout
npx @extenshi/guard list --browser chrome   # limit to one browser (repeatable)
npx @extenshi/guard list --include-components  # also list built-in/component extensions
npx @extenshi/guard list --verbose          # also print warnings (parse failures, etc.)
```

Prints name, version, id, install origin and enabled/disabled state per extension.
Nothing is sent anywhere.

### 2. `scan` — check with extenshi.io and clean up (guided)

```bash
npx @extenshi/guard login                   # one-time: opens your browser to sign in / sign up
npx @extenshi/guard scan                    # the guided flow (see below)
npx @extenshi/guard scan --rescan           # force a fresh analysis (ignore the cached report)
npx @extenshi/guard scan --yes              # non-interactive: consent + apply all (for scripts)
npx @extenshi/guard scan --json             # print the report as JSON (never applies)
```

`scan` walks you through:

1. **Consent** — before anything is shared it explains that your extension list is
   stored on your extenshi.io profile, used in aggregate for extension-activity
   statistics, and revocable in your dojo settings. Declining sends nothing.
2. **Analysis** — sends a privacy-minimal inventory and shows, per extension, a
   risk score and a recommendation: **remove**, **disable**, or leave as is.
3. **Clean up** — an interactive checkbox picker lets you choose what to remove or
   disable. Changes are applied via the browser's own enterprise-policy mechanism
   and take effect after you restart the browser.

The report is cached (`~/.extenshi/guard-report.json`), so re-running on an
unchanged machine reuses it without spending another analysis, and re-offers
anything you haven't applied yet. A reused report is dated by when it was
analyzed and marked `(cached)` in its header — it is not a fresh verdict on
today's state. Pass `--rescan` for that (`--json` output carries the same
information as a `cachedAt` field).

### Signing in

```bash
npx @extenshi/guard login          # opens your browser; sign in or create a free account
npx @extenshi/guard login --paste  # no browser: paste an API key instead
```

`login` opens extenshi.io in your browser and shows a short pairing code in the
terminal. Sign in — or create an account right there, which is the whole point of
doing this in a browser — check that the code on the page matches the one in your
terminal, and approve. The terminal picks the key up by itself and stores it in
`~/.extenshi/config.json`.

If your browser can't be opened (SSH, a container, a headless box) the URL is
printed instead: open it anywhere, approve, and the waiting terminal still
completes. In CI, skip the login entirely and set `EXTENSHI_API_KEY` from your
secrets.

### Manage what you applied

```bash
npx @extenshi/guard status   # show which extensions guard has removed/disabled
npx @extenshi/guard undo     # revert everything guard enforced, restoring the prior state
```

Every remove/disable is fully reversible with `undo`.

Browser ids: `chrome`, `edge`, `brave`, `vivaldi`, `opera`, `arc`, `yandex`,
`chromium`, `firefox`.

## Privacy

`list` never touches the network. `scan` sends, per extension, ONLY: store id,
store, version, enabled state, install origin, install time and update URL — never
extension names, descriptions, local paths, permissions or any browsing data. The
exact payload and a consent notice are shown before anything is sent, and nothing
is submitted without your explicit agreement (`--yes` opts in for scripts). You can
revoke consent and delete the stored list any time in your dojo settings
(dojo.extenshi.io → profile).

Your API key lives in `~/.extenshi/config.json` (shared with `@extenshi/cli`).
Every account includes some free analyses; extra scan-credit packs are available at
https://dojo.extenshi.io/billing.
