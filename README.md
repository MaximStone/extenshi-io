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
| **`@extenshi/cli`** | `npx @extenshi/cli@latest` | **Security scanner**, **store-review predictor**, **icon toolbar preview**, and **multi-store publisher** for `.zip` / `.crx` / `.xpi` artifacts. Runs in CI. |
| **`@extenshi/mcp`** | `npx @extenshi/mcp@latest` | **MCP server** that brings the catalog + scanning into Claude, Cursor, and other AI tools. |

→ [**Full CLI command reference**](./tools/extenshi-cli/) — every command and flag
→ [**Example output**](./examples/) — see the HTML report and the icon preview before installing anything
→ [**Agent skills**](./skills/) — free `SKILL.md` files your coding agent can pick up
→ [**tools/**](./tools/) — setup for both npm packages

Most of the CLI is **free and offline** — only `scan` spends a credit:

```bash
npx @extenshi/cli@latest icon preview ./icon.svg --name "My Extension"   # free, offline
npx @extenshi/cli@latest review-risk ./dist/my-extension.zip             # free, offline
npx @extenshi/cli@latest publish ./dist/my-extension.zip                 # free, your own store creds
npx @extenshi/cli@latest scan ./dist/my-extension.zip                    # 1 scan credit
```

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

## 🆓 Free, no account needed

Everything in this list works without signing up. Bookmark what's useful.

**In your terminal** — [`@extenshi/cli`](./tools/extenshi-cli/):

| | |
|---|---|
| `extenshi icon preview <icon>` | Your icon at 16 px in real Chrome / Firefox / Edge toolbars, contrast + canvas checks, PNG & ZIP export. Fully offline. [See the output →](./examples/) |
| `extenshi review-risk <artifact>` | Predicts the store review: what gets **rejected**, what causes **user attrition** on update, what triggers a **slow** manual review. Fully offline. |
| `extenshi publish <artifact>` | Publishes to Chrome / Firefox / Edge with *your own* store credentials — uploads go straight from your machine to the stores. |

**For your coding agent:**

| | |
|---|---|
| [`extension-icon-design` skill](./skills/extension-icon-design/) | One `SKILL.md`: your agent draws the icon, verifies it in the toolbar mockups, iterates on the warnings, exports the store set. |
| `search_docs` (MCP) | Search the product docs + CLI reference from any MCP client. **No API key.** |
| `generate_icon_workflow` (MCP) | Serves the icon workflow above to any connected agent. **No API key.** |

**In your browser** — free web tools:

| | |
|---|---|
| [Extension safety check](https://extenshi.io/check) | Paste a store URL, see what an extension can access before you install it |
| [Manifest generator](https://extenshi.io/manifest-generator) | Build a valid MV3 `manifest.json` |
| [Icon generator & toolbar preview](https://extenshi.io/icon-generator) | The same preview as the CLI, in the browser |
| [Privacy-policy generator](https://extenshi.io/policy-generator) | A store-acceptable privacy policy for your extension |
| [Catalog search](https://catalog.extenshi.io) | 324k+ extensions across three stores, with risk ratings |
| [Methodology](https://docs.extenshi.io/methodology) | How the scanning and risk scoring actually work — and their limits |

**Open data:** the [research reports](#-public-research) below are CC BY 4.0.

---

## 📊 Public research

We continuously scrape and scan the public extension stores, which puts us in a
good position to publish open data about the ecosystem. All datasets are
aggregate, anonymized, dated, and **CC BY 4.0** — cite away.

- [**State of Browser Extensions**](./reports/state-of-extensions/) — catalog size and store distribution across Chrome / Firefox / Edge.
- [**Manifest V3 Migration Tracker**](./reports/manifest-v3-migration/) — how far each store has moved off legacy MV2 (Chrome ~100% MV3; Firefox still majority MV2).
- [**Permissions & Risk**](./reports/permissions-and-risk/) — which sensitive permissions extensions request, and the automated risk-tier distribution of what we've scanned.

---

## Found a security issue?

Whether it's in **our** platform or in an **extension** we list, see
[**SECURITY.md**](./SECURITY.md) for how to report it responsibly.

---

## Links

**In this repo:** [CLI reference](./tools/extenshi-cli/) · [example output](./examples/) · [agent skills](./skills/) · [tools setup](./tools/) · [research reports](./reports/) · [security policy](./SECURITY.md)

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
