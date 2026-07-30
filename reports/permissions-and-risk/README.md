# Permissions & Risk

What do browser extensions actually ask for — and how risky do they score? This
report covers two things extenshi.io is built to measure: the **sensitive
permissions** extensions request, and the **automated risk rating** of the
extensions we've scanned.

> **Snapshot:** 2026-07-30 · Permissions over 343,494 extensions · Risk over 39,887 scanned extensions

## Sensitive permissions requested

Share of extensions whose latest version requests each permission. The benign,
ubiquitous ones (`storage`, `activeTab`, `alarms`) are intentionally excluded —
these are the ones that meaningfully widen access to you or your browsing.

| Permission | What it grants | Extensions | Share |
|---|---|---:|---:|
| `tabs` | Read your tabs | 98,200 | 28.6% |
| `<all_urls>` | Access all sites | 24,175 | 7.0% |
| `downloads` | Manage downloads | 18,910 | 5.5% |
| `webRequest` | Intercept web requests | 17,616 | 5.1% |
| `cookies` | Read/write cookies | 17,370 | 5.1% |
| `webNavigation` | Track navigation | 12,790 | 3.7% |
| `declarativeNetRequest` | Modify network requests | 10,388 | 3.0% |
| `webRequestBlocking` | Block web requests | 6,706 | 2.0% |
| `bookmarks` | Read/write bookmarks | 5,633 | 1.6% |
| `clipboardRead` | Read clipboard | 4,168 | 1.2% |
| `nativeMessaging` | Talk to native apps | 3,912 | 1.1% |
| `history` | Read browsing history | 3,224 | 0.9% |
| `proxy` | Control proxy settings | 2,867 | 0.8% |
| `management` | Manage other extensions | 2,442 | 0.7% |
| `debugger` | Attach the debugger | 2,333 | 0.7% |
| `geolocation` | Access location | 1,203 | 0.4% |
| `privacy` | Change privacy settings | 844 | 0.2% |

Raw data: [`data/sensitive-permissions.csv`](./data/sensitive-permissions.csv)

## Risk distribution

extenshi.io runs automated security scans and assigns each scanned extension a
risk tier. Across **39,887** extensions scanned so far:

| Risk tier | Extensions | Share |
|---|---:|---:|
| Critical | 101 | 0.3% |
| High | 257 | 0.6% |
| Medium | 2,321 | 5.8% |
| Low | 12,899 | 32.3% |
| None | 24,309 | 60.9% |

**358** extensions (0.9%) scored **High or Critical**.

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
