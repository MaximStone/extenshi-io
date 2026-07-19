# `@extenshi/cli` — command reference

[![npm](https://img.shields.io/npm/v/@extenshi/cli)](https://www.npmjs.com/package/@extenshi/cli)

The Extenshi CLI is a command-line tool for browser-extension developers. It runs
a **pre-publish security scan**, **predicts Chrome Web Store review outcomes**
before you submit, **previews your icon** inside real browser toolbars, and
**publishes** a build straight to Chrome, Firefox, and Edge from your machine.

Requires **Node 20+**. Nothing to self-host.

```bash
npx @extenshi/cli@latest scan ./dist/my-extension.zip
```

The examples below use the shorthand `extenshi`. Alias it so every run still
pulls the newest published version — there is no global install to upgrade:

```bash
alias extenshi="npx @extenshi/cli@latest"
```

---

## What's free

Most of the CLI needs **no account and no network**. Only `scan` spends credits.

| Command | Needs an API key? | Runs offline? |
| --- | --- | --- |
| `extenshi icon preview <icon>` | **No** | ✅ fully local |
| `extenshi review-risk <artifact>` | **No** | ✅ local (optional catalog diff if you pass `--extension-id`) |
| `extenshi publish <artifact>` | **No** (your own store credentials) | Uploads go straight to the store APIs |
| `extenshi login` | — | ✅ local |
| `extenshi scan <artifact>` | Yes — **1 scan credit** | Uploads the artifact to the scan backend |

Every account includes a free allowance to try things out. Create a key at
[dojo.extenshi.io/api-keys](https://dojo.extenshi.io/api-keys); metering is
documented at [docs.extenshi.io/developers/scan-credits](https://docs.extenshi.io/developers/scan-credits).

---

## Commands at a glance

| Command | What it does |
| --- | --- |
| [`scan <artifact>`](#extenshi-scan-artifact) | Pre-publish security scan of a `.crx` / `.xpi` / `.zip`, with an HTML report |
| [`review-risk <artifact>`](#extenshi-review-risk-artifact) | Predict store review outcomes: REJECTED / ATTRITION / SLOW |
| [`icon preview <icon>`](#extenshi-icon-preview-icon) | Render an icon inside Chrome / Firefox / Edge toolbars, with contrast checks + PNG/ZIP export |
| [`publish <artifact>`](#extenshi-publish-artifact) | Upload a build to Chrome, Firefox, and/or Edge with your own store credentials |
| [`login`](#extenshi-login) | Save your API key to `~/.extenshi/config.json` |

`extenshi --help` and `extenshi <command> --help` print the same information
from the installed version.

---

## `extenshi scan <artifact>`

Scans a packaged extension and reports security findings. By default it writes a
branded, filterable **HTML report** and opens it in your browser; live
per-scanner progress streams to the terminal while it runs. A store-review
prediction (the same checks as `review-risk`) is folded into the report unless
you opt out.

```bash
extenshi scan ./dist/my-extension.zip
```

📄 **See the output:** [`examples/scan-report.html`](../../examples/) — plus the
Markdown and JSON forms of the same run.

| Option | Description |
| --- | --- |
| `--format <html\|json\|stdout>` | Output format. `html` (default) writes a report file and opens it; `json` prints raw JSON to stdout; `stdout` prints pretty findings in the terminal. |
| `--output <path>` | Path for the HTML report (default: `<artifact>-extenshi-report.html`; `--format html` only). |
| `--no-open` | Do not open the HTML report in the browser after generating it. |
| `--json` | Shortcut for `--format json`. |
| `--report <path>` | *Also* write a formatted report file (Markdown by default; a `.json` path writes raw JSON). Composes with `--format`. |
| `--report-format <md\|json>` | Force the `--report` file format instead of inferring it from the path extension. |
| `--extension-id <id>` | Numeric catalog ID of a **verified** extension — required to spend a *free* scan credit. Paid credits don't need it. |
| `--exclude-compliance-review` | Skip the store-review prediction that `scan` runs by default. |
| `--no-stream` | Disable live progress streaming; wait for a single final response. |
| `--skip-preflight` | Skip the CI timeout pre-flight probe (use at your own risk). |
| `--api-url <url>` | Override the scan API base URL (default: `https://scan.extenshi.io`). |

### The HTML report

Findings are **de-duplicated**: one rule firing across 40 files collapses into a
single collapsible row with a count and the list of locations, instead of 40
near-identical lines. On top of that the page has severity/scanner/free-text
filters, a sticky table of contents, a light/dark toggle, and a verdict banner.
It is a **single self-contained file** — inline CSS and JS, no external assets —
so it opens from disk and works offline. Archive it as a CI artifact and it stays
readable months later.

### In CI

```yaml
- run: npx @extenshi/cli@latest scan ./dist/my-extension.zip --json > scan-report.json
  env:
    EXTENSHI_API_KEY: ${{ secrets.EXTENSHI_API_KEY }}
```

When `CI` is set, the HTML report is still written (so the job can archive it)
but never opened. A non-zero exit code means the scan **failed to run** — parse
the JSON for the actual findings and decide your own failure threshold.

A full GitHub Actions walkthrough lives at
[docs.extenshi.io/developers/cli-github-actions](https://docs.extenshi.io/developers/cli-github-actions).

> ⚠️ Scans run automated heuristics that may miss real issues or over-flag benign
> code. A clean result is not a guarantee of safety or store approval — see
> [How scanning works](https://docs.extenshi.io/methodology).

---

## `extenshi review-risk <artifact>`

Predicts how the **store review** will go *before* you submit, sorted by
consequence:

- **WILL BE REJECTED** — the submission fails policy as-is;
- **USER ATTRITION** — the update auto-disables the extension for existing users
  until they re-grant a permission;
- **TRIGGERS SLOW REVIEW** — nothing fatal, but it routes you into manual review.

Runs fully offline against the artifact's manifest. **No API key, no upload.**

```bash
extenshi review-risk ./dist/my-extension.zip
```

| Option | Description |
| --- | --- |
| `--extension-id <id>` | Numeric catalog ID — enables the auto-disable diff against your **last published** manifest (Ownership tab in dojo). |
| `--store <chrome\|firefox\|edge>` | Store to diff the manifest against (default: `chrome`). Permission sets differ per store. |
| `--catalog-url <url>` | Override the catalog API base URL (default: `https://bff.extenshi.io`). |
| `--json` | Output raw JSON findings. |

---

## `extenshi icon preview <icon>`

Renders a local `.svg` or `.png` icon **inside realistic browser toolbar
mockups** so you can judge it the way users actually see it — at 16 px, among
neighbor extensions, on light *and* dark toolbars. Writes one self-contained HTML
file and opens it. **Fully offline, no API key, nothing leaves your machine.**

```bash
extenshi icon preview ./icon.svg --name "My Extension"
```

📄 **See the output:** [`examples/icon-preview.html`](../../examples/)

The page gives you:

- **Chrome, Firefox, and Edge toolbars** with your icon pinned among neighbors,
  plus the Chrome extensions menu;
- a **palette switcher** — light, tinted, dark, black, saturated, and a custom
  toolbar color;
- a **contrast strip** rendering the icon on every palette at once, with an
  automatic warning when it melts into the background, and a mid-gray detector;
- a **canvas-usage meter** with an edge-to-edge trim toggle (wide transparent
  margins make your icon look smaller than its neighbors);
- the **store-size matrix** (16 / 32 / 48 / 128 px) and an **8× magnifier** of
  the 16 px pixels;
- **export buttons**: per-size PNGs, a ZIP (`icons/*.png` + the SVG master +
  `manifest-icons.json`), and a copy-paste manifest snippet.

| Option | Description |
| --- | --- |
| `--name <name>` | Extension display name shown in the mockups (default: derived from the file name). |
| `--output <path>` | Path for the preview HTML file (default: `<icon-base>-icon-preview.html`). |
| `--no-open` | Do not open the preview in the browser after generating it. |

> Want your coding agent to drive this loop — draw the SVG, render the page,
> iterate on the warnings, export the set? Install the free
> [**extension-icon-design skill**](../../skills/extension-icon-design/).

---

## `extenshi publish <artifact>`

Uploads a packaged extension straight to the store APIs **from your machine** —
the artifact and your store credentials never touch Extenshi servers, so no
Extenshi API key is required.

```bash
extenshi publish ./dist/my-extension.zip --stores chrome,edge
```

| Option | Description |
| --- | --- |
| `--stores <list>` | Comma-separated stores: `chrome,firefox,edge` (default: every store with complete credentials). |
| `--firefox-artifact <path>` | Separate `.xpi` for Firefox (default: the main artifact). |
| `--release-notes <text>` | Release notes passed to stores that accept them. |
| `--validate` | Only validate store credentials; publish nothing. |
| `--no-wait` | Edge: return after commit without polling the operation to a terminal status. |
| `--extension-id <id>` | Numeric catalog ID — checks publish access against that specific extension. |
| `--json` | Output raw JSON result. |

Store credentials come from the environment (or a local `.env`). Provide the full
set for each store you target:

| Store | Required environment variables |
| --- | --- |
| Chrome | `CHROME_APP_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN` |
| Firefox | `FIREFOX_ADDON_GUID`, `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET` |
| Edge | `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID`, `EDGE_CLIENT_SECRET`, `EDGE_TENANT_ID` |

Run `extenshi publish <artifact> --validate` first to confirm which stores are
configured. The recommended flow is scan, then publish:

```bash
extenshi scan dist.zip && extenshi publish dist.zip
```

> Publishing is in an active testing phase — access is gated. Sign in with
> `extenshi login` so the access check can recognize your account.

---

## `extenshi login`

Saves your API key to `~/.extenshi/config.json`, where `scan` and the
[MCP server](../extenshi-mcp/) both read it from.

```bash
extenshi login                      # interactive prompt
extenshi login --api-key ek_…       # non-interactive
```

| Option | Description |
| --- | --- |
| `--api-key <key>` | API key (skips the interactive prompt). |
| `--api-url <url>` | Override the scan API base URL. |

The key can also come from `EXTENSHI_API_KEY` in the environment or a local
`.env` — checked in that order, so CI never needs the config file.

---

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `EXTENSHI_API_KEY` | — | Your `ek_…` developer key (only `scan` requires it) |
| `EXTENSHI_API_URL` | `https://scan.extenshi.io` | Scan backend base URL |
| `EXTENSHI_BFF_URL` | `https://bff.extenshi.io` | Catalog read API base URL |
| `CI` | — | When set, the HTML report is written but not opened |
| `DO_NOT_TRACK` / `EXTENSHI_TELEMETRY=0` | — | Disable anonymous usage telemetry |

**Telemetry:** the CLI records which command ran, whether it succeeded, and a
coarse error kind. No artifact contents, file names, findings, or API keys.
Honors `DO_NOT_TRACK`; opt out entirely with `EXTENSHI_TELEMETRY=0`.

---

## See also

- [Examples of every output](../../examples/) — HTML report, Markdown, JSON, icon preview
- [`extension-icon-design` skill](../../skills/extension-icon-design/) — free agent skill
- [`@extenshi/mcp`](../extenshi-mcp/) — the same capabilities inside Claude Code, Claude Desktop, and Cursor
- [Full docs](https://docs.extenshi.io/developers/cli)
