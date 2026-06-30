/**
 * Configuration loading for the Extenshi MCP server.
 *
 * The MCP server runs locally (stdio) inside the developer's AI client, so the
 * API key comes from the environment — never from a request header. We
 * deliberately reuse the SAME key sources as `@extenshi/cli` so a developer who
 * already ran `extenshi login` is set up with zero extra steps:
 *
 *   1. Environment variable EXTENSHI_API_KEY (set in the client's mcp config)
 *   2. A `.env` in the current working directory (does NOT override real env)
 *   3. Config file ~/.extenshi/config.json (written by `extenshi login`)
 *
 * Base URLs are baked into the package at build time and are NOT configurable:
 * every install talks to the production backend. There is intentionally no env
 * var or config-file override for them (was EXTENSHI_BFF_URL / EXTENSHI_API_URL
 * / EXTENSHI_DOCS_URL) — only the API key is read from the environment.
 *
 *   - https://bff.extenshi.io   (read tools)
 *   - https://scan.extenshi.io  (scan)
 *   - https://docs.extenshi.io  (search_docs)
 *
 * stdout is the MCP protocol channel — this module must NEVER write to it.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Compiled-in production endpoints. Constant by design — do not read these from
// the environment or the config file (see module doc above).
const BFF_URL = 'https://bff.extenshi.io'
const SCAN_URL = 'https://scan.extenshi.io'
const DOCS_URL = 'https://docs.extenshi.io'

const CONFIG_PATH = path.join(os.homedir(), '.extenshi', 'config.json')

interface ConfigFile {
	apiKey?: string
}

export interface ResolvedConfig {
	/** The `ek_…` developer API key, or null if none is configured. */
	apiKey: string | null
	/** Base URL of the catalog BFF (read tools), no trailing slash. */
	bffUrl: string
	/** Base URL of the scan backend (scan_extension tool), no trailing slash. */
	scanUrl: string
	/** Base URL of the docs site (search_docs tool), no trailing slash. */
	docsUrl: string
}

function readConfigFile(): ConfigFile {
	try {
		return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as ConfigFile
	} catch {
		return {}
	}
}

/**
 * Parse a `.env` body into key/value pairs. Supports comments (#), blank
 * lines, an optional `export ` prefix, and single/double-quoted values.
 */
function parseDotEnv(raw: string): Record<string, string> {
	const out: Record<string, string> = {}
	for (const rawLine of raw.split(/\r?\n/)) {
		const line = rawLine.trim()
		if (!line || line.startsWith('#')) continue

		const withoutExport = line.startsWith('export ') ? line.slice('export '.length) : line
		const eq = withoutExport.indexOf('=')
		if (eq === -1) continue

		const key = withoutExport.slice(0, eq).trim()
		if (!key) continue

		let value = withoutExport.slice(eq + 1).trim()
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1)
		}
		out[key] = value
	}
	return out
}

/** Load a local `.env` into process.env without overriding real env. Fail-soft. */
function loadDotEnv(cwd: string = process.cwd()): void {
	try {
		const parsed = parseDotEnv(fs.readFileSync(path.join(cwd, '.env'), 'utf8'))
		for (const [key, value] of Object.entries(parsed)) {
			if (process.env[key] === undefined) process.env[key] = value
		}
	} catch {
		// No .env or unreadable — non-fatal.
	}
}

export function loadConfig(): ResolvedConfig {
	loadDotEnv()
	const file = readConfigFile()

	return {
		apiKey: process.env.EXTENSHI_API_KEY ?? file.apiKey ?? null,
		// Endpoints are compiled-in constants — never overridden by env/config.
		bffUrl: BFF_URL,
		scanUrl: SCAN_URL,
		docsUrl: DOCS_URL,
	}
}
