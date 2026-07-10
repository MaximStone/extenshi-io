/**
 * Output shaping for MCP tool results.
 *
 * MCP tool results land directly in the AI client's context window, so we keep
 * them compact and curated. Field names below match the live BFF payloads
 * (catalog router mounted as `catalog`, security as `security`):
 *   - search items wrap a cross-store cluster: `{ id, slug, snapshots[], availableStores, security }`
 *     where the human-facing fields (name, rating, users, store) live on each snapshot.
 *   - `getExtensionById` returns the cluster with aggregated `latest*` fields.
 *   - `getSecurityData` returns `{ riskAssessment, scanExecution, findings:{ total, groupTotal, bySeverity } }`.
 *   - `getRiskSummary` is already a compact summary (or null if never scanned).
 *
 * `compact()` is a defensive fallback that bounds array length / string length /
 * depth so a tool can never blow up the context even if a shape drifts.
 */

interface CompactOpts {
	maxArray?: number
	maxString?: number
	maxDepth?: number
}

/** Recursively bound a value's size: cap arrays, truncate strings, limit depth. */
export function compact(value: unknown, opts: CompactOpts = {}, depth = 0): unknown {
	const { maxArray = 20, maxString = 400, maxDepth = 5 } = opts

	if (typeof value === 'string') {
		return value.length > maxString ? `${value.slice(0, maxString)}…` : value
	}
	if (value === null || typeof value !== 'object') return value
	if (depth >= maxDepth) return Array.isArray(value) ? `[${value.length} items]` : '{…}'

	if (Array.isArray(value)) {
		const capped = value.slice(0, maxArray).map((v) => compact(v, opts, depth + 1))
		if (value.length > maxArray) capped.push(`…+${value.length - maxArray} more`)
		return capped
	}

	const out: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
		if (v === undefined || v === null) continue
		out[k] = compact(v, opts, depth + 1)
	}
	return out
}

type Obj = Record<string, unknown>

