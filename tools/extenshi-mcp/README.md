# @extenshi/mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server that brings the
**Extenshi extension catalog** — search, security analysis, market research, and
pre-publish scanning — into your AI tools (Claude Code, Claude Desktop, Cursor, …).

It runs locally over **stdio**, so there's nothing to host. It reuses your existing
Extenshi API key (the same one `@extenshi/cli` uses) and talks to the public Extenshi
backend on your behalf.

## Get an API key

An API key is **required** — every tool refuses to run without one, and the backend
enforces it too.

1. Sign up at **https://auth.extenshi.io/signup**
2. Create a key at **https://dojo.extenshi.io/api-keys**
3. Provide it via the `EXTENSHI_API_KEY` environment variable (or run
   `npx @extenshi/cli@latest login`, which the MCP server reads from
   `~/.extenshi/config.json`).

## Configure your MCP client

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

## Tools

| Tool | What it does | Cost |
| --- | --- | --- |
| `search_extensions` | Hybrid search across Chrome/Firefox/Edge with filters (store, category, pricing, rating, risk, permissions) | 1 read |
| `get_extension` | Full catalog detail for one extension — by numeric catalog ID **or** by its store id (see below) | 1 read |
| `get_reviews` | Paginated Firefox/Edge user reviews (rating, short excerpt, date, language) + a store-level aggregate (rating, count, reviews link) — Chrome Web Store review rows excluded (aggregate is the only public content for Chrome); reviewer identity omitted; sort by recent or rating | 1 read |
| `get_security` | Risk score + finding counts + top grouped findings (reads existing scans) | 3 reads |
| `get_risk_by_store_ids` | Safety scores for **up to 40** extensions in one call, by store id — for auditing a list of installed extensions instead of calling `get_security` per extension | 1 read per call |
| `market_overview` | Catalog-wide market intelligence with no args (totals, store split, category tree, and the extended breakdown — MV2/MV3, sensitive permissions, risk tiers, trader status, recency, reviews); pass a `query` to scope facets to a search | 1 read |
| `get_credit_balance` | Remaining credits across every pool (read / scan / icon / inventory), so an agent can size a batch before running it instead of hitting a mid-batch limit | Free |
| `search_docs` | Search the Extenshi docs + `@extenshi/cli` reference so the assistant can quote exact commands | Free (no key) |
| `generate_icon_workflow` | Icon design requirements + the local agent-draws-SVG → `npx @extenshi/cli@latest icon preview` → export workflow | Free (no key) |
| `generate_welcome_page_workflow` | Design brief for the post-install welcome page: the one action it must drive, which illustrations to produce, where to place click markers, and the block JSON to return | Free (no key) |
| `scan_extension` | Pre-publish security scan of a local artifact (.zip/.crx/.xpi), with live progress | 1 scan |
| `publish_extension` | Publish to Chrome/Firefox/Edge with your own store credentials (fully local) | Free |

### Identifying an extension by its store id

`get_extension`, `get_reviews`, `get_security` and `scan_extension` accept **either** the numeric
catalog `extension_id` **or** the extension's `store_id` — the id straight from the store URL, which
is usually the only precise identifier you have:

```jsonc
{ "store_id": "cjpalhdlnbpafiamejdnhcphjbkeiagm", "store": "CHROME" }  // Chrome/Edge: `store` required
{ "store_id": "dark-reader" }                                          // Firefox: unambiguous
```

`store` is required for a Chrome/Edge id because both stores use the identical 32-character format;
Firefox ids (slug, GUID, or email-style) route automatically. Resolving a store id is free — only the
read that follows costs a credit.

### Credits

Every account gets a one-time free allowance of 10 reads and 3 scans (no card required). Beyond
that, buy prepaid credit packs (up to 10,000 reads and 1,000 scans per pack) that never expire.
Call `get_credit_balance` (free) to check what's left before running a large batch.
Manage credits at https://dojo.extenshi.io/billing.

## Configuration

The backend endpoints are compiled into the package and always point at production — only the API
key is read from the environment.

| Env var | Purpose |
| --- | --- |
| `EXTENSHI_API_KEY` | Your `ek_…` developer key (required) |

## Develop

```bash
yarn build            # tsc -> dist/
# Inspect locally:
EXTENSHI_API_KEY=ek_… npx @modelcontextprotocol/inspector node dist/index.js
```

Publishing is handled by `./scripts/publish.sh` (npm Automation token from Infisical;
`DRY_RUN=1 ./scripts/publish.sh` to validate). Requires Node ≥20.
