# Permissions & Risk

What do browser extensions actually ask for — and how risky do they score? This
report covers two things extenshi.io is built to measure: the **sensitive
permissions** extensions request, and the **automated risk rating** of the
extensions we've scanned.

> **Snapshot:** 2026-09-01 · Permissions over 373,095 extensions · Risk over 299,886 scanned extensions

## Sensitive permissions requested

Share of extensions whose latest version requests each permission. The benign,
ubiquitous ones (`storage`, `activeTab`, `alarms`) are intentionally excluded —
these are the ones that meaningfully widen access to you or your browsing.

| Permission | What it grants | Extensions | Share |
|---|---|---:|---:|
| `tabs` | Read your tabs | 105,449 | 28.3% |
| `<all_urls>` | Access all sites | 25,385 | 6.8% |
| `downloads` | Manage downloads | 21,711 | 5.8% |
| `cookies` | Read/write cookies | 18,817 | 5.0% |
| `webRequest` | Intercept web requests | 18,728 | 5.0% |
| `webNavigation` | Track navigation | 13,965 | 3.7% |
| `declarativeNetRequest` | Modify network requests | 11,583 | 3.1% |
| `webRequestBlocking` | Block web requests | 6,932 | 1.9% |
| `bookmarks` | Read/write bookmarks | 6,131 | 1.6% |
| `clipboardRead` | Read clipboard | 4,518 | 1.2% |
| `nativeMessaging` | Talk to native apps | 4,376 | 1.2% |
| `history` | Read browsing history | 3,442 | 0.9% |
| `proxy` | Control proxy settings | 2,996 | 0.8% |
| `debugger` | Attach the debugger | 2,849 | 0.8% |
| `management` | Manage other extensions | 2,523 | 0.7% |
| `geolocation` | Access location | 1,296 | 0.3% |
| `privacy` | Change privacy settings | 927 | 0.2% |

Raw data: [`data/sensitive-permissions.csv`](./data/sensitive-permissions.csv)

## Risk distribution

extenshi.io runs automated security scans and assigns each scanned extension a
risk tier. Across **299,886** extensions scanned so far:

| Risk tier | Extensions | Share |
|---|---:|---:|
| Critical | 1,360 | 0.5% |
| High | 1,313 | 0.4% |
| Medium | 21,828 | 7.3% |
| Low | 136,815 | 45.6% |
| None | 138,570 | 46.2% |

**2,673** extensions (0.9%) scored **High or Critical**.

Raw data: [`data/risk-distribution.csv`](./data/risk-distribution.csv)

## How to read this

A permission isn't a verdict — `tabs` or `<all_urls>` are load-bearing for
plenty of legitimate tools. The risk tier is the automated judgement that
weighs permissions *together with* code-level signals from the scan. See the
methodology and disclaimer at
<https://catalog.extenshi.io/disclaimers/security-risk>.

## Methodology

Permission counts use each extension's latest visible snapshot
(`permissionsRequired`). Risk uses each extension's latest **completed** scan,
so the denominator is "extensions scanned", not the whole catalog — scan
coverage grows over time. Source: public store listings + extenshi.io scans.

## License

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — attribution to
**extenshi.io** (<https://extenshi.io>).
