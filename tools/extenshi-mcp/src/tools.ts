/**
 * Transport-agnostic tool registry for the Extenshi MCP server.
 *
 * The SAME 8 tools must run over two transports:
 *   - stdio  (`index.ts`)  — local, single `ek_…` key from the environment.
 *   - remote (`http.ts`, in the sibling `@extenshi/mcp-server`) — Streamable
 *     HTTP behind OAuth; identity is per-request (an access token → userId).
 *
 * To keep ONE source of truth for what the tools do, every tool body here is
 * identity-agnostic: it resolves its catalog client / scan auth through the
 * injected `ToolDeps` instead of reaching for a module-global key. stdio passes
 * deps that ignore the call context and use the env key; the remote server
 * passes deps that read `context.session` (the validated OAuth identity).
 *
 * Capability gating: the remote connector deliberately exposes a SUBSET — the
 * read/research/docs tools only. `scan_extension` and `publish_extension` need
 * the caller's LOCAL filesystem and LOCAL store credentials, which a hosted
 * server has no access to (and must never store) — so they are registered only
 * when the corresponding capability is present (stdio enables all four).
 * See internal-docs/plans/2026-06-25-claude-connector-directory.md §13 #1.
 *
 *   capability → tools
 *   ─────────────────────────────────────────────────────────────
 *   'read'    → search_extensions, get_extension, get_reviews,
 *               get_security, market_overview
 *   'docs'    → search_docs, generate_icon_workflow  (free; no key)
 *   'scan'    → scan_extension             (local artifact; stdio only)
 *   'publish' → publish_extension          (local creds; stdio only)
 *
 * stdout is the MCP protocol channel for stdio — nothing here may write to it.
 */

import { type FastMCP, type FastMCPSessionAuth, type Tool, type ToolParameters, UserError } from 'fastmcp'
import { z } from 'zod'
import type { Bff } from './bff.js'
import { DocsError, getDocsIndex, searchDocs } from './docs.js'
import { renderIconWorkflow } from './icon-workflow.js'
import {
	PublishSetupError,
	publishArtifact,
	readStoreCredentials,
	validateStoreCredentials,
} from './publish.js'
import { checkPublishAccess } from './publish-access.js'
import { ScanError, scanArtifact } from './scan.js'
import { describeStoreConstraints, validateSearchFilters } from './search-filters.js'
import { shapeExtension, shapeReviews, shapeSearch, shapeSecurity } from './shape.js'
import { captureError, captureEvent, classifyError } from './telemetry.js'

// ── Public links (shared by tool bodies + server instructions) ──────────────

export const KEY_PAGE = 'https://dojo.extenshi.io/api-keys'
export const SIGNUP_PAGE = 'https://auth.extenshi.io/signup'
export const BILLING_PAGE = 'https://dojo.extenshi.io/billing'

export const MISSING_KEY_MESSAGE =
	"This tool needs an Extenshi API key, and you don't have one set up yet — " +
	"here's how to get going.\n\n" +
	'Getting started is free: no credit card required. Every account includes a ' +
	'one-time free allowance (10 catalog reads + 3 scans), so you can explore the ' +
	'catalog and run scans before paying for anything.\n\n' +
	`1. Create a free account at ${SIGNUP_PAGE}\n` +
	`2. Grab a key at ${KEY_PAGE}\n` +
	'3. Set it as the EXTENSHI_API_KEY environment variable in your MCP client ' +
	'config (or run `extenshi login`).\n\n' +
	'Tip: the `search_docs` tool is free and needs no key — use it any time to ' +
	'look up product docs and CLI commands.'

export const SERVER_NAME = 'extenshi'

export const SERVER_INSTRUCTIONS =
	'Extenshi catalog tools for extension developers: search the cross-store catalog, ' +
	'inspect an extension and its security findings, find competitors, read market stats, ' +
	'run a pre-publish security scan, and publish to the stores. Use search_docs (free, no ' +
	'key) to consult the live product documentation and the @extenshi/cli command reference — ' +
	'prefer quoting exact CLI commands and flags from the docs over guessing. Use ' +
	'generate_icon_workflow (free, no key) when the developer needs an extension icon — it ' +
	'returns the local agent-draws-SVG → CLI browser-panel preview → export workflow. The catalog and ' +
	`scan tools require an Extenshi API key (${KEY_PAGE}). Every account gets a one-time free ` +
	'allowance — 10 reads and 3 scans; beyond it, buy prepaid credit packs (scans ' +
	`and reads, never expire) at ${BILLING_PAGE}.`

