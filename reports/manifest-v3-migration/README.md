# Manifest V3 Migration Tracker

Manifest V3 (MV3) is the current extension platform; Manifest V2 (MV2) is the
legacy format being retired — most visibly by Google, which has been disabling
MV2 extensions in Chrome. This report tracks how far each store's catalog has
actually moved.

Each extension is counted once, by the manifest version of its **latest visible
snapshot**.

> **Snapshot:** 2026-07-30 · **Catalog-wide MV3 adoption: 80.9%**

## The headline

- **Chrome — effectively 100% MV3.** The Chrome Web Store has finished retiring
  MV2; MV2 listings are essentially gone.
- **Firefox — still majority MV2 (66.1%).** Firefox supports both formats and
  has not force-migrated, so a large legacy MV2 long-tail persists.
- **Edge — mostly MV3 (86.7%),** following Chromium, with a smaller MV2 remainder.

## By store

| Store | Extensions | Manifest V3 | Manifest V2 | Unknown |
|---|---:|---:|---:|---:|
| Chrome Web Store | 228,105 | 228,104 (100.0%) | 0 (0.0%) | 1 |
| Firefox Add-ons | 93,741 | 30,971 (33.0%) | 61,974 (66.1%) | 796 |
| Edge Add-ons | 21,648 | 18,762 (86.7%) | 2,886 (13.3%) | 0 |

```
Chrome   ████████████████████████████████████████  MV3 100.0%
Firefox  █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░  MV3 33.0%
Edge     ███████████████████████████████████░░░░░  MV3 86.7%
```

Catalog-wide: **277,837 MV3** (80.9%) · **64,860 MV2** (18.9%) · 797 unknown.

Raw data: [`data/manifest-version.csv`](./data/manifest-version.csv)

## Why it matters

If you build extensions, MV2 is a dead end on Chrome and a shrinking one
elsewhere — but Firefox's large MV2 base means cross-browser code can't assume
MV3-only APIs yet. If you use extensions, an extension still shipping MV2 on
Chrome is, by definition, no longer updated there.

## Methodology

"Unknown" = a visible snapshot whose manifest version wasn't parseable at crawl
time. Counts use each extension's latest visible snapshot, so an extension that
migrated MV2→MV3 is counted only in MV3. Source: public store listings via
extenshi.io's crawl pipeline.

## License

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — attribution to
**extenshi.io** (<https://extenshi.io>).
