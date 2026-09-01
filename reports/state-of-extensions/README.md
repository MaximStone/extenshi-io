# State of Browser Extensions

An open, periodically-updated snapshot of the browser-extension ecosystem,
derived from extenshi.io's continuous crawl of the public Chrome Web Store,
Firefox Add-ons, and Microsoft Edge Add-ons stores.

All figures are **aggregate and anonymized** — counts and distributions across
the public catalog, never per-user data.

> **Snapshot:** 2026-09-01 · **Catalog size:** 373,095 extensions

## Headline numbers

| Metric | Value |
|---|---:|
| Extensions tracked (Chrome + Firefox + Edge) | **373,095** |
| On the current Manifest V3 format | 306,124 (82.0%) |
| Still on legacy Manifest V2 | 66,139 (17.7%) |
| Updated in the last year | 213,474 (57.2%) |

## Store distribution

| Store | Extensions | Share |
|---|---:|---:|
| Chrome Web Store | 250,584 | 67.2% |
| Firefox Add-ons | 99,909 | 26.8% |
| Edge Add-ons | 22,602 | 6.1% |

```
Chrome   ███████████████████████████░░░░░░░░░░░░░  67.2%
Firefox  ███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  26.8%
Edge     ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  6.1%
```

Raw data: [`data/store-distribution.csv`](./data/store-distribution.csv)

## More cuts

- [**Manifest V3 Migration Tracker**](../manifest-v3-migration/) — who's still on MV2.
- [**Permissions & Risk**](../permissions-and-risk/) — what extensions ask for, and how risky they score.

## Methodology

- **Source.** Public store listings, gathered by extenshi.io's crawl pipeline.
  Each extension is counted once, by its latest visible snapshot.
- **Aggregation.** Catalog-wide totals only; no per-user / install / telemetry data.
- **Cadence.** Regenerated periodically; each snapshot is dated.

## License

This report and its data are licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — share/adapt with
attribution to **extenshi.io** (<https://extenshi.io>).
