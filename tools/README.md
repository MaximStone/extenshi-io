# Developer tools

extenshi.io ships two free, public tools to npm. Both authenticate with your own
Extenshi API key and talk to the public backend — there is nothing to self-host,
and with `npx` there is nothing to install either.

> **Get an API key** (free): sign up at <https://auth.extenshi.io/signup>, then
> create a key at <https://dojo.extenshi.io/api-keys>.
> Every account starts with a **one-time free allowance — 10 catalog reads and
> 3 scans**; beyond it, prepaid credit packs **never expire**. The `search_docs`
> and icon/welcome workflow capabilities are free and need no key at all.

**Always pin `@latest`.** `npx @extenshi/cli@latest` re-resolves the newest
published version on every run; a bare `npx @extenshi/cli` reuses whatever is in
your npx cache, and a global `npm i -g` install pins the version you installed
until you remember to upgrade it.

---

## `@extenshi/cli` — scan, predict the review, check what's installed, preview the icon, publish

[![npm](https://img.shields.io/npm/v/@extenshi/cli)](https://www.npmjs.com/package/@extenshi/cli)

→ **[Full command reference](./extenshi-cli/)** · **[Example output](../examples/)**

Scan a built extension artifact (`.zip` / `.crx` / `.xpi`) for security and
supply-chain risks **before** you ship it — and check the things that actually
get releases rejected. Designed to run in CI. Requires Node 20+.

```bash
npx @extenshi/cli@latest login                                        # once — saves your key to ~/.extenshi
npx @extenshi/cli@latest scan ./dist/my-extension.zip                 # security scan → HTML report (1 scan credit)
npx @extenshi/cli@latest review-risk ./dist/my-extension.zip          # store-review prediction (free, offline)
npx @extenshi/cli@latest icon preview ./icon.svg                      # icon in real toolbars (free, offline)
npx @extenshi/cli@latest risk --file ./installed.txt                  # safety scores in bulk (1 read credit / 40 ids)
npx @extenshi/cli@latest publish ./dist/my-extension.zip              # push to Chrome / Firefox / Edge, your own store creds
```

Only `scan` (1 scan credit) and `risk` (1 read credit per call, up to 40
extensions) need an API key. `review-risk`, `icon preview`, and `publish` run
without an Extenshi account — `publish` uses *your* store credentials and uploads
straight from your machine.

Tired of typing it? `alias extenshi="npx @extenshi/cli@latest"` keeps every run
on the current version.

In CI, set `EXTENSHI_API_KEY` as a secret and fail the build on high-risk
findings. Every command and flag is documented in
[`extenshi-cli/README.md`](./extenshi-cli/) (and
`npx @extenshi/cli@latest --help`).

---

## `@extenshi/mcp` — the catalog inside your AI tools

[![npm](https://img.shields.io/npm/v/@extenshi/mcp)](https://www.npmjs.com/package/@extenshi/mcp)

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes
the Extenshi catalog, security analysis, market research, and pre-publish scanning
to **Claude Code, Claude Desktop, Cursor**, and any other MCP client. Runs locally
over stdio.

**Configure your MCP client:**

```json
{
  "mcpServers": {
    "extenshi": {
      "command": "npx",
      "args": ["-y", "@extenshi/mcp@latest"],
      "env": { "EXTENSHI_API_KEY": "ek_…" }
    }
  }
}
```

`-y @extenshi/mcp@latest` is deliberate: the client re-resolves the package on
launch, so a long-lived MCP config doesn't freeze on an old server build.

**Tools it provides:**

| Tool | What it does | Cost |
| --- | --- | --- |
| `search_extensions` | Hybrid search across Chrome/Firefox/Edge with filters (store, category, pricing, rating, risk, permissions, manifest version, freshness) | 1 read |
| `get_extension` | Full catalog detail for one extension | 1 read |
| `get_reviews` | Store user reviews from Firefox and Edge, plus store-level rating aggregates | 1 read |
| `get_security` | Risk score + finding counts + top grouped findings + install preview | 3 reads |
| `get_risk_by_store_ids` | Safety scores for **up to 40** extensions by store id — for auditing a list of installed extensions | 1 read per call |
| `market_overview` | Catalog-wide stats: store split, category tree, MV2/MV3 adoption, permission histogram, risk tiers | 1 read |
| `get_credit_balance` | Remaining read / scan credits — check before a big batch | **Free** |
| `search_docs` | Search the docs + CLI reference so the assistant can quote exact commands | **Free (no key)** |
| `generate_icon_workflow` | Returns the local draw-SVG → toolbar-preview → export workflow for extension icons | **Free (no key)** |
| `generate_welcome_page_workflow` | Returns the design brief for the page users land on right after install | **Free (no key)** |
| `scan_extension` | Pre-publish security scan of a local artifact, with live progress | 1 scan |
| `publish_extension` | Publish to the stores with your own credentials (fully local) | Free |

Prefer `get_risk_by_store_ids` over calling `get_security` in a loop: 40
extensions for one read credit instead of three credits each.

Not using MCP? The same icon workflow ships as a plain
[`SKILL.md`](../skills/extension-icon-design/) for Claude Code and other
instruction-file agents.

Free credits are a one-time allowance, not a monthly quota; top up with prepaid
packs (they never expire) at <https://dojo.extenshi.io/billing>.

---

## Configuration reference

Both tools read the same environment variables.

| Env var | Default | Purpose |
| --- | --- | --- |
| `EXTENSHI_API_KEY` | — | Your `ek_…` developer key (required for catalog/scan tools) |
| `EXTENSHI_BFF_URL` | `https://bff.extenshi.io` | Catalog read API base URL |
| `EXTENSHI_API_URL` | `https://scan.extenshi.io` | Scan backend base URL |
| `EXTENSHI_DOCS_URL` | `https://docs.extenshi.io` | Docs base URL for `search_docs` |

The CLI also honours `CI` (writes the HTML report without opening it) and
`DO_NOT_TRACK` / `EXTENSHI_TELEMETRY=0` (opts out of anonymous usage telemetry).
