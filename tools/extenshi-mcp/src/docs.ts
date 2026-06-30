/**
 * Documentation access for the Extenshi MCP server (`search_docs` tool).
 *
 * Teaches the assistant to consult the LIVE extenshi.io documentation —
 * including the full `@extenshi/cli` command reference — so it can answer
 * "how do I…" questions and quote exact CLI commands instead of guessing.
 *
 * Source of truth is the docs site's machine-readable export (the llms.txt
 * convention), regenerated on every docs deploy:
 *   - <docsUrl>/llms.txt        a one-line index of every page
 *   - <docsUrl>/llms-full.txt   the full text of every page (one H1 per page)
 *
 * Both are PUBLIC static files — no API key, no metering — so this tool works
 * even before a developer has configured a key (handy for guiding setup). We
 * fetch lazily, cache in-process with a short TTL, and rank sections locally.
 *
 * stdout is the MCP protocol channel — this module must NEVER write to it.
 */

/** A failure the tool layer turns into an actionable `UserError`. */
export class DocsError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'DocsError'
	}
}

/** One page-sized chunk of `llms-full.txt`, split on top-level headings. */
export interface DocSection {
	title: string
	body: string
}

const FETCH_TIMEOUT_MS = 10_000
const CACHE_TTL_MS = 10 * 60 * 1000

// A descriptive, identifiable UA — deliberately NOT an AI-crawler signature
// (GPTBot/ClaudeBot/…), so the Cloudflare edge AI-bot block never catches this
// server-side fetch, and the operator can allowlist it by name if bot rules
// tighten. This runs on the developer's machine for their own MCP session.
const DOCS_FETCH_UA = 'extenshi-mcp (+https://docs.extenshi.io/developers/mcp)'

interface CacheEntry {
	text: string
	fetchedAt: number
}

// Keyed by absolute URL so the index and full-text entries cache independently.
const cache = new Map<string, CacheEntry>()

/** Monotonic-enough clock; isolated so tests can stay deterministic. */
function now(): number {
	return Date.now()
}

async function fetchText(url: string): Promise<string> {
	let res: Response
	try {
		res = await fetch(url, {
			headers: { accept: 'text/plain', 'user-agent': DOCS_FETCH_UA },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		})
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err)
		throw new DocsError(`Could not reach the Extenshi docs at ${url} (${reason}).`)
	}
	if (!res.ok) {
		throw new DocsError(`Extenshi docs request failed: ${res.status} ${res.statusText} (${url}).`)
	}
	return res.text()
}

/** Fetch `url` through the in-process TTL cache. */
async function fetchCached(url: string): Promise<string> {
	const hit = cache.get(url)
	if (hit && now() - hit.fetchedAt < CACHE_TTL_MS) return hit.text
	const text = await fetchText(url)
	cache.set(url, { text, fetchedAt: now() })
	return text
}

/** Clear the cache — test seam, also usable to force a refresh. */
export function clearDocsCache(): void {
	cache.clear()
}

/**
 * Split `llms-full.txt` into per-page sections on top-level (`# `) headings.
 * Fence-aware: a `# comment` inside a ``` code block is NOT a boundary, so CLI
 * examples never get chopped in half.
 */
export function splitSections(full: string): DocSection[] {
	const sections: DocSection[] = []
	let title = ''
	let lines: string[] = []
	let inFence = false

	const flush = () => {
		if (title || lines.some((l) => l.trim())) {
			sections.push({ title, body: lines.join('\n').trim() })
		}
	}

	for (const line of full.split('\n')) {
		if (/^\s*```/.test(line)) inFence = !inFence
		const h1 = !inFence ? /^#\s+(.+)$/.exec(line) : null
		if (h1) {
			flush()
			title = h1[1].trim()
			lines = []
			continue
		}
		lines.push(line)
	}
	flush()
	return sections
}

/**
 * Tokenize a query two ways:
 *  - `words`:   alphanumeric terms for broad recall — `review-risk` → review, risk
 *  - `phrases`: distinctive tokens that keep internal separators or are long
 *               (`review-risk`, `scan_extension`, `extenshi`) — high-precision
 *               signals for command and flag names that bare words dilute.
 */
function tokenize(query: string): { words: string[]; phrases: string[] } {
	const lower = query.toLowerCase()
	const words = Array.from(new Set(lower.split(/[^a-z0-9]+/).filter((t) => t.length > 1)))
	const phrases = Array.from(
		new Set(
			lower
				.split(/\s+/)
				.map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
				.filter((t) => t.length > 1 && (/[-_.]/.test(t) || t.length >= 5)),
		),
	)
	return { words, phrases }
}

/** Count non-overlapping occurrences of `needle` in `haystack`. */
function countOccurrences(haystack: string, needle: string): number {
	if (!needle) return 0
	let count = 0
	let from = 0
	for (;;) {
		const idx = haystack.indexOf(needle, from)
		if (idx === -1) return count
		count++
		from = idx + needle.length
	}
}

/**
 * Rank sections against a query. A term in the title is worth more than one in
 * the body. Pure (no I/O) so it is unit-testable with a fixture.
 */
export function rankSections(full: string, query: string, limit: number): DocSection[] {
	const { words, phrases } = tokenize(query)
	if (words.length === 0) return []

	const scored = splitSections(full)
		.map((section) => {
			const title = section.title.toLowerCase()
			const body = section.body.toLowerCase()
			let score = 0
			for (const w of words) {
				if (title.includes(w)) score += 5
				score += countOccurrences(body, w)
			}
			// Command/flag names (e.g. "review-risk") are strong, precise signals.
			for (const p of phrases) {
				if (title.includes(p)) score += 8
				score += countOccurrences(body, p) * 3
			}
			return { section, score }
		})
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score)

	return scored.slice(0, Math.max(1, limit)).map((s) => s.section)
}

/** Keep each returned section bounded; large enough to hold a full docs page. */
const MAX_SECTION_CHARS = 8000

function clampSection(body: string): string {
	if (body.length <= MAX_SECTION_CHARS) return body
	return `${body.slice(0, MAX_SECTION_CHARS).trimEnd()}\n\n…(section truncated — open the source link for the rest)`
}

/** Fetch the docs index (`llms.txt`) — the page list returned when no query is given. */
export async function getDocsIndex(docsUrl: string): Promise<string> {
	return fetchCached(`${docsUrl}/llms.txt`)
}

/**
 * Search the docs and return a formatted, LLM-friendly answer: the top matching
 * sections, each with its source link. Falls back to a clear "nothing matched"
 * note pointing at the index.
 */
export async function searchDocs(docsUrl: string, query: string, limit: number): Promise<string> {
	const full = await fetchCached(`${docsUrl}/llms-full.txt`)
	const matches = rankSections(full, query, limit)

	if (matches.length === 0) {
		return (
			`No documentation section matched "${query}". ` +
			'Call search_docs with no query to list every available page, then read the relevant one.'
		)
	}

	const blocks = matches.map((m) => `## ${m.title || 'Untitled'}\n\n${clampSection(m.body)}`)
	return `Top ${matches.length} documentation section(s) for "${query}":\n\n${blocks.join('\n\n---\n\n')}`
}
