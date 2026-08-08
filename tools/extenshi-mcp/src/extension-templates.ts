/**
 * Extension templates — the "what kind of extension is this?" taxonomy.
 *
 * A template is not a folder of files to copy. It is a small set of claims
 * about the extension's shape: which manifest components it cannot work
 * without, which permissions those components force, and which files the
 * scaffold has to write so the manifest does not point at something that isn't
 * there. Everything downstream — the picker in the manifest generator, the
 * locked checkboxes, the scaffolded file set, and (next phase) the MCP tool
 * that hands this catalog to a developer's own agent — reads THIS module.
 *
 * It lives in shared-types rather than in dojo because the readers span
 * packages: the website, catalog-bff (answering a developer's own agent), and
 * the published `@extenshi/mcp` package, whose tool tells an agent what kinds of
 * extension exist and what each costs in permissions. All three must give the
 * same answer.
 *
 * SELF-CONTAINED ON PURPOSE — no imports, so it can be copied verbatim into
 * `@extenshi/mcp`, which cannot depend on unpublished workspace packages (same
 * constraint and same solution as welcome-agent-brief.ts).
 *
 * SINGLE SOURCE, TWO COPIES, byte-identical:
 *   shared-types/extension-templates.ts            ← canonical
 *   tools/extenshi-mcp/src/extension-templates.ts  ← copy, pinned by a test
 * Edit the canonical file and copy it over; the sync test in the MCP package
 * fails on any divergence inside the monorepo and skips in the npm tarball.
 *
 * Templates COMBINE. A side panel with a content script is one extension with
 * two capabilities, not a fifth template — the picker is multi-select and every
 * helper here takes a list and unions the result. That is why requirements are
 * expressed as components + permissions rather than as whole manifests.
 */

export const EXTENSION_TEMPLATE_IDS = ['popup', 'sidepanel', 'content', 'overlay'] as const
export type ExtensionTemplateId = (typeof EXTENSION_TEMPLATE_IDS)[number]

/**
 * The template applied when a project has never picked one.
 *
 * `popup` is deliberately the same shape the scaffold produced before templates
 * existed, so an old project regenerates byte-for-byte what it did yesterday.
 */
export const DEFAULT_EXTENSION_TEMPLATE: ExtensionTemplateId = 'popup'

/**
 * Manifest components a template can require.
 *
 * These are the things the UI can lock: a side-panel extension whose
 * `side_panel` key is turned off is not a side-panel extension, it is a broken
 * one. Each maps to a group of fields in the manifest draft.
 */
export const EXTENSION_TEMPLATE_COMPONENTS = ['action', 'sidePanel', 'contentScript'] as const
export type ExtensionTemplateComponent = (typeof EXTENSION_TEMPLATE_COMPONENTS)[number]

/** Where scaffolded source goes, so the manifest and the file writer agree. */
export const EXTENSION_TEMPLATE_SOURCE_DIR = 'src'

/**
 * The background service worker every template gets, template or not.
 *
 * It is not part of any one template because it carries the integration the
 * whole product is built around: `setUninstallURL` must be registered at
 * startup, and a template that skipped the background script would silently
 * ship an extension that can never report why someone uninstalled it.
 */
export const EXTENSION_BACKGROUND_PATH = `${EXTENSION_TEMPLATE_SOURCE_DIR}/background.js`

export interface ExtensionTemplate {
	id: ExtensionTemplateId
	label: string
	/** One line on the picker card: what this kind of extension is for. */
	summary: string
	/** Components locked on while this template is selected. */
	requires: readonly ExtensionTemplateComponent[]
	/**
	 * Permissions the manifest cannot drop while this template is selected.
	 *
	 * Chromium vocabulary. Firefox reaches the same capability through a
	 * different manifest key and needs no permission for it (`sidebar_action`
	 * instead of `sidePanel` + `side_panel`), so a per-browser manifest builder
	 * is expected to translate rather than to emit these verbatim.
	 */
	requiredPermissions: readonly string[]
	/** Pre-ticked because the template usually needs them — always removable. */
	recommendedPermissions: readonly string[]
	/** Repo-relative file the required component points at. */
	entry: string
	/** Every file the scaffold writes for this template, `entry` included. */
	emits: readonly string[]
	/** Seed match patterns, for the templates whose component is a content script. */
	defaultMatches?: readonly string[]
}