// ── Injected dependencies ───────────────────────────────────────────────────

/** Which tool groups to register on this transport. */
export type Capability = 'read' | 'docs' | 'scan' | 'publish'

/**
 * Minimal structural view of a FastMCP tool-execute context. The real context
 * (passed by FastMCP to `execute`) carries more (`reportProgress`, `log`, …);
 * we only need `session` for per-request identity resolution. Extra props are
 * fine — this is a structural supertype.
 */
export interface ToolCallContext {
	session?: FastMCPSessionAuth
}

export interface ToolDeps {
	/** Base URLs for the BFF (reads), scan backend, and docs site. */
	cfg: { bffUrl: string; scanUrl: string; docsUrl: string }
	/** Tool groups to register. */
	capabilities: ReadonlySet<Capability>
	/**
	 * Build a catalog BFF client for THIS call's identity.
	 * stdio: ignores `ctx`, uses the env key (throws MISSING_KEY if absent).
	 * remote: reads `ctx.session` (already OAuth-authenticated) and binds the
	 * caller's userId.
	 */
	getBff: (ctx: ToolCallContext) => Bff
	/**
	 * Resolve the scan/publish API key for THIS call (paid local ops). Required
	 * only when the 'scan' or 'publish' capability is enabled. stdio supplies
	 * the env key (or throws MISSING_KEY); the remote connector never enables
	 * these capabilities, so it may omit this.
	 */
	requireApiKey?: (ctx: ToolCallContext) => string
	/**
	 * Non-throwing key accessor for the publish-access preflight, which fails
	 * OPEN when no key is present (it must not hard-require a key). Returns the
	 * key or undefined. stdio supplies the (nullable) env key.
	 */
	getApiKey?: (ctx: ToolCallContext) => string | undefined
	/** Optional override of the missing-key message (defaults to MISSING_KEY_MESSAGE). */
	missingKeyMessage?: string
}

// ── Internal helpers (ported from index.ts, now deps-parametrized) ───────────

/**
 * A `UserError` that keeps the error it renders as `cause`.
 *
 * ANY catch-all that turns a caught error into a `UserError` MUST build it here
 * rather than with `new UserError(err.message)`. isExpectedError() reads a
 * missing `cause` as "a message we authored" — i.e. expected — so a hand-rolled
 * wrapper silently drops whatever it caught (a BFF 5xx, a TypeError) from error
 * tracking. That's the bug this helper exists to prevent; the convention is not
 * enforced by the type system, so it lives here and in isExpectedError().
 *
 * Two fastmcp details force this to be a helper rather than
 * `new UserError(msg, { cause })`:
 *  1. `UserError`'s constructor is `(message, extras?)` and passes ONLY the
 *     message to `super()` — an `ErrorOptions` second argument is silently
 *     dropped, so `.cause` would stay undefined.
 *  2. `extras` is not a place to stash the origin either: fastmcp spreads it
 *     into the tool result as `structuredContent`, which would ship the raw
 *     error (stack, internal URLs) to the caller.
 * So set `cause` on the instance. fastmcp never reads it, so nothing leaks — but
 * classifyError()/isExpectedError() can see the origin behind the rendered
 * message instead of guessing from its wording.
 */
function userErrorFrom(message: string, cause: unknown): UserError {
	const err = new UserError(message)
	err.cause = cause
	return err
}

/**
 * Normalize a thrown read error into a user-facing message.
 *
 * NB: this wraps EVERY failure — a BFF 5xx and a plain bug included — so the
 * resulting `UserError` says nothing about whether the failure was expected.
 * That's why the origin is preserved as `cause`: it's the only thing left that
 * can tell a quota gate from a genuine fault. See isExpectedError().
 */
function readError(err: unknown, missingKeyMessage: string): never {
	if (err instanceof UserError) throw err
	const message = err instanceof Error ? err.message : String(err)
	// A 401 means the BFF rejected the key (enforcement landed / key invalid).
	if (/unauthorized|401|api key/i.test(message)) {
		throw userErrorFrom(`Request rejected — ${message}\n\n${missingKeyMessage}`, err)
	}
	throw userErrorFrom(message, err)
}

