# extenshi.io

> **The browser-extension intelligence platform.** A cross-store catalog of
> **324,000+ extensions** (Chrome, Firefox, Edge) with security analysis, plus
> developer tooling for analytics, pre-publish scanning, and multi-store
> publishing.

This repository is the **public home base** for extenshi.io — a hub for the
people who find us on GitHub. It links to everything that's open to the world:
the catalog, the docs, our open developer tools on npm, and our public research
reports. No accounts required to read anything here.

---

## What is extenshi.io?

**For people who use extensions** → a searchable, security-rated catalog of
browser extensions across all three major stores, so you can check what an
extension actually does (and what it can access) before you install it.

**For people who build extensions** → analytics, error monitoring, competitive
analysis, pre-publish security scanning, and one-command multi-store publishing.

| | |
|---|---|
| 🔎 **Catalog** | <https://catalog.extenshi.io> — search 324k+ extensions, filter by store / category / pricing / risk / permissions |
| 📚 **Docs** | <https://docs.extenshi.io> — product guides + full CLI reference |
| ✍️ **Blog** | <https://blog.extenshi.io> — deep dives on extension security & the ecosystem |
| 🟢 **Status** | <https://status.extenshi.io> — live uptime for every public service |
| 🛠️ **For developers** | <https://extenshi.io/developers> — analytics, publishing, ExtenshiPay |
| 🔑 **Dojo (your account)** | <https://dojo.extenshi.io> — API keys, billing, publishing tools |

---

## Open developer tools (free on npm)

We ship two tools to the public npm registry. They talk to the public Extenshi
backend with your own API key — there's nothing to host.

| Tool | Install | What it does |
|---|---|---|
| **`@extenshi/cli`** | `npx @extenshi/cli@latest` | Pre-publish **security scanner** for `.zip` / `.crx` / `.xpi` artifacts. Runs in CI. |
| **`@extenshi/mcp`** | `npx @extenshi/mcp@latest` | **MCP server** that brings the catalog + scanning into Claude, Cursor, and other AI tools. |

→ See [**tools/**](./tools/) for setup, examples, and the full tool reference.

```jsonc
// Add the catalog to any MCP client (Claude Code / Desktop / Cursor):
{
  "mcpServers": {
    "extenshi": {
      "command": "npx",
      "args": ["-y", "@extenshi/mcp@latest"],
      "env": { "EXTENSHI_API_KEY": "ek_…" }   // get one at dojo.extenshi.io/api-keys
    }
  }
}
```

`search_docs` works **without an API key** — point any agent at our docs for free.

---

## 📊 Public research

We continuously scrape and scan the public extension stores, which puts us in a
good position to publish open data about the ecosystem.

→ [**reports/state-of-extensions/**](./reports/state-of-extensions/) — aggregate,
anonymized stats on store distribution, Manifest V2 → V3 adoption, framework
usage, and permission trends. Data is CC BY 4.0 — cite away.

---

## Found a security issue?

Whether it's in **our** platform or in an **extension** we list, see
[**SECURITY.md**](./SECURITY.md) for how to report it responsibly.

---

## Links

- Website — <https://extenshi.io>
- Catalog — <https://catalog.extenshi.io>
- Docs — <https://docs.extenshi.io>
- Blog — <https://blog.extenshi.io>
- Status — <https://status.extenshi.io>
- `@extenshi/cli` — <https://www.npmjs.com/package/@extenshi/cli>
- `@extenshi/mcp` — <https://www.npmjs.com/package/@extenshi/mcp>

## License

The contents of this repository (docs, examples, and report data) are released
under [MIT](./LICENSE), except the research datasets, which are
[CC BY 4.0](./reports/state-of-extensions/). The extenshi.io platform itself is a
hosted product and is not open source.