function isObj(v: unknown): v is Obj {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Drop nullish entries so curated objects stay terse. */
function prune(obj: Obj): Obj {
	for (const k of Object.keys(obj)) if (obj[k] === undefined || obj[k] === null) delete obj[k]
	return obj
}

/**
 * Convert a backend risk score (0 = safest, 100 = most dangerous) into the
 * user-facing safety score (0 = most dangerous, 100 = safest) — the SAME
 * coefficient the website shows everywhere (catalog-frontend `toSafetyScore`:
 * `clamp(0, 100, 100 - risk)`). Returns undefined for a missing score so an
 * unscanned extension surfaces no score at all (rather than a misleading 100).
 */
function toSafetyScore(risk: unknown): number | undefined {
	if (risk === undefined || risk === null) return undefined
	const r = Number(risk)
	if (!Number.isFinite(r)) return undefined
	return Math.max(0, Math.min(100, 100 - r))
}

function primaryCategory(snap: Obj): unknown {
	const cats = snap.categories
	if (Array.isArray(cats) && isObj(cats[0])) return (cats[0] as Obj).name ?? (cats[0] as Obj).displayName
	return undefined
}

/** Curate one search-result cluster via its primary (first) snapshot. */
function shapeSearchItem(item: unknown): Obj {
	if (!isObj(item)) return { value: compact(item) }
	const snaps = Array.isArray(item.snapshots) ? (item.snapshots as Obj[]) : []
	const snap = isObj(snaps[0]) ? snaps[0] : {}
	const security = isObj(item.security) ? item.security : undefined
	const riskAssessment =
		security && isObj(security.riskAssessment) ? (security.riskAssessment as Obj) : undefined
	return prune({
		id: item.id,
		slug: item.slug,
		name: snap.name,
		author: snap.authorName,
		stores: item.availableStores,
		store: snap.store,
		storeId: snap.storeId,
		users: snap.usersNumeric ?? snap.weeklyDownloads,
		rating: snap.rating,
		reviews: snap.ratingCount,
		category: primaryCategory(snap),
		version: snap.version,
		lastUpdated: snap.lastUpdated,
		sizeBytes: item.latestSizeBytes,
		safetyScore: toSafetyScore(riskAssessment?.overallScore ?? security?.overallScore),
		shortDescription:
			typeof snap.shortDescription === 'string' ? snap.shortDescription.slice(0, 200) : undefined,
	})
}

/** Compact a search result down to a count + curated items. */
export function shapeSearch(result: unknown, limit: number): Obj {
	const arr = Array.isArray(result)
		? result
		: isObj(result) && Array.isArray(result.items)
			? (result.items as unknown[])
			: []
	const items = arr.slice(0, limit).map(shapeSearchItem)
	const total = isObj(result) ? (result.total ?? result.totalCount) : undefined
	return prune({ count: items.length, total, items } as Obj)
}

/** Curate a single extension detail (`getExtensionById`). */
export function shapeExtension(result: unknown): unknown {
	if (!isObj(result)) return result ?? null
	const snaps = Array.isArray(result.snapshots) ? (result.snapshots as Obj[]) : []
	const stores = [...new Set(snaps.map((s) => (isObj(s) ? s.store : undefined)).filter(Boolean))]
	const reviews = result.reviews
	return prune({
		id: result.id,
		slug: result.slug,
		name: result.latestName,
		rating: result.latestRating,
		users: result.latestUsersNumeric,
		lastUpdated: result.latestUpdatedAt,
		traderStatus: result.latestTraderStatus,
		safetyScore: toSafetyScore(result.latestRiskScore),
		safetyScoreAt: result.latestRiskScoreAt,
		sizeBytes: result.latestSizeBytes,
		hidden: result.hidden || undefined,
		stores: stores.length ? stores : undefined,
		reviewCount: Array.isArray(reviews) ? reviews.length : reviews,
		installDialogPreview: shapeInstallDialog(result.installDialogPreview),
		snapshots: snaps.slice(0, 6).map((s) =>
			prune({
				store: s.store,
				storeId: s.storeId,
				name: s.name,
				rating: s.rating,
				reviews: s.ratingCount,
				users: s.usersNumeric ?? s.weeklyDownloads,
				version: s.version,
				lastUpdated: s.lastUpdated,
				category: primaryCategory(s),
			}),
		),
	})
}

/** Hard cap on FF/Edge excerpt length surfaced by the MCP — mirrors the
 *  server's REVIEW_EXCERPT_MAX_CHARS (shared-types/reviews.ts). The server
 *  already excerpts; this is a defense-in-depth double-bound so a drifted
 *  payload can never surface a longer body through the MCP. */
const REVIEW_EXCERPT_MAX_CHARS = 300

/** Curate one store review. Reviewer identity is never in the payload (the
 *  server omits authorName/authorAvatar as PII), so there is nothing to strip
 *  here. The paid MCP surface obeys the same per-store content policy as the
 *  website (shared-types/reviews.ts):
 *    - CHROME (`contentPolicy: 'rating-only'`) → NO review text; surface the
 *      bare facts + a note pointing at the store's reviews tab.
 *    - FIREFOX/EDGE (`'excerpt'`) → the ≤300-char excerpt + a source attribution.
 *  Chrome is forced rating-only even if a drifted payload carried a body. */
function shapeReview(r: unknown): Obj {
	if (!isObj(r)) return { value: compact(r) }
	const store = typeof r.store === 'string' ? r.store : undefined
	const storeUrl = typeof r.storeUrl === 'string' ? r.storeUrl : undefined
	const base: Obj = {
		rating: r.rating,
		date: r.reviewDate,
		languageId: r.languageId,
		// Store-native review id (Chrome UUID, Firefox rating id, Edge review id) —
		// surfaced so an LLM consumer can cite or deep-link a specific review.
		storeReviewId: r.storeReviewId,
		store,
		storeUrl,
	}

	// Chrome: never republish the text. Point the model at the store reviews tab.
	if (r.contentPolicy === 'rating-only' || store === 'CHROME') {
		// `storeUrl` here is the LISTING url (`/detail/<id>`), so appending
		// `/reviews` yields the reviews tab — matching the server's
		// getStoreReviewsUrl('CHROME', …). It does NOT double-append.
		const reviewsUrl = storeUrl ? `${storeUrl}/reviews` : undefined
		return prune({
			...base,
			note: reviewsUrl
				? `Per Chrome Web Store terms, review text is not republished — read the full review at ${reviewsUrl}`
				: 'Per Chrome Web Store terms, review text is not republished.',
		} as Obj)
	}

	// Firefox / Edge: bounded excerpt + source attribution.
	const content = typeof r.content === 'string' ? r.content.slice(0, REVIEW_EXCERPT_MAX_CHARS) : undefined
	return prune({
		...base,
		content,
		contentTruncated: r.contentTruncated === true ? true : undefined,
		note: storeUrl && store ? `Source: ${store}, full review at ${storeUrl}` : undefined,
	} as Obj)
}

/**
 * Curate a page of store user reviews (`get_reviews`). Passes through the
 * keyset `nextCursor` so the model can page, a `count` for quick sizing, and the
 * store-level `aggregate` (rating / count / snapshot date + reviews link) — the
 * bare facts that stay public even for Chrome.
 */
export function shapeReviews(result: unknown, limit: number): Obj {
	const arr = Array.isArray(result)
		? result
		: isObj(result) && Array.isArray(result.items)
			? (result.items as unknown[])
			: []
	const items = arr.slice(0, limit).map(shapeReview)
	const nextCursor = isObj(result) ? result.nextCursor : undefined
	const aggregate = isObj(result) && isObj(result.aggregate) ? compact(result.aggregate) : undefined
	return prune({ count: items.length, nextCursor, aggregate, items } as Obj)
}

/**
 * Curate the install-dialog preview — the consolidated permission prompt the
 * browser shows at install (computed server-side by catalog-api from the
 * manifest's required permissions; source of truth: shared-types/permission-warnings.ts).
 * Reduces each browser's warnings to their human-readable lines for terseness.
 */
export function shapeInstallDialog(preview: unknown): Obj | undefined {
	if (!isObj(preview)) return undefined
	const browser = (b: unknown): Obj | undefined => {
		if (!isObj(b)) return undefined
		const warnings = Array.isArray(b.warnings)
			? (b.warnings as unknown[]).map((w) => (isObj(w) ? w.message : w)).filter(Boolean)
			: []
		return { readsAllData: b.readsAllData === true, warnings }
	}
	const silent = Array.isArray(preview.silentPermissions) ? preview.silentPermissions : []
	const optional = Array.isArray(preview.excluded) ? preview.excluded : []
	const unknown = Array.isArray(preview.unknownPermissions) ? preview.unknownPermissions : []
	return prune({
		chrome: browser(preview.chrome),
		firefox: browser(preview.firefox),
		silentPermissions: silent.length ? silent : undefined,
		optionalExcluded: optional.length ? optional : undefined,
		// Surfaced separately so a developer can tell "silent by design" from
		// "not in our warning table yet" (e.g. a brand-new browser permission).
		unknownPermissions: unknown.length ? unknown : undefined,
	})
}

/** Curate a finding group to the essentials. */
function shapeFinding(f: unknown): Obj {
	if (!isObj(f)) return { value: compact(f) }
	const locations = Array.isArray(f.locations)
		? (f.locations as unknown[]).slice(0, 5).map((l) => (isObj(l) ? l.file : l))
		: undefined
	return prune({
		scanner: f.scanner,
		rule: f.rule_id ?? f.ruleId,
		severity: f.severity,
		title: f.title,
		count: f.count,
		files: locations,
	})
}

/** Curate the security view: risk summary + grouped findings (top N per severity). */
export function shapeSecurity(security: unknown, riskSummary: unknown, installDialogPreview?: unknown): Obj {
	const out: Obj = {}

	if (isObj(riskSummary)) {
		// Replace the backend `overallScore` (0 = safest) with the website's
		// `safetyScore` (100 = safest) so the MCP and the site never disagree.
		const { overallScore, ...rest } = riskSummary as Obj
		out.summary = prune({ safetyScore: toSafetyScore(overallScore), ...rest })
	} else if (isObj(security) && isObj(security.riskAssessment)) {
		const ra = security.riskAssessment as Obj
		out.summary = prune({
			safetyScore: toSafetyScore(ra.overallScore),
			riskCategory: ra.riskCategory,
			severityBreakdown: isObj(ra.contributingFactors)
				? (ra.contributingFactors as Obj).severity_breakdown
				: undefined,
		})
	}

	if (isObj(security)) {
		if (isObj(security.scanExecution)) {
			const se = security.scanExecution as Obj
			out.scan = prune({ status: se.status, completedAt: se.completedAt })
		}
		if (isObj(security.findings)) {
			const f = security.findings as Obj
			const bySeverity: Obj = {}
			if (isObj(f.bySeverity)) {
				for (const [sev, rows] of Object.entries(f.bySeverity as Obj)) {
					if (Array.isArray(rows) && rows.length) {
						bySeverity[sev] = rows.slice(0, 8).map(shapeFinding)
						if (rows.length > 8) (bySeverity[sev] as unknown[]).push(`…+${rows.length - 8} more`)
					}
				}
			}
			out.findings = prune({ total: f.total, groupTotal: f.groupTotal, bySeverity })
		}
	}

	// The install-dialog preview is a manifest transform, independent of
	// scanning — surface it even when the extension was never scanned.
	const hasScanData = Object.keys(out).length > 0
	const dialog = shapeInstallDialog(installDialogPreview)
	if (dialog) out.installDialogPreview = dialog

	if (!hasScanData) {
		out.scanned = false
		out.message = 'This extension has not been scanned yet.'
	}
	return out
}
