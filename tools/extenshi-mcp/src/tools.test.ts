/**
 * Capability-gating contract for the shared tool registry.
 *
 * This is a SECURITY guard, not a nicety: the remote OAuth connector must
 * expose ONLY the read/research/docs tools. `scan_extension` and
 * `publish_extension` require the caller's local filesystem / store credentials
 * and must never be reachable over a hosted transport. If a future edit lets
 * those leak into the remote capability set, this test fails.
 * See internal-docs/plans/2026-06-25-claude-connector-directory.md §13 #1.
 */

import { describe, expect, it } from 'vitest'
import type { Bff } from './bff.js'
import { type Capability, registerTools, type ToolDeps } from './tools.js'

/** Minimal FastMCP stand-in that records the registered tool names. */
function recordingServer(): { names: string[]; server: Parameters<typeof registerTools>[0] } {
	const names: string[] = []
	// Only `addTool` is exercised at registration time.
	const server = { addTool: (t: { name: string }) => names.push(t.name) }
	return { names, server: server as unknown as Parameters<typeof registerTools>[0] }
}

const noopBff = {} as Bff

function depsFor(capabilities: Capability[]): ToolDeps {
	return {
		cfg: { bffUrl: 'https://bff.test', scanUrl: 'https://scan.test', docsUrl: 'https://docs.test' },
		capabilities: new Set(capabilities),
		getBff: () => noopBff,
		requireApiKey: () => 'ek_test',
		getApiKey: () => 'ek_test',
	}
}

const READ_TOOLS = ['search_extensions', 'get_extension', 'get_security', 'market_overview']
const LOCAL_ONLY_TOOLS = ['scan_extension', 'publish_extension']

describe('registerTools capability gating', () => {
	it('stdio (all capabilities) registers all 7 tools', () => {
		const { names, server } = recordingServer()
		registerTools(server, depsFor(['read', 'docs', 'scan', 'publish']))
		expect(names.sort()).toEqual([...READ_TOOLS, 'search_docs', ...LOCAL_ONLY_TOOLS].sort())
		expect(names).toHaveLength(7)
	})

	it('remote (read + docs only) registers the 5 research tools and NO local-only tools', () => {
		const { names, server } = recordingServer()
		registerTools(server, depsFor(['read', 'docs']))
		expect(names.sort()).toEqual([...READ_TOOLS, 'search_docs'].sort())
		// The security-critical assertion: scan/publish are absent.
		for (const forbidden of LOCAL_ONLY_TOOLS) {
			expect(names).not.toContain(forbidden)
		}
	})

	it('docs-only registers just search_docs (the keyless free tool)', () => {
		const { names, server } = recordingServer()
		registerTools(server, depsFor(['docs']))
		expect(names).toEqual(['search_docs'])
	})

	it('read capability does not pull in search_docs or local-only tools', () => {
		const { names, server } = recordingServer()
		registerTools(server, depsFor(['read']))
		expect(names.sort()).toEqual([...READ_TOOLS].sort())
		expect(names).not.toContain('search_docs')
		expect(names).not.toContain('scan_extension')
	})

	it('empty capability set registers nothing', () => {
		const { names, server } = recordingServer()
		registerTools(server, depsFor([]))
		expect(names).toEqual([])
	})
})
