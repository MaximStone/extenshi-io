# Developer tools

extenshi.io ships two free, public tools to npm. Both authenticate with your own
Extenshi API key and talk to the public backend — there is nothing to self-host.

> **Get an API key** (free): sign up at <https://auth.extenshi.io/signup>, then
> create a key at <https://dojo.extenshi.io/api-keys>.
> Every account includes a free monthly allowance (currently 25 reads + 5 scans);
> the `search_docs` capability is free and needs no key at all.

---

## `@extenshi/cli` — pre-publish security scanner

[![npm](https://img.shields.io/npm/v/@extenshi/cli)](https://www.npmjs.com/package/@extenshi/cli)

Scan a built extension artifact (`.zip` / `.crx` / `.xpi`) for security and
supply-chain risks **before** you ship it to the stores. Designed to run in CI.

```bash
# one-off scan, no install:
npx @extenshi/cli@latest scan ./dist/my-extension.zip

# or install it:
npm i -g @extenshi/cli
extenshi login              # stores your key in ~/.extenshi/config.json
extenshi scan ./build.zip
extenshi review-risk ./build.zip
extenshi publish            # push to Chrome / Firefox / Edge with your own store creds
```

In CI, set `EXTENSHI_API_KEY` as a secret and fail the build on high-risk
findings. Full command reference and flags:
<https://docs.extenshi.io> (or `npx @extenshi/cli@latest --help`).

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

**Tools it provides:**

| Tool | What it does | Cost |
| --- | --- | --- |
| `search_extensions` | Hybrid search across Chrome/Firefox/Edge with filters (store, category, pricing, rating, risk, permissions) | 1 read |
| `get_extension` | Full catalog detail for one extension | 1 read |
| `get_security` | Risk score + finding counts + top grouped findings | 1 read |
| `get_related_extensions` | Similar / competing extensions for competitive analysis | 1 read |
| `market_overview` | Aggregate catalog stats + facet counts | 1 read |
| `search_docs` | Search the docs + CLI reference so the assistant can quote exact commands | **Free (no key)** |
| `scan_extension` | Pre-publish security scan of a local artifact, with live progress | 1 scan |
| `publish_extension` | Publish to the stores with your own credentials (fully local) | Free |

Quotas reset on the 1st (UTC); manage your plan at
<https://dojo.extenshi.io/billing>.

---

## Configuration reference

| Env var | Default | Purpose |
| --- | --- | --- |
| `EXTENSHI_API_KEY` | — | Your `ek_…` developer key (required for catalog/scan tools) |
| `EXTENSHI_BFF_URL` | `https://bff.extenshi.io` | Catalog read API base URL |
| `EXTENSHI_API_URL` | `https://scan.extenshi.io` | Scan backend base URL |
| `EXTENSHI_DOCS_URL` | `https://docs.extenshi.io` | Docs base URL for `search_docs` |
