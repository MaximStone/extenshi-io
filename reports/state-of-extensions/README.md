# State of Browser Extensions

An open, periodically-updated snapshot of the browser-extension ecosystem,
derived from extenshi.io's continuous crawl of the public Chrome Web Store,
Firefox Add-ons, and Microsoft Edge Add-ons stores.

All figures here are **aggregate and anonymized** — counts and distributions
across the public catalog, never per-user data. The underlying data is the
publicly listed metadata of the stores.

> **Snapshot:** 2026-06-23 · **Catalog size:** 324,991 extensions

---

## Headline numbers

| Metric | Value |
|---|---:|
| Extensions tracked (Chrome + Firefox + Edge) | **324,991** |
| Historical store snapshots captured | 430,098 |
| Reviews indexed | 34,388 |
| Average store rating | 4.5 ★ |

## Store distribution

Chrome dominates the listed-extension count, but Firefox's catalog is far from
negligible — roughly **2 in 5** non-Chrome listings live there.

| Store | Extensions | Share |
|---|---:|---:|
| Chrome Web Store | 213,897 | 65.8% |
| Firefox Add-ons | 90,277 | 27.8% |
| Edge Add-ons | 20,817 | 6.4% |

```
Chrome   ████████████████████████████████░░░░░░░░░░░░░░░░░  65.8%
Firefox  █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  27.8%
Edge     ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   6.4%
```

Raw data: [`data/store-distribution.csv`](./data/store-distribution.csv)

---

## On the roadmap for this report

These cuts come from the same catalog and will land in upcoming snapshots. We're
publishing the structure first so the numbers slot in without churn:

- **Manifest V2 → V3 adoption** — share of listings on each manifest version, and
  how fast MV2 is retiring across the three stores.
- **Framework footprint** — which UI frameworks (React, Vue, Svelte, vanilla, …)
  show up in shipped bundles, by prevalence.
- **Permission trends** — the most-requested `permissions` and `host_permissions`,
  and how often extensions ask for `<all_urls>`.
- **Risk distribution** — share of the catalog by automated risk tier
  (none / low / medium / high / critical).

Want a specific cut sooner? Open an issue.

---

## Methodology

- **Source.** Public store listings for the Chrome Web Store, Firefox Add-ons, and
  Edge Add-ons, gathered by extenshi.io's crawl pipeline. Figures reflect
  extensions present in the catalog at the snapshot date.
- **Aggregation.** All values are catalog-wide totals or distributions. No
  individual user, install, or telemetry data is included.
- **Cadence.** Refreshed periodically; each snapshot is dated. Counts will drift
  between snapshots as stores add and remove listings.
- **Caveats.** Store catalogs change constantly and stores apply their own
  delisting; treat these as a well-sized sample of the public ecosystem, not a
  store-official census.

Reproduce the headline numbers yourself with the free MCP tool — no API key needed
for the docs, one read for the stats:

```
market_overview        # via @extenshi/mcp, or the catalog UI at catalog.extenshi.io
```

---

## License

This report and the data in [`data/`](./data/) are licensed under
**[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)**.
You may share and adapt it, including commercially, with attribution to
**extenshi.io** (<https://extenshi.io>).
