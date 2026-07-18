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

import { UserError } from 'fastmcp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Bff } from './bff.js'
import { captureError, captureEvent } from './telemetry.js'
import { type Capability, isExpectedError, registerTools, type ToolDeps } from './tools.js'

// The `instrument` wrapper fires telemetry on every execute; stub the capture
// sinks so the execute-level tests below never spin up a real PostHog client.
// `classifyError` is deliberately NOT stubbed: it decides which failures count
// as expected, so stubbing it would leave these tests asserting against a mock
// instead of the real expected-vs-fault boundary.
vi.mock('./telemetry.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('./telemetry.js')>()),
	captureEvent: vi.fn(),
	captureError: vi.fn(),
}))

interface RecordedTool {
	name: string
	annotations?: {
		title?: string
		readOnlyHint?: boolean
		destructiveHint?: boolean
		idempotentHint?: boolean
		openWorldHint?: boolean
	}
}

/** Minimal FastMCP stand-in that records the registered tools (name + annotations). */
function recordingServer(): {
	names: string[]
	tools: RecordedTool[]
	server: Parameters<typeof registerTools>[0]
} {
	const tools: RecordedTool[] = []
	const names: string[] = []
	// Only `addTool` is exercised at registration time. `names` and `tools` are
	// stable array references mutated in place, so callers can destructure either.
	const server = {
		addTool: (t: RecordedTool) => {
			tools.push(t)
			names.push(t.name)
		},
	}
	return { names, tools, server: server as unknown as Parameters<typeof registerTools>[0] }
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
const DOCS_TOOLS = ['search_docs', 'generate_icon_workflow']
const LOCAL_ONLY_TOOLS = ['scan_extension', 'publish_extension']

describe('registerTools capability gating', () => {
	it('stdio (all capabilities) registers all 9 tools', () => {
		const { names, server } = recordingServer()
		registerTools(server, depsFor(['read', 'docs', 'scan', 'publish']))
		expect(names.sort()).toEqual([...READ_TOOLS, ...DOCS_TOOLS, ...LOCAL_ONLY_TOOLS].sort())
		expect(names).toHaveLength(9)
	})

	it('remote (read + docs only) registers the 7 research tools and NO local-only tools', () => {
		const { names, server } = recordingServer()
		registerTools(server, depsFor(['read', 'docs']))
		expect(names.sort()).toEqual([...READ_TOOLS, ...DOCS_TOOLS].sort())
		// The security-critical assertion: scan/publish are absent.
		for (const forbidden of LOCAL_ONLY_TOOLS) {
			expect(names).not.toContain(forbidden)
		}
	})

	it('docs-only registers just the keyless free tools', () => {
		const { names, server } = recordingServer()
		registerTools(server, depsFor(['docs']))
		expect(names.sort()).toEqual([...DOCS_TOOLS].sort())
	})

	it('read capability does not pull in docs tools or local-only tools', () => {
		const { names, server } = recordingServer()
		registerTools(server, depsFor(['read']))
		expect(names.sort()).toEqual([...READ_TOOLS].sort())
		expect(names).not.toContain('search_docs')
		expect(names).not.toContain('generate_icon_workflow')
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
		const tools: Record<string, any> = {}
		const server = {
			addTool: (t: { name: string }) => {
				tools[t.name] = t
			},
		}

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
		const tools: Record<string, any> = {}
		const server = {
			addTool: (t: { name: string }) => {
				tools[t.name] = t
			},
		}
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
		const tools: Record<string, any> = {}
		const server = {
			addTool: (t: { name: string }) => {
				tools[t.name] = t
			},
		}
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

// The Anthropic Connectors Directory submission portal auto-syncs the server's
// tools and refuses to submit any tool missing a `title` or a read/write hint.
// This contract guards that every tool ships those annotations, and that the
// read/write split is declared correctly.
describe('directory tool annotations', () => {
	it('every registered tool declares a title and a readOnlyHint', () => {
		const { tools, server } = recordingServer()
		registerTools(server, depsFor(['read', 'docs', 'scan', 'publish']))
		expect(tools).toHaveLength(9)
		for (const t of tools) {
			expect(t.annotations?.title, `${t.name} title`).toBeTruthy()
			expect(typeof t.annotations?.readOnlyHint, `${t.name} readOnlyHint`).toBe('boolean')
		}
	})

	it('all remote-exposed (read + docs) tools are read-only', () => {
		const { tools, server } = recordingServer()
		registerTools(server, depsFor(['read', 'docs']))
		for (const t of tools) {
			expect(t.annotations?.readOnlyHint, `${t.name} should be read-only`).toBe(true)
		}
	})

	it('publish is destructive and scan is a non-read-only write', () => {
		const { tools, server } = recordingServer()
		registerTools(server, depsFor(['scan', 'publish']))
		const publish = tools.find((t) => t.name === 'publish_extension')
		const scan = tools.find((t) => t.name === 'scan_extension')
		expect(publish?.annotations?.readOnlyHint).toBe(false)
		expect(publish?.annotations?.destructiveHint).toBe(true)
		expect(scan?.annotations?.readOnlyHint).toBe(false)
		expect(scan?.annotations?.destructiveHint).toBe(false)
	})
})

// The billing quota gate (and other expected, user-facing conditions) must NOT
// be shipped to error tracking as exceptions — otherwise a routine "free read
// allowance exhausted" message mints a bogus, self-reopening issue. The failure
// count still has to be tracked, so `mcp_tool_failed` must fire regardless.
//
// These run end-to-end through the real readError() + classifyError(): the whole
// question is what survives that wrapping, which a stub can't answer.
describe('instrument — expected errors skip exception capture', () => {
	// Cleared BEFORE each test, not after: the describe blocks above drive
	// execute() through the same instrumented spies, so these `not.toHaveBeenCalled`
	// assertions would otherwise depend on what ran earlier in the file.
	beforeEach(() => vi.clearAllMocks())

	/**
	 * A `get_reviews` tool whose BFF call rejects with `err`. Any read tool would
	 * do — they all funnel through the same readError() — but get_reviews is a
	 * metered read, so it is the one that actually hits the free-allowance gate
	 * being reproduced here.
	 */
	function getReviewsToolRejectingWith(err: unknown): {
		execute: (a: unknown, c: unknown) => Promise<unknown>
	} {
		const tools: Record<string, any> = {}
		const server = {
			addTool: (t: { name: string }) => {
				tools[t.name] = t
			},
		}
		const stubBff = {
			getReviews: () => Promise.reject(err),
		} as unknown as Bff
		registerTools(server as unknown as Parameters<typeof registerTools>[0], {
			cfg: { bffUrl: 'https://bff.test', scanUrl: 'https://scan.test', docsUrl: 'https://docs.test' },
			capabilities: new Set<Capability>(['read']),
			getBff: () => stubBff,
		})
		return tools.get_reviews
	}

	/** How the catalog BFF's free-read gate reaches the client: TRPCClientError, HTTP 429. */
	const quotaGate = () =>
		Object.assign(
			new Error(
				'Free read allowance exhausted (25/mo). Buy a read pack at https://dojo.extenshi.io/billing — the free allowance resets on the 1st (UTC).',
			),
			{ data: { code: 'TOO_MANY_REQUESTS', httpStatus: 429 } },
		)

	it('a quota gate fires mcp_tool_failed but is NOT captured as an exception', async () => {
		// The exact reported scenario: a metered read hits the free-allowance gate.
		const tool = getReviewsToolRejectingWith(quotaGate())
		await expect(tool.execute({ extension_id: 1, limit: 20 }, {})).rejects.toBeInstanceOf(UserError)

		expect(captureError).not.toHaveBeenCalled()
		expect(captureEvent).toHaveBeenCalledWith(
			'mcp_tool_failed',
			expect.objectContaining({ tool: 'get_reviews', error_kind: 'quota' }),
		)
	})

	// The regression the `cause` plumbing exists to prevent: readError() wraps a
	// genuine fault in a UserError too, so without the origin these would read as
	// "expected" and silently stop reaching error tracking.
	it('a BFF 5xx behind the same UserError IS captured as an exception', async () => {
		const tool = getReviewsToolRejectingWith(
			Object.assign(new Error('Internal server error'), {
				data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 },
			}),
		)
		await expect(tool.execute({ extension_id: 1, limit: 20 }, {})).rejects.toBeInstanceOf(UserError)

		expect(captureError).toHaveBeenCalledWith(expect.any(Error), { tool: 'get_reviews' })
		expect(captureEvent).toHaveBeenCalledWith(
			'mcp_tool_failed',
			expect.objectContaining({ tool: 'get_reviews', error_kind: 'api_5xx' }),
		)
	})

	it('an unexpected fault inside a read handler IS captured as an exception', async () => {
		const tool = getReviewsToolRejectingWith(new TypeError('x.map is not a function'))
		await expect(tool.execute({ extension_id: 1, limit: 20 }, {})).rejects.toBeInstanceOf(UserError)

		expect(captureError).toHaveBeenCalledWith(expect.any(Error), { tool: 'get_reviews' })
	})
})

// The policy that decides which failures are "expected" (user-facing) vs a real
// fault worth an exception report.
describe('isExpectedError', () => {
	/** A UserError wrapping an origin, as readError()/the docs+scan handlers build it. */
	function wrapping(cause: unknown): UserError {
		const err = new UserError('rendered for the caller')
		err.cause = cause
		return err
	}

	it('treats an AUTHORED UserError (no cause) as expected', () => {
		// e.g. "No extension found with catalog ID 5" or the missing-key help —
		// messages this codebase wrote deliberately, not wrapped faults.
		expect(isExpectedError(new UserError('No extension found with catalog ID 5.'))).toBe(true)
	})

	it('treats quota / rate_limit / auth classes as expected', () => {
		expect(isExpectedError({ status: 402 }), 'quota').toBe(true)
		expect(isExpectedError({ status: 429 }), 'rate_limit').toBe(true)
		expect(isExpectedError({ status: 401 }), 'auth').toBe(true)
	})

	it('treats genuine faults as NOT expected', () => {
		expect(isExpectedError({ status: 500 }), 'api_5xx').toBe(false)
		expect(isExpectedError(new Error('fetch failed')), 'network').toBe(false)
		expect(isExpectedError(new Error('timed out')), 'timeout').toBe(false)
		expect(isExpectedError(new Error('something weird')), 'unexpected').toBe(false)
	})

	// The core of the wrapper/authored split: a UserError is only as expected as
	// whatever it wraps.
	it('a UserError WRAPPING an expected condition stays expected', () => {
		expect(isExpectedError(wrapping({ status: 429 }))).toBe(true)
	})

	it('honours a caller-supplied kind, so instrument() cannot report one kind and gate on another', () => {
		// instrument() classifies once and passes the result in; the default
		// argument must not re-classify behind its back.
		expect(isExpectedError({ status: 500 }, 'quota')).toBe(true)
		expect(isExpectedError({ status: 402 }, 'api_5xx')).toBe(false)
	})

	it('a UserError WRAPPING a genuine fault is NOT expected', () => {
		expect(isExpectedError(wrapping({ status: 500 })), 'api_5xx').toBe(false)
		expect(isExpectedError(wrapping(new TypeError('x.map is not a function'))), 'bug').toBe(false)
	})
})

describe('generate_icon_workflow execute', () => {
	it('returns the static workflow with the extension name inlined', async () => {
		const { tools, server } = recordingServer()
		registerTools(server, depsFor(['docs']))
		const tool = tools.find((t) => t.name === 'generate_icon_workflow') as unknown as {
			execute: (args: Record<string, unknown>, ctx: Record<string, unknown>) => Promise<string>
		}
		const out = await tool.execute({ extension_name: 'Tab Keeper' }, {})
		expect(out).toContain('icon preview icon.svg --name "Tab Keeper"')
		expect(out).toContain('16, 32, 48 and 128 px')
		expect(out).toContain('No API key')
	})

	it('falls back to a generic name when none is given', async () => {
		const { tools, server } = recordingServer()
		registerTools(server, depsFor(['docs']))
		const tool = tools.find((t) => t.name === 'generate_icon_workflow') as unknown as {
			execute: (args: Record<string, unknown>, ctx: Record<string, unknown>) => Promise<string>
		}
		const out = await tool.execute({}, {})
		expect(out).toContain('--name "My Extension"')
	})
})