/** Map a scan backend failure to an actionable next step. */
function scanErrorMessage(err: ScanError, missingKeyMessage: string): string {
	switch (err.status) {
		case 401:
			return `Authentication failed: ${err.message}\n\n${missingKeyMessage}`
		case 402:
			return `Out of scan credits. Buy a scan pack at ${BILLING_PAGE} to continue — the one-time free allowance (3 scans) does not renew.`
		case 403:
			// FREE_REQUIRES_* came from the pre-credit-pack backend (free scans
			// were gated on verified ownership). Kept for skew with old backends.
			if (err.errorCode === 'FREE_REQUIRES_CLAIM' || err.errorCode === 'FREE_REQUIRES_VERIFIED_OWNERSHIP') {
				return `${err.message}\n\nBuy a scan pack at ${BILLING_PAGE} to scan arbitrary artifacts.`
			}
			return `Access denied: ${err.message}`
		case 429:
			return `Rate limited — wait ${err.retryAfterSec ?? 60}s before trying again.`
		default:
			return err.message
	}
}

/**
 * Error classes that are EXPECTED, user-facing conditions rather than faults:
 * the caller ran out of their free allowance (`quota`), got rate limited
 * (`rate_limit`), or supplied a bad/absent key (`auth`). These surface to the
 * user as an actionable message — they are not code exceptions, so they must
 * NOT be shipped to error tracking (otherwise a routine billing gate mints a
 * bogus, self-reopening issue). See classifyError() in ./telemetry.ts.
 */
const EXPECTED_ERROR_KINDS = new Set(['quota', 'rate_limit', 'auth'])

/**
 * True when a thrown error is an expected, user-facing condition rather than a
 * bug worth an exception report.
 *
 * `UserError` alone can't answer this. It has two jobs in this file: messages we
 * AUTHORED for the caller ("No extension found …", the missing-key help), and a
 * last-resort wrapper the catch-alls put around anything that escaped (readError,
 * the docs/scan handlers). Treating every `UserError` as expected would let that
 * second group launder a BFF 500 or a plain TypeError into "expected" and drop it
 * from error tracking — so the two are told apart by `cause`:
 *
 *   - authored (no `cause`)  → expected by construction: we wrote the message.
 *   - wrapping (has `cause`) → only as expected as what it wraps; classifyError
 *     follows the chain, so a 429 gate stays expected and a 500 does not.
 *
 * Corollary for anything that wraps a caught error: build it with
 * userErrorFrom(), or it reads as authored and its origin never gets captured.
 *
 * `kind` defaults to classifying `err`; pass one to reuse a classification the
 * caller already made, so the reported `error_kind` and this decision can't
 * disagree.
 */
export function isExpectedError(err: unknown, kind: string = classifyError(err)): boolean {
	if (EXPECTED_ERROR_KINDS.has(kind)) return true
	return err instanceof UserError && err.cause === undefined
}

/**
 * Wrap a tool definition so every call emits anonymous telemetry: which tool
 * ran, how long it took, and how it failed (coarse error_kind + sanitized
 * exception). The generic preserves the Zod-inferred `args` type — `parameters`
 * fixes Params, so the inner execute stays as strongly typed as before.
 * Fail-soft: telemetry never alters the tool's result or its thrown error.
 */
function instrument<Params extends ToolParameters>(
	tool: Tool<FastMCPSessionAuth, Params>,
): Tool<FastMCPSessionAuth, Params> {
	const { name } = tool
	const original = tool.execute
	return {
		...tool,
		execute: async (args, context) => {
			const startedAt = Date.now()
			captureEvent('mcp_tool_called', { tool: name })
			try {
				const result = await original(args, context)
				captureEvent('mcp_tool_succeeded', { tool: name, duration_ms: Date.now() - startedAt })
				return result
			} catch (err) {
				// Classified once and threaded into both uses below: the reported
				// error_kind and the capture decision must never disagree about what
				// this failure was.
				const kind = classifyError(err)
				// The failure count is always tracked, so we keep visibility into
				// how often callers hit each condition (incl. the billing gate).
				captureEvent('mcp_tool_failed', { tool: name, error_kind: kind, duration_ms: Date.now() - startedAt })
				// …but only genuine faults are shipped as exceptions. Expected
				// user-facing conditions (a quota gate, a bad key, a message we
				// authored) are not bugs and must not open error-tracking issues.
				if (!isExpectedError(err, kind)) captureError(err, { tool: name })
				throw err
			}
		},
	}
}

// ── Registration ─────────────────────────────────────────────────────────────

/**
 * MCP tool annotations (spec: title + behaviour hints). REQUIRED for the
 * Anthropic Connectors Directory — its submission portal auto-syncs tools and
 * refuses to submit any tool missing a `title` or a read/write hint. Kept as a
 * name→annotation map (not inline per tool) so the read/write split is auditable
 * in one place. Every remote-exposed tool is read-only; scan uploads an artifact
 * (not read-only, not destructive); publish writes to public stores (destructive).
 */