export const EXTENSION_TEMPLATE_CATALOG: readonly ExtensionTemplate[] = [
	{
		id: 'popup',
		label: 'Popup',
		summary: 'Opens a small window from the toolbar icon. The default shape for a self-contained tool.',
		requires: ['action'],
		// A popup needs nothing. Saying so is the point: our own store-compliance
		// advice is "ask for the minimum", and a starter that pads the manifest to
		// look substantial teaches the opposite on day one.
		requiredPermissions: [],
		recommendedPermissions: ['storage'],
		entry: `${EXTENSION_TEMPLATE_SOURCE_DIR}/popup.html`,
		emits: [`${EXTENSION_TEMPLATE_SOURCE_DIR}/popup.html`],
	},
	{
		id: 'sidepanel',
		label: 'Side panel',
		summary: 'Opens a panel docked beside the page, which stays open while the user browses.',
		requires: ['sidePanel', 'action'],
		requiredPermissions: ['sidePanel'],
		recommendedPermissions: [],
		entry: `${EXTENSION_TEMPLATE_SOURCE_DIR}/sidepanel.html`,
		emits: [
			`${EXTENSION_TEMPLATE_SOURCE_DIR}/sidepanel.html`,
			`${EXTENSION_TEMPLATE_SOURCE_DIR}/sidepanel.js`,
		],
	},
	{
		id: 'content',
		label: 'Page enhancer',
		summary: 'Runs inside specific sites you list and changes what is already on the page.',
		requires: ['contentScript'],
		requiredPermissions: [],
		recommendedPermissions: [],
		entry: `${EXTENSION_TEMPLATE_SOURCE_DIR}/content.js`,
		emits: [`${EXTENSION_TEMPLATE_SOURCE_DIR}/content.js`],
		defaultMatches: ['https://example.com/*'],
	},
	{
		id: 'overlay',
		label: 'In-page assistant',
		summary: 'Adds your own UI on top of any site — a form filler, a password helper, a clipper.',
		requires: ['contentScript'],
		requiredPermissions: [],
		// An assistant that cannot remember anything between pages is a demo, so
		// storage is ticked — but it stays removable, because an overlay that only
		// reformats what is on screen genuinely does not need it.
		recommendedPermissions: ['storage'],
		entry: `${EXTENSION_TEMPLATE_SOURCE_DIR}/overlay.js`,
		emits: [`${EXTENSION_TEMPLATE_SOURCE_DIR}/overlay.js`],
		defaultMatches: ['<all_urls>'],
	},
]

const BY_ID = new Map<ExtensionTemplateId, ExtensionTemplate>(
	EXTENSION_TEMPLATE_CATALOG.map((t) => [t.id, t]),
)

export function isExtensionTemplateId(value: unknown): value is ExtensionTemplateId {
	return typeof value === 'string' && BY_ID.has(value as ExtensionTemplateId)
}

export function getExtensionTemplate(id: ExtensionTemplateId): ExtensionTemplate {
	const template = BY_ID.get(id)
	// Unreachable through the type, but this module is also read from persisted
	// JSON — throwing here beats returning undefined into a manifest builder.
	if (!template) throw new Error(`Unknown extension template: ${id}`)
	return template
}

/**
 * Clean a persisted or client-supplied list into templates we know.
 *
 * Saved tool state is free-form JSON written by whatever build was live at the
 * time, so an unknown id is expected rather than exceptional: it is dropped,
 * not thrown on. Order follows the catalog so two projects that picked the same
 * set produce the same manifest, and duplicates collapse.
 */
export function normalizeExtensionTemplates(value: unknown): ExtensionTemplateId[] {
	if (!Array.isArray(value)) return []
	const picked = new Set(value.filter(isExtensionTemplateId))
	return EXTENSION_TEMPLATE_CATALOG.filter((t) => picked.has(t.id)).map((t) => t.id)
}

/** The selection to build with: what was picked, or the default when nothing was. */
export function effectiveExtensionTemplates(value: unknown): ExtensionTemplateId[] {
	const templates = normalizeExtensionTemplates(value)
	return templates.length ? templates : [DEFAULT_EXTENSION_TEMPLATE]
}

function unionOf(
	ids: readonly ExtensionTemplateId[],
	pick: (t: ExtensionTemplate) => readonly string[],
): string[] {
	const out: string[] = []
	for (const id of ids) {
		for (const value of pick(getExtensionTemplate(id))) {
			if (!out.includes(value)) out.push(value)
		}
	}
	return out
}

/** Permissions the selection forces into the manifest (locked in the UI). */
export function extensionTemplateRequiredPermissions(ids: readonly ExtensionTemplateId[]): string[] {
	return unionOf(ids, (t) => t.requiredPermissions)
}

/** Permissions ticked when a template is picked, minus the ones already forced. */
export function extensionTemplateRecommendedPermissions(ids: readonly ExtensionTemplateId[]): string[] {
	const required = extensionTemplateRequiredPermissions(ids)
	return unionOf(ids, (t) => t.recommendedPermissions).filter((p) => !required.includes(p))
}

/** Components the selection locks on. */
export function extensionTemplateComponents(
	ids: readonly ExtensionTemplateId[],
): ExtensionTemplateComponent[] {
	const out: ExtensionTemplateComponent[] = []
	for (const id of ids) {
		for (const component of getExtensionTemplate(id).requires) {
			if (!out.includes(component)) out.push(component)
		}
	}
	return out
}

/** Templates whose component is a content script, in catalog order. */
export function extensionTemplatesWithContentScripts(
	ids: readonly ExtensionTemplateId[],
): ExtensionTemplate[] {
	return ids.map(getExtensionTemplate).filter((t) => t.requires.includes('contentScript'))
}

/** Every file the scaffold writes for a selection, background script included. */
export function extensionTemplateFiles(ids: readonly ExtensionTemplateId[]): string[] {
	return [EXTENSION_BACKGROUND_PATH, ...unionOf(ids, (t) => t.emits)]
}
