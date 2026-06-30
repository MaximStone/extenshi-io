'use strict'
/**
 * Anonymous install ping — VENDORED, kept byte-identical between @extenshi/cli
 * and @extenshi/mcp (it figures out which one it is from its own package.json).
 *
 * Fires a single `cli_installed` / `mcp_installed` event when the package is
 * installed as a real dependency, so we can see adoption in PostHog. It is a
 * standalone CommonJS script using ONLY Node built-ins (no posthog-node, no
 * build step) so it can run the instant npm extracts the tarball.
 *
 * Hard rules (a postinstall that breaks `npm install` is unacceptable):
 *   - ALWAYS exits 0, even on any error — wrapped in try/catch + a hard timeout.
 *   - Fully fail-soft and fire-and-forget; the request is capped at ~2s.
 *
 * It self-skips (no event, no network) when:
 *   - the package is NOT under node_modules — i.e. our own monorepo workspace
 *     install (tools/<pkg>), so dev installs never inflate adoption counts;
 *   - DO_NOT_TRACK is truthy, EXTENSHI_TELEMETRY is off, or config
 *     ~/.extenshi/config.json has "telemetry": false;
 *   - CI is set (CI re-installs would massively inflate the count);
 *   - no ingestion key is configured.
 *
 * Privacy: sends only the package version, Node version, coarse os/arch, and an
 * anonymous per-install UUID (the same id the runtime telemetry uses). Never any
 * path, package contents, or user input.
 */

// Shared EU PostHog project key (114791) — public, write-only, already in our
// web bundles. Override with EXTENSHI_POSTHOG_KEY; empty disables the ping.
const EMBEDDED_KEY = 'phc_fqKrAmtNZvJqe0krpYB3UwYqALLpT1WM8m5LtNs9eUu'
const DEFAULT_HOST = 'https://eu.i.posthog.com'

function done() {
	process.exit(0)
}

try {
	const path = require('node:path')
	const fs = require('node:fs')
	const os = require('node:os')
	const https = require('node:https')
	const { randomUUID } = require('node:crypto')

	// Real dependency install only — workspace path has no /node_modules/ segment.
	if (!__dirname.includes(`${path.sep}node_modules${path.sep}`)) done()

	// CI re-installs would inflate the adoption count — skip them.
	if (process.env.CI) done()

	const key = (process.env.EXTENSHI_POSTHOG_KEY || EMBEDDED_KEY).trim()
	if (!key) done()

	const dnt = String(process.env.DO_NOT_TRACK || '')
		.trim()
		.toLowerCase()
	if (['1', 'true', 'yes', 'on'].includes(dnt)) done()
	const optOut = String(process.env.EXTENSHI_TELEMETRY || '')
		.trim()
		.toLowerCase()
	if (['0', 'false', 'off', 'no'].includes(optOut)) done()

	// Anonymous per-install id, shared with the runtime telemetry module.
	const configPath = path.join(os.homedir(), '.extenshi', 'config.json')
	let cfg = {}
	try {
		cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
	} catch {}
	if (cfg && cfg.telemetry === false) done()
	let anonId = cfg && cfg.anonId
	if (!anonId) {
		anonId = randomUUID()
		try {
			fs.mkdirSync(path.dirname(configPath), { recursive: true })
			fs.writeFileSync(configPath, `${JSON.stringify({ ...cfg, anonId }, null, 2)}\n`, { mode: 0o600 })
		} catch {}
	}

	// Identify the surface + version from our own package.json.
	let pkg = {}
	try {
		pkg = require(path.join(__dirname, '..', 'package.json'))
	} catch {}
	const surface = String(pkg.name || '').includes('mcp') ? 'mcp' : 'cli'
	const host = (process.env.EXTENSHI_POSTHOG_HOST || DEFAULT_HOST).trim()

	const payload = JSON.stringify({
		api_key: key,
		event: `${surface}_installed`,
		distinct_id: anonId,
		properties: {
			surface,
			version: pkg.version || '0.0.0',
			node: process.version,
			os: process.platform,
			arch: process.arch,
			ci: false,
			source: 'npm_postinstall',
		},
	})

	const url = new URL('/i/v0/e/', host)
	const req = https.request(
		{
			method: 'POST',
			hostname: url.hostname,
			port: url.port || 443,
			path: url.pathname,
			headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
			timeout: 2000,
		},
		(res) => {
			res.on('data', () => {})
			res.on('end', done)
			res.on('error', done)
		},
	)
	req.on('error', done)
	req.on('timeout', () => {
		try {
			req.destroy()
		} catch {}
		done()
	})
	req.write(payload)
	req.end()

	// Backstop: never let the ping hold the install open.
	const guard = setTimeout(done, 2500)
	if (guard.unref) guard.unref()
} catch {
	done()
}