const TOOL_ANNOTATIONS: Record<
	string,
	{
		title: string
		readOnlyHint?: boolean
		destructiveHint?: boolean
		idempotentHint?: boolean
		openWorldHint?: boolean
	}
> = {
	search_extensions: {
		title: 'Search extension catalog',
		readOnlyHint: true,
		idempotentHint: true,
		openWorldHint: true,
	},
	get_extension: {
		title: 'Get extension details',
		readOnlyHint: true,
		idempotentHint: true,
		openWorldHint: true,
	},
	get_reviews: {
		title: 'Get extension reviews',
		readOnlyHint: true,
		idempotentHint: true,
		openWorldHint: true,
	},
	get_security: {
		title: 'Get extension security analysis',
		readOnlyHint: true,
		idempotentHint: true,
		openWorldHint: true,
	},
	market_overview: {
		title: 'Catalog market overview',
		readOnlyHint: true,
		idempotentHint: true,
		openWorldHint: true,
	},
	search_docs: {
		title: 'Search Extenshi documentation',
		readOnlyHint: true,
		idempotentHint: true,
		openWorldHint: true,
	},
	generate_icon_workflow: {
		title: 'Icon design workflow guide',
		readOnlyHint: true,
		idempotentHint: true,
		openWorldHint: false,
	},
	scan_extension: {
		title: 'Scan an extension package',
		readOnlyHint: false,
		destructiveHint: false,
		openWorldHint: true,
	},
	publish_extension: {
		title: 'Publish extension to stores',
		readOnlyHint: false,
		destructiveHint: true,
		openWorldHint: true,
	},
}

/**
 * Register the Extenshi tools on a FastMCP server. Idempotent per server.
 * Only the tools whose capability is present in `deps.capabilities` are added.
 */
