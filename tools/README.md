# Developer tools

extenshi.io ships three public tools to npm. Catalog and scan calls authenticate
with your own Extenshi API key and talk to the public backend — there is nothing
to self-host, and with `npx` there is nothing to install either.

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

## `@extenshi/cli` — scan, predict the review, draft the listing, localize, sync the project, preview the icon, publish

[![npm](https://img.shields.io/npm/v/@extenshi/cli)](https://www.npmjs.com/package/@extenshi/cli)

→ **[Full command reference](./extenshi-cli/)** · **[Example output](../examples/)**

Scan a built extension artifact (`.zip` / `.crx` / `.xpi`) for security and
supply-chain risks **before** you ship it — and check the things that actually
get releases rejected. Designed to run in CI. Requires Node 20+.

```bash
npx @extenshi/cli@latest login                                        # once — browser sign-in, key saved to ~/.extenshi
npx @extenshi/cli@latest scan ./dist/my-extension.zip                 # security scan → HTML report (1 scan credit)
npx @extenshi/cli@latest review-risk ./dist/my-extension.zip          # store-review prediction (free, offline)
npx @extenshi/cli@latest generate-listing ./dist/my-extension.zip     # CHROMEWEBSTORE.md (free, offline)
npx @extenshi/cli@latest localize check ./extension                   # locale messages (free, offline)
npx @extenshi/cli@latest icon preview ./icon.svg                      # icon in real toolbars (free, offline)
npx @extenshi/cli@latest risk --file ./installed.txt                  # safety scores in bulk (1 read credit / 40 ids)
npx @extenshi/cli@latest project diff                                 # Dojo project metadata (API key)
npx @extenshi/cli@latest publish ./dist/my-extension.zip              # push to Chrome / Firefox / Edge, your own store creds
```

Only `scan` (1 scan credit) and `risk` (1 read credit per call, up to 40
extensions) spend credits. `review-risk`, `generate-listing`, `localize`, and
`icon preview` run without an Extenshi account. `publish` uses *your* store
credentials and uploads straight from your machine; it is in an active testing
phase, so sign in once and the CLI checks whether your account can publish.
`doctor`, `project`, `release`, and `evidence` use the same API key and do not
spend catalog read or scan credits. The long form is
[`extenshi-cli/README.md`](./extenshi-cli/) and
[the project sync guide](https://docs.extenshi.io/developers/project-sync).

Tired of typing it? `alias extenshi="npx @extenshi/cli@latest"` keeps every run
on the current version.

In CI, set `EXTENSHI_API_KEY` as a secret and fail the build on high-risk
findings. Every command and flag is documented in
[`extenshi-cli/README.md`](./extenshi-cli/) (and
`npx @extenshi/cli@latest --help`).

---

## `@extenshi/guard` — what is installed on this machine

[![npm](https://img.shields.io/npm/v/@extenshi/guard)](https://www.npmjs.com/package/@extenshi/guard)

→ **[Command reference](./extenshi-guard/)** · **[guard.extenshi.io](https://guard.extenshi.io)**

Reads the on-disk profiles of Chrome, Edge, Brave, Vivaldi, Opera, Arc, Yandex,
Chromium, and Firefox. `list` stays on the machine. `scan` asks before it sends
a privacy-minimal inventory (store id, store, version, enabled state, install
origin, install time, update URL) and then offers to remove or disable what you
pick. `undo` puts back what Guard changed.

```bash
npx @extenshi/guard@latest list          # local, no account
npx @extenshi/guard@latest login         # once, same ~/.extenshi key as the CLI
npx @extenshi/guard@latest scan          # catalog check + cleanup
```

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
| `get_credit_balance` | Remaining credits across read / scan / icon / inventory — check before a big batch | **Free** |
| `get_development_guide` | Tool inventory, service directory, and the ordered path from a new extension through store release | **Free (no key)** |
| `list_extension_templates` | Extension shapes, minimum permissions, and browser-specific manifest requirements | **Free (no key)** |
| `search_docs` | Search the docs + CLI reference so the assistant can quote exact commands | **Free (no key)** |
| `generate_icon_workflow` | Returns the local draw-SVG → toolbar-preview → export workflow for extension icons | **Free (no key)** |
| `generate_welcome_page_workflow` | Returns the design brief for the page users land on right after install | **Free (no key)** |
| `connection_diagnostics` | Authentication, scopes, backend contracts, and capabilities | **Free; identity required** |
| `list_my_projects` | Your projects, repository bindings, and claimed listings | **Free; identity required** |
| `get_project_state` | Manifest, saved state, hosted URLs, and the integration file | **Free; identity required** |
| `get_project_scaffold` | Starter files for one project and target browser | **Free; identity required** |
| `import_manifest` | Import manifest JSON into the Dojo editor; preview, then apply with a state hash | project.write for OAuth |
| `record_project_evidence` | Store metadata bound to the exact artifact, input hash, browser, and source revision | evidence.write for OAuth |
| `list_privacy_policy_versions` / `get_privacy_policy_version` | Hosted policy history, and one version's markdown and HTML | Pro project |
| `update_privacy_policy_with_ai` | Propose a policy update for the author to review | Pro project; daily limit |
| `publish_privacy_policy` | Publish a policy at the project's hosted URL | Pro project; changes the live page |
| `scan_extension` | Pre-publish security scan of a local artifact, with live progress | 1 scan |
| `publish_extension` | Publish to the stores with your own credentials (fully local) | Free; testing-phase access check |

Prefer `get_risk_by_store_ids` over calling `get_security` in a loop: 40
extensions for one read credit instead of three credits each.

Not using MCP? The same icon workflow ships as a plain
[`SKILL.md`](../skills/extension-icon-design/) for Claude Code and other
instruction-file agents.

The signup allowance is one-time. Prepaid packs stay in the account until you
spend them: <https://dojo.extenshi.io/billing>.

---

## Configuration reference

The CLI and the MCP server read the same environment variables. Guard reads the
API key from the same `~/.extenshi/config.json`.

| Env var | Default | Purpose |
| --- | --- | --- |
| `EXTENSHI_API_KEY` | — | Your `ek_…` developer key (required for catalog/scan tools) |
| `EXTENSHI_BFF_URL` | `https://bff.extenshi.io` | Catalog read API base URL |
| `EXTENSHI_API_URL` | `https://scan.extenshi.io` | Scan backend base URL |
| `EXTENSHI_DOCS_URL` | `https://docs.extenshi.io` | Docs base URL for `search_docs` |

The CLI also honours `CI` (writes the HTML report without opening it) and
`DO_NOT_TRACK` / `EXTENSHI_TELEMETRY=0` (opts out of anonymous usage telemetry).
