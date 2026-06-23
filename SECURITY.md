# Security Policy

Security is the core of what extenshi.io does — we scan extensions for a living.
We take reports against our own platform just as seriously.

## Reporting a vulnerability in the extenshi.io platform

If you've found a vulnerability in our website, API, catalog, CLI, MCP server, or
any other part of the platform, please report it privately. **Do not open a public
issue.**

Preferred channels (either works):

1. **GitHub private advisory** — use the **"Report a vulnerability"** button under
   this repository's *Security* tab. This opens a private channel with us.
2. **Email** — `support@extenshi.io`

Please include:

- a description of the issue and its impact,
- steps to reproduce (a proof-of-concept is ideal),
- the affected URL / package / version.

We aim to acknowledge reports within **72 hours** and to keep you updated as we
work toward a fix. We're happy to credit you once the issue is resolved, if you'd
like.

## Reporting a malicious or vulnerable *extension*

Found a browser extension in our catalog that is malicious, leaks data, or
behaves badly? That's exactly the kind of signal we want.

- Open the extension in the catalog (<https://catalog.extenshi.io>) and use the
  report option on its page, **or**
- email `support@extenshi.io` with the store URL or the catalog link.

We'll re-scan it and update its risk rating. Note that extenshi.io surfaces
automated risk analysis and is **not** affiliated with the extension stores or
the extension authors — see the risk disclaimer at
<https://catalog.extenshi.io/disclaimers/security-risk>.

## Scope

In scope: `*.extenshi.io` web properties and APIs, and the `@extenshi/cli` and
`@extenshi/mcp` npm packages.

Out of scope: findings that require a compromised end-user device, social
engineering of our staff, volumetric DoS, and reports about third-party
extensions' own infrastructure (report those to the extension's author and the
relevant store).

## Safe harbor

We will not pursue or support legal action against researchers who act in good
faith, avoid privacy violations and service degradation, and give us reasonable
time to remediate before any public disclosure.
