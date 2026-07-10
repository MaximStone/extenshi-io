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

import { describe, expect, it, vi } from 'vitest'
import type { Bff } from './bff.js'
import { type Capability, registerTools, type ToolDeps } from './tools.js'

// The `instrument` wrapper fires telemetry on every execute; stub it so the
// execute-level test below never spins up a real PostHog client.
vi.mock('./telemetry.js', () => ({
	captureEvent: vi.fn(),
	captureError: vi.fn(),
	classifyError: vi.fn(() => 'unknown'),
}))

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

const READ_TOOLS = ['search_extensions', 'get_extension', 'get_reviews', 'get_security', 'market_overview']
const LOCAL_ONLY_TOOLS = ['scan_extension', 'publish_extension']

describe('registerTools capability gating', () => {
	it('stdio (all capabilities) registers all 8 tools', () => {
		const { names, server } = recordingServer()
		registerTools(server, depsFor(['read', 'docs', 'scan', 'publish']))
		expect(names.sort()).toEqual([...READ_TOOLS, 'search_docs', ...LOCAL_ONLY_TOOLS].sort())
		expect(names).toHaveLength(8)
	})

	it('remote (read + docs only) registers the 6 research tools and NO local-only tools', () => {
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

describe('get_reviews execute — arg mapping', () => {
	it('maps snake_case tool args to the BFF camelCase input', async () => {
		// Capture the full tool objects (not just names) so we can drive execute().
		// biome-ignore lint/suspicious/noExplicitAny: minimal FastMCP tool stand-in
		const tools: Record<string, any> = {}
		const server = { addTool: (t: { name: string }) => (tools[t.name] = t) }

		const calls: Record<string, unknown>[] = []
		const stubBff = {
			getReviews: (input: Record<string, unknown>) => {
				calls.push(input)
				return Promise.resolve({ items: [], nextCursor: null })
			},
		} as unknown as Bff

		registerTools(server as unknown as Parameters<typeof registerTools>[0], {
			cfg: { bffUrl: 'https://bff.test', scanUrl: 'https://scan.test', docsUrl: 'https://docs.test' },
			capabilities: new Set<Capability>(['read']),
			getBff: () => stubBff,
		})

		// Raw snake_case args as FastMCP would pass post-Zod-parse.
		await tools.get_reviews.execute(
			{ extension_id: 77, limit: 10, cursor: 5, language_id: 3, min_rating: 4, sort: 'rating' },
			{},
		)

		expect(calls).toHaveLength(1)
		expect(calls[0]).toEqual({
			extensionId: 77,
			limit: 10,
			cursor: 5,
			languageId: 3,
			minRating: 4,
			sort: 'rating',
		})
	})

	it('applies the per-store content policy end-to-end (Chrome text withheld)', async () => {
		// biome-ignore lint/suspicious/noExplicitAny: minimal FastMCP tool stand-in
		const tools: Record<string, any> = {}
		const server = { addTool: (t: { name: string }) => (tools[t.name] = t) }
		const stubBff = {
			getReviews: () =>
				Promise.resolve({
					items: [
						{
							rating: 5,
							content: 'SECRET CHROME REVIEW BODY',
							store: 'CHROME',
							storeUrl: 'https://chromewebstore.google.com/detail/abc',
							contentPolicy: 'rating-only',
						},
					],
					nextCursor: null,
					aggregate: { rating: 4.6, ratingCount: 10, storeReviewsUrl: 'x/reviews' },
				}),
		} as unknown as Bff

		registerTools(server as unknown as Parameters<typeof registerTools>[0], {
			cfg: { bffUrl: 'https://bff.test', scanUrl: 'https://scan.test', docsUrl: 'https://docs.test' },
			capabilities: new Set<Capability>(['read']),
			getBff: () => stubBff,
		})

		const rendered: string = await tools.get_reviews.execute({ extension_id: 1, limit: 20 }, {})
		// The Chrome review body must never reach the model context.
		expect(rendered).not.toContain('SECRET CHROME REVIEW BODY')
		// …but the reviews-tab link + aggregate DO surface.
		expect(rendered).toContain('review text is not republished')
		expect(rendered).toContain('aggregate')
	})

	it('defaults sort to recent when omitted', async () => {
		// biome-ignore lint/suspicious/noExplicitAny: minimal FastMCP tool stand-in
		const tools: Record<string, any> = {}
		const server = { addTool: (t: { name: string }) => (tools[t.name] = t) }
		const calls: Record<string, unknown>[] = []
		const stubBff = {
			getReviews: (input: Record<string, unknown>) => {
				calls.push(input)
				return Promise.resolve({ items: [], nextCursor: null })
			},
		} as unknown as Bff

		registerTools(server as unknown as Parameters<typeof registerTools>[0], {
			cfg: { bffUrl: 'https://bff.test', scanUrl: 'https://scan.test', docsUrl: 'https://docs.test' },
			capabilities: new Set<Capability>(['read']),
			getBff: () => stubBff,
		})

		await tools.get_reviews.execute({ extension_id: 77, limit: 20 }, {})

		expect(calls[0]).toMatchObject({ extensionId: 77, sort: 'recent' })
	})
})