export function registerTools(server: FastMCP, deps: ToolDeps): void {
	const caps = deps.capabilities
	const missingKeyMessage = deps.missingKeyMessage ?? MISSING_KEY_MESSAGE
	// Generic so each tool's Zod `parameters` infers its own `args` type (a
	// non-generic wrapper would collapse Params to `never`).
	function add<P extends ToolParameters>(tool: Tool<FastMCPSessionAuth, P>): void {
		// Attach the directory-required annotations (title + read/write hint) from
		// the central map; an explicit `tool.annotations` (none today) still wins.
		const annotations = { ...TOOL_ANNOTATIONS[tool.name], ...tool.annotations }
		server.addTool(instrument({ ...tool, annotations }))
	}
	// Per-call helpers bound to the injected deps.
	const bff = (ctx: ToolCallContext): Bff => deps.getBff(ctx)
	const requireApiKey = (ctx: ToolCallContext): string => {
		if (!deps.requireApiKey) throw new UserError(missingKeyMessage)
		return deps.requireApiKey(ctx)
	}

	// ── Read tools (free; key/identity required) ───────────────────────────────
	if (caps.has('read')) {
		add({
			name: 'search_extensions',
			description:
				'Search the cross-store extension catalog (Chrome, Firefox, Edge) with hybrid relevance. ' +
				'ALL filters are applied server-side by the catalog database — always narrow with the ' +
				'parameters below (rating/users/reviews thresholds, store, category, pricing, risk, ' +
				'permissions, freshness, manifest version, trader status) rather than fetching a broad ' +
				'list and filtering the results yourself. Use `skip` to page through large result sets. ' +
				`${describeStoreConstraints()} ` +
				'Returns a compact list for market research and competitive analysis.',
			parameters: z.object({
				query: z.string().optional().describe('Free-text search query (name, description, keywords).'),
				stores: z
					.array(z.enum(['CHROME', 'FIREFOX', 'EDGE']))
					.optional()
					.describe('Limit to stores: CHROME, FIREFOX, and/or EDGE.'),
				categories: z.array(z.string()).optional().describe('Catalog category slugs to include.'),
				pricing: z
					.array(z.enum(['FREE', 'FREEMIUM', 'IN_APP_PURCHASES', 'SUBSCRIPTION']))
					.optional()
					.describe('Pricing models to include.'),
				risk: z
					.array(z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']))
					.optional()
					.describe('Risk categories to include.'),
				permissions: z.array(z.string()).optional().describe('Only extensions requesting these permissions.'),
				minRating: z.number().min(0).max(5).optional().describe('Only ratings ≥ this (0–5).'),
				maxRating: z.number().min(0).max(5).optional().describe('Only ratings ≤ this (0–5).'),
				minWeeklyDownloads: z
					.number()
					.min(0)
					.optional()
					.describe(
						'Minimum weekly downloads — FIREFOX-ONLY metric (Chrome/Edge do not report it). ' +
							'For Chrome/Edge popularity use sortBy:"popular" instead. Conflicts with a ' +
							'Chrome/Edge-only `stores` filter and will be rejected.',
					),
				minReviews: z.number().min(0).optional().describe('Minimum number of store reviews/ratings.'),
				updatedWithin: z
					.enum(['30d', '90d', '1y', 'stale'])
					.optional()
					.describe('Freshness: updated within 30d / 90d / 1y, or "stale" (older than 1y).'),
				manifestVersions: z
					.array(z.union([z.literal(2), z.literal(3)]))
					.optional()
					.describe('Manifest version(s): 2 and/or 3.'),
				traderStatuses: z
					.array(z.enum(['TRADER', 'NON_TRADER']))
					.optional()
					.describe('EU DSA trader status.'),
				monetizationModels: z
					.array(z.enum(['FREE', 'ONE_TIME', 'SUBSCRIPTION', 'FREEMIUM', 'DONATIONS', 'ADS']))
					.optional()
					.describe('Author-declared monetization model (questionnaire).'),
				hasPaywall: z.boolean().optional().describe('Author-declared paywall present.'),
				isOpenSource: z.boolean().optional().describe('Author-declared open source.'),
				noTelemetry: z.boolean().optional().describe('Author-declared no telemetry.'),
				collectsHealthData: z.boolean().optional().describe('Author-declared collects health data.'),
				includeDelisted: z
					.boolean()
					.optional()
					.describe('Include extensions whose store listing was removed (default: hidden).'),
				sortBy: z
					.enum(['relevance', 'popular', 'rating', 'recent', 'name', 'safety', 'trader', 'size'])
					.optional()
					.describe('Sort field (default: popular, or relevance when a query is given).'),
				sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc).'),
				skip: z.number().int().min(0).optional().describe('Offset for pagination (default: 0).'),
				limit: z.number().int().min(1).max(25).default(20).describe('Max results to return (1–25).'),
			}),
			execute: async (args, context) => {
				try {
					const conflict = validateSearchFilters(args as Record<string, unknown>)
					if (conflict) throw new UserError(conflict)
					const limit = args.limit ?? 20
					const result = await bff(context).searchExtensions({
						query: args.query,
						stores: args.stores,
						categories: args.categories,
						pricingModels: args.pricing,
						riskCategories: args.risk,
						permissions: args.permissions,
						minRating: args.minRating,
						maxRating: args.maxRating,
						minWeeklyDownloads: args.minWeeklyDownloads,
						minReviews: args.minReviews,
						updatedWithin: args.updatedWithin,
						manifestVersions: args.manifestVersions,
						traderStatuses: args.traderStatuses,
						monetizationModels: args.monetizationModels,
						hasPaywall: args.hasPaywall,
						isOpenSource: args.isOpenSource,
						noTelemetry: args.noTelemetry,
						collectsHealthData: args.collectsHealthData,
						includeDelisted: args.includeDelisted,
						sortBy: args.sortBy ?? (args.query ? 'relevance' : 'popular'),
						sortOrder: args.sortOrder,
						skip: args.skip,
						take: limit,
					})
					return JSON.stringify(shapeSearch(result, limit), null, 2)
				} catch (err) {
					return readError(err, missingKeyMessage)
				}
			},
		})

		add({
			name: 'get_extension',
			description:
				'Get full catalog detail for one extension by its numeric catalog ID: metadata, ' +
				'per-store ratings, install counts, categories, and a security badge.',
			parameters: z.object({
				extension_id: z.number().int().describe('Numeric catalog ID (from search_extensions results).'),
			}),
			execute: async (args, context) => {
				try {
					const result = await bff(context).getExtensionById(args.extension_id)
					if (!result) throw new UserError(`No extension found with catalog ID ${args.extension_id}.`)
					return JSON.stringify(shapeExtension(result), null, 2)
				} catch (err) {
					return readError(err, missingKeyMessage)
				}
			},
		})

		add({
			name: 'get_reviews',
			description:
				'Get store user reviews for one extension from Firefox Add-ons and Edge Add-ons: star rating, ' +
				'a short review excerpt, date and language, plus a store-level `aggregate` (rating, count, ' +
				'reviews link). Chrome Web Store review rows are NOT returned (their text cannot be redistributed) — ' +
				'for a Chrome extension the `aggregate` (with a link to the store reviews tab) is the only public ' +
				'review content. Reviewer identity is intentionally omitted. ' +
				'Paginated newest-first by default — pass `cursor` (the `nextCursor` from a previous ' +
				'call) to fetch the next page, or sort by highest rating. Cursors are sort-specific: ' +
				'keep the same `sort` while paging, and start over if you change it. Reads existing ' +
				'scraped reviews; use `min_rating` to see only positive or only critical feedback.',
			parameters: z.object({
				extension_id: z.number().int().describe('Numeric catalog ID (from search_extensions results).'),
				limit: z.number().int().min(1).max(50).default(20).describe('Max reviews to return (1–50).'),
				cursor: z
					.number()
					.int()
					.optional()
					.describe('Pagination cursor — pass the `nextCursor` returned by a previous call.'),
				language_id: z.number().int().optional().describe('Only reviews in this catalog language id.'),
				min_rating: z
					.number()
					.int()
					.min(1)
					.max(5)
					.optional()
					.describe('Only reviews with a star rating ≥ this (1–5).'),
				sort: z
					.enum(['recent', 'rating'])
					.optional()
					.describe('Order by newest first (default) or highest rating.'),
			}),
			execute: async (args, context) => {
				try {
					const limit = args.limit
					const result = await bff(context).getReviews({
						extensionId: args.extension_id,
						limit,
						cursor: args.cursor,
						languageId: args.language_id,
						minRating: args.min_rating,
						sort: args.sort ?? 'recent',
					})
					return JSON.stringify(shapeReviews(result, limit), null, 2)
				} catch (err) {
					return readError(err, missingKeyMessage)
				}
			},
		})

		add({
			name: 'get_security',
			description:
				'Get the security analysis for an extension: safety score (0–100, higher = safer — the ' +
				'same coefficient the website shows), risk category, finding counts by ' +
				'severity, and the top grouped findings (scanner, rule, severity, count). Also returns ' +
				'the install-dialog preview — exactly what Chrome/Firefox show users in the permission ' +
				'prompt at install (consolidated + deduped from the manifest), available even for ' +
				'unscanned extensions. Reads existing scan results — does not trigger a new scan.',
			parameters: z.object({
				extension_id: z.number().int().describe('Numeric catalog ID.'),
			}),
			execute: async (args, context) => {
				try {
					const client = bff(context)
					// getExtensionById carries `installDialogPreview` (a manifest transform,
					// independent of scanning) — fetch it alongside the scan data so the
					// security view always includes the install prompt the user would see.
					const [security, riskSummary, extension] = await Promise.all([
						client.getSecurityData(args.extension_id).catch(() => null),
						client.getRiskSummary(args.extension_id).catch(() => null),
						client.getExtensionById(args.extension_id).catch(() => null),
					])
					const installDialogPreview =
						extension && typeof extension === 'object'
							? (extension as Record<string, unknown>).installDialogPreview
							: null
					return JSON.stringify(shapeSecurity(security, riskSummary, installDialogPreview), null, 2)
				} catch (err) {
					return readError(err, missingKeyMessage)
				}
			},
		})

		add({
			name: 'market_overview',
			description:
				'Aggregate catalog market intelligence. Called with NO arguments it returns a full ' +
				'CATALOG-WIDE overview: totals, store split, the category tree, and the extended facet ' +
				'breakdown — Manifest V2/V3 adoption, sensitive-permission histogram, security risk-tier ' +
				'distribution, trader status, update-recency, and review-count buckets. Pass a `query` ' +
				'(and/or store/category filters) to scope those facets to a search result set instead.',
			parameters: z.object({
				query: z.string().optional().describe('Optional query to scope facets to a search.'),
				stores: z.array(z.enum(['CHROME', 'FIREFOX', 'EDGE'])).optional(),
				categories: z.array(z.string()).optional(),
			}),
			execute: async (args, context) => {
				try {
					const client = bff(context)
					const scoped = Boolean(args.query?.trim() || args.stores?.length || args.categories?.length)

					// Search-scoped: progressive-narrowing facets over the match set.
					if (scoped) {
						const [stats, facets] = await Promise.all([
							client.getStats().catch(() => null),
							client
								.getSearchFacets({ query: args.query, stores: args.stores, categories: args.categories })
								.catch(() => null),
						])
						return JSON.stringify(
							{ scope: 'search', stats: stats ?? undefined, facets: facets ?? undefined },
							null,
							2,
						)
					}

					// Catalog-wide: the unscoped search facets are all-zero by design, so build the
					// overview from the dedicated catalog-wide procedures (cached server-side).
					const STORE_LABELS: Record<string, string> = {
						CHROME: 'Chrome Web Store',
						FIREFOX: 'Firefox Add-ons',
						EDGE: 'Edge Add-ons',
					}
					const [stats, extended, categoryTree] = await Promise.all([
						client.getStats().catch(() => null),
						client.getExtendedFilterFacets().catch(() => null),
						client.getCategoryTree().catch(() => null),
					])
					const storeDistribution =
						(stats as { storeDistribution?: Array<{ store: string; count: number }> } | null)
							?.storeDistribution ?? []
					const stores = storeDistribution.map((r) => ({
						name: r.store,
						count: r.count,
						label: STORE_LABELS[r.store] ?? r.store,
					}))
					return JSON.stringify(
						{
							scope: 'catalog-wide',
							stats: stats ?? undefined,
							facets: {
								stores,
								categoryTree: categoryTree ?? undefined,
								extended: extended ?? undefined,
							},
							note: 'Monetization and download-volume facets are only computed when scoped to a query — pass `query` to get those.',
						},
						null,
						2,
					)
				} catch (err) {
					return readError(err, missingKeyMessage)
				}
			},
		})
	}

	// ── Documentation (free; no API key required) ──────────────────────────────
	if (caps.has('docs')) {
		add({
			name: 'search_docs',
			description:
				'Search the official Extenshi documentation (docs.extenshi.io) — product guides plus the ' +
				'full @extenshi/cli command reference (scan, review-risk, publish, login). Use it to answer ' +
				'"how do I…" questions and to give developers exact CLI commands and flags instead of ' +
				'guessing. Free: reads public docs, no API key or quota required. Omit the query to list ' +
				'every available documentation page.',
			parameters: z.object({
				query: z
					.string()
					.optional()
					.describe(
						'What to look up, e.g. "scan a zip in CI", "review-risk flags", "publish to edge", "get an API key". Omit to list every page.',
					),
				limit: z
					.number()
					.int()
					.min(1)
					.max(10)
					.default(4)
					.describe('Max documentation sections to return (1–10).'),
			}),
			execute: async (args) => {
				try {
					const query = args.query?.trim()
					if (!query) return await getDocsIndex(deps.cfg.docsUrl)
					return await searchDocs(deps.cfg.docsUrl, query, args.limit ?? 4)
				} catch (err) {
					// Both branches keep the origin as `cause` — a docs outage is a
					// fault worth capturing, not an expected condition.
					if (err instanceof DocsError) throw userErrorFrom(err.message, err)
					throw userErrorFrom(err instanceof Error ? err.message : String(err), err)
				}
			},
		})

		add({
			name: 'generate_icon_workflow',
			description:
				'Get the recommended FREE local workflow for creating a browser-extension icon: the ' +
				'agent draws the SVG itself, then `@extenshi/cli icon preview` renders an offline ' +
				'verification page (Chrome/Firefox/Edge toolbar mockups, palette switcher with contrast ' +
				'warnings, store-size matrix, PNG/ZIP export). Returns the icon design requirements ' +
				'(sizes, 16px legibility rules, light/dark survival) and exact commands. Static content: ' +
				'no API key, no network, no credits.',
			parameters: z.object({
				extension_name: z
					.string()
					.max(120)
					.optional()
					.describe('Extension display name to inline into the preview command (optional).'),
			}),
			execute: async (args) => renderIconWorkflow({ extensionName: args.extension_name }),
		})
	}

	// ── Action tool (paid; key + LOCAL filesystem required; stdio only) ─────────
	if (caps.has('scan')) {
		add({
			name: 'scan_extension',
			description:
				'Run a pre-publish security scan on a local extension artifact (.zip/.crx/.xpi) and ' +
				'return the report. Uses one scan from your one-time free allowance (3 scans) or a ' +
				'purchased scan credit once that runs out. Streams live per-scanner progress.',
			parameters: z.object({
				artifact_path: z
					.string()
					.describe('Absolute or relative path to the built extension artifact (≤50 MB).'),
				extension_id: z
					.number()
					.int()
					.optional()
					.describe('Optional numeric catalog ID to associate the scan with a catalog listing.'),
			}),
			execute: async (args, context) => {
				const apiKey = requireApiKey(context)
				try {
					const report = await scanArtifact({
						artifactPath: args.artifact_path,
						apiKey,
						scanUrl: deps.cfg.scanUrl,
						extensionId: args.extension_id?.toString(),
						onProgress: (p) => {
							if (typeof p.total === 'number' && p.total > 0) {
								void context.reportProgress({ progress: p.completed ?? 0, total: p.total })
							}
						},
					})
					return JSON.stringify(shapeExtension(report), null, 2)
				} catch (err) {
					// Keep the ScanError as `cause`: scanErrorMessage() renders 402/429
					// and a 500 alike, so only the origin's status still says which of
					// those is a fault worth capturing.
					if (err instanceof ScanError) throw userErrorFrom(scanErrorMessage(err, missingKeyMessage), err)
					throw err
				}
			},
		})
	}

	if (caps.has('publish')) {
		add({
			name: 'publish_extension',
			description:
				'Publish an extension artifact (.zip/.crx/.xpi) to Chrome Web Store, Firefox AMO, and/or Edge Add-ons. ' +
				'FREE and fully local: the upload goes from this machine straight to the store APIs using store ' +
				'credentials from the MCP server environment (CHROME_APP_ID/CHROME_CLIENT_ID/CHROME_CLIENT_SECRET/' +
				'CHROME_REFRESH_TOKEN, FIREFOX_ADDON_GUID/FIREFOX_JWT_ISSUER/FIREFOX_JWT_SECRET, ' +
				'EDGE_PRODUCT_ID/EDGE_CLIENT_ID/EDGE_CLIENT_SECRET/EDGE_TENANT_ID). The upload itself is local, but ' +
				'publishing is in an active testing phase: a quick Extenshi access check runs first (set EXTENSHI_API_KEY ' +
				'so it can recognize your account). Edge submissions are polled to a terminal status. ' +
				'Recommended flow: scan_extension first, then publish.',
			parameters: z.object({
				artifact_path: z
					.string()
					.describe('Path to the packaged extension (.zip for Chrome/Edge, .xpi/.zip for Firefox).'),
				stores: z
					.array(z.enum(['chrome', 'firefox', 'edge']))
					.optional()
					.describe(
						'Target stores; defaults to every store that has complete credentials in the environment.',
					),
				firefox_artifact_path: z
					.string()
					.optional()
					.describe('Separate Firefox artifact (.xpi); defaults to artifact_path.'),
				release_notes: z.string().optional().describe('Release notes for stores that accept them.'),
				extension_id: z
					.number()
					.optional()
					.describe('Numeric catalog ID — checks publish-beta access against this specific extension.'),
				validate_only: z
					.boolean()
					.optional()
					.describe('Only check which store credentials are configured and valid; publish nothing.'),
			}),
			execute: async (args, context) => {
				try {
					if (args.validate_only) {
						const checks = await validateStoreCredentials(args.stores)
						return JSON.stringify({ checks }, null, 2)
					}

					// Publish-access gate: `publish` is in an active testing phase. One BFF
					// preflight evaluates the `publish-access` PostHog flag for this developer
					// / extension. Fails open on any transport error — only a definitive
					// server "no" blocks here (see checkPublishAccess).
					const creds = readStoreCredentials()
					const storeIds: Partial<Record<'chrome' | 'firefox' | 'edge', string>> = {}
					if (creds.chrome) storeIds.chrome = creds.chrome.appId
					if (creds.firefox) storeIds.firefox = creds.firefox.addonGuid
					if (creds.edge) storeIds.edge = creds.edge.productId
					const access = await checkPublishAccess({
						bffUrl: deps.cfg.bffUrl,
						apiKey: deps.getApiKey?.(context) ?? null,
						storeIds,
						extensionId: args.extension_id,
					})
					if (!access.allowed) {
						throw new UserError(
							access.message ??
								"Publishing is in an active testing phase and isn't available for your account yet.",
						)
					}

					void context.reportProgress({ progress: 0, total: 1 })
					const result = await publishArtifact({
						artifactPath: args.artifact_path,
						stores: args.stores,
						firefoxArtifactPath: args.firefox_artifact_path,
						releaseNotes: args.release_notes,
					})
					void context.reportProgress({ progress: 1, total: 1 })
					return JSON.stringify(result, null, 2)
				} catch (err) {
					if (err instanceof PublishSetupError) throw new UserError(err.message)
					throw err
				}
			},
		})
	}
}
