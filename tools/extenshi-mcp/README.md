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
3. Provide it via the `EXTENSHI_API_KEY` environment variable (or run `extenshi login`,
   which the MCP server reads from `~/.extenshi/config.json`).

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
| `get_extension` | Full catalog detail for one extension by numeric catalog ID | 1 read |
| `get_reviews` | Paginated Firefox/Edge user reviews (rating, short excerpt, date, language) + a store-level aggregate (rating, count, reviews link) — Chrome Web Store review rows excluded (aggregate is the only public content for Chrome); reviewer identity omitted; sort by recent or rating | 1 read |
| `get_security` | Risk score + finding counts + top grouped findings (reads existing scans) | 1 read |
| `market_overview` | Catalog-wide market intelligence with no args (totals, store split, category tree, and the extended breakdown — MV2/MV3, sensitive permissions, risk tiers, trader status, recency, reviews); pass a `query` to scope facets to a search | 1 read |
| `search_docs` | Search the Extenshi docs + `@extenshi/cli` reference so the assistant can quote exact commands | Free (no key) |
| `generate_icon_workflow` | Icon design requirements + the local agent-draws-SVG → `extenshi icon preview` → export workflow | Free (no key) |
| `scan_extension` | Pre-publish security scan of a local artifact (.zip/.crx/.xpi), with live progress | 1 monthly-quota scan |
| `publish_extension` | Publish to Chrome/Firefox/Edge with your own store credentials (fully local) | Free |

Every plan includes monthly reads and scans — the Free plan has 25 reads and 5 scans per
month, paid plans go up to 10,000 reads and 1,000 scans. Quotas reset on the 1st (UTC).
Manage your plan at https://dojo.extenshi.io/billing.

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
