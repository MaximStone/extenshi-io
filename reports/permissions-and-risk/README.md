# Permissions & Risk

What do browser extensions actually ask for — and how risky do they score? This
report covers two things extenshi.io is built to measure: the **sensitive
permissions** extensions request, and the **automated risk rating** of the
extensions we've scanned.

> **Snapshot:** 2026-06-23 · Permissions over 324,968 extensions · Risk over 28,748 scanned extensions

## Sensitive permissions requested

Share of extensions whose latest version requests each permission. The benign,
ubiquitous ones (`storage`, `activeTab`, `alarms`) are intentionally excluded —
these are the ones that meaningfully widen access to you or your browsing.

| Permission | What it grants | Extensions | Share |
|---|---|---:|---:|
| `tabs` | Read your tabs | 93,319 | 28.7% |
| `<all_urls>` | Access all sites | 23,499 | 7.2% |
| `downloads` | Manage downloads | 17,228 | 5.3% |
| `webRequest` | Intercept web requests | 16,969 | 5.2% |
| `cookies` | Read/write cookies | 16,428 | 5.1% |
| `webNavigation` | Track navigation | 12,085 | 3.7% |
| `declarativeNetRequest` | Modify network requests | 9,632 | 3.0% |
| `webRequestBlocking` | Block web requests | 6,605 | 2.0% |
| `bookmarks` | Read/write bookmarks | 5,308 | 1.6% |
| `clipboardRead` | Read clipboard | 3,903 | 1.2% |
| `nativeMessaging` | Talk to native apps | 3,687 | 1.1% |
| `history` | Read browsing history | 3,031 | 0.9% |
| `proxy` | Control proxy settings | 2,678 | 0.8% |
| `management` | Manage other extensions | 2,369 | 0.7% |
| `debugger` | Attach the debugger | 2,033 | 0.6% |
| `geolocation` | Access location | 1,154 | 0.4% |
| `privacy` | Change privacy settings | 791 | 0.2% |

Raw data: [`data/sensitive-permissions.csv`](./data/sensitive-permissions.csv)

## Risk distribution

extenshi.io runs automated security scans and assigns each scanned extension a
risk tier. Across **28,748** extensions scanned so far:

| Risk tier | Extensions | Share |
|---|---:|---:|
| Critical | 3 | 0.0% |
| High | 312 | 1.1% |
| Medium | 3,617 | 12.6% |
| Low | 10,802 | 37.6% |
| None | 14,014 | 48.7% |

**315** extensions (1.1%) scored **High or Critical**.

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
