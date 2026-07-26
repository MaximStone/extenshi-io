/**
 * Welcome-page goal presets + the AI-agent brief.
 *
 * SELF-CONTAINED ON PURPOSE — no imports, so it can be copied verbatim into the
 * published `@extenshi/mcp` package, which cannot depend on unpublished
 * workspace packages (same constraint and same solution as svg-scrub.ts).
 *
 * SINGLE SOURCE, TWO COPIES, byte-identical:
 *   shared-types/welcome-agent-brief.ts          (canonical — edit here)
 *   tools/extenshi-mcp/src/welcome-agent-brief.ts (synced copy for @extenshi/mcp)
 * after editing, run:
 *   cp shared-types/welcome-agent-brief.ts tools/extenshi-mcp/src/welcome-agent-brief.ts
 * A test in tools/extenshi-mcp/src/welcome-workflow.test.ts fails CI on drift.
 *
 * Why the sync is load-bearing rather than tidy: the brief tells an agent what
 * to build AND states the limits the save path enforces. If the MCP copy drifts,
 * an agent produces blocks against one spec and catalog-bff rejects them against
 * another — and the author sees a validation error for work they were told to do.
 */

// ── Caps (mirrored by the zod schemas in catalog-bff/src/lib/welcome-blocks.ts) ──

export const WELCOME_MAX_BLOCKS = 14
export const WELCOME_MAX_ANNOTATIONS = 8
export const WELCOME_TEXT_MAX_LEN = 600
export const WELCOME_TITLE_MAX_LEN = 120
export const WELCOME_ALT_MAX_LEN = 200
/** Inline SVG cap — an instructional diagram, not an embedded illustration set. */
export const WELCOME_SVG_MAX_LEN = 24_000
export const WELCOME_UPLOAD_MAX_BYTES = 2 * 1024 * 1024
export const WELCOME_DEFAULT_ACCENT = '#5e5ce6'

// ── Goal — what the page is trying to make the user DO ──────────────────────

/**
 * A welcome page exists to drive exactly one action. Naming that action is the
 * single highest-leverage input to both the default copy and the agent brief:
 * in ~90% of extensions the valuable action is "find and pin the extension",
 * but a new-tab replacement instead needs the user to accept the override, and
 * a content-script widget needs them to visit the target site and spot it.
 */
export type WelcomeGoal = 'PIN_EXTENSION' | 'NEW_TAB_OPT_IN' | 'VISIT_SITE' | 'CUSTOM'

export interface WelcomeGoalPreset {
	goal: WelcomeGoal
	label: string
	/** One-line description of the action, shown in the constructor. */
	summary: string
	defaultHeadline: string
	defaultMessage: string
	/** Starting checklist — the author edits these, they are not fixed. */
	defaultSteps: string[]
	/**
	 * What an illustration for this goal must actually show. Fed verbatim into
	 * the agent brief, so it has to describe pixels, not intent.
	 */
	illustrationTargets: string[]
}

export const WELCOME_GOAL_PRESETS: Record<WelcomeGoal, WelcomeGoalPreset> = {
	PIN_EXTENSION: {
		goal: 'PIN_EXTENSION',
		label: 'Pin the extension',
		summary: 'Get the user to find the extension in the toolbar puzzle menu and pin it.',
		defaultHeadline: "You're all set — pin it so it's always one click away",
		defaultMessage:
			'Chrome hides new extensions behind the puzzle icon. Pinning takes five seconds and means you never have to hunt for it again.',
		defaultSteps: [
			'Click the puzzle icon in the top-right of the browser toolbar',
			'Find this extension in the list that opens',
			'Click the pin icon next to it so it stays in the toolbar',
			'The icon now sits in your toolbar — click it any time to start',
		],
		illustrationTargets: [
			'The browser toolbar with the puzzle (Extensions) icon highlighted in the top-right.',
			"The open extensions dropdown with this extension's row highlighted.",
			'The same dropdown with the pin toggle beside that row highlighted.',
			'The toolbar after pinning, with the extension icon now visible next to the address bar.',
		],
	},
	NEW_TAB_OPT_IN: {
		goal: 'NEW_TAB_OPT_IN',
		label: 'Keep the new-tab change',
		summary: 'Get the user to accept the new-tab override prompt instead of reverting it.',
		defaultHeadline: 'One last step — keep your new tab',
		defaultMessage:
			'Your browser will ask whether to keep the new-tab page. Choose "Keep it" and the extension is ready to use.',
		defaultSteps: [
			'Open a new tab',
			'Your browser shows a "change back?" prompt in the top-right',
			'Click "Keep it" to confirm the new-tab page',
			'Open a new tab again to see it live',
		],
		illustrationTargets: [
			'A fresh browser window with the new-tab change confirmation dialog visible.',
			'The same dialog with the "Keep it" button highlighted.',
			'The new tab page rendering the extension after confirmation.',
		],
	},
	VISIT_SITE: {
		goal: 'VISIT_SITE',
		label: 'Use it on a site',
		summary: 'Send the user to the site where the extension injects its widget, and show them the widget.',
		defaultHeadline: "You're installed — here's where to find it",
		defaultMessage:
			'This extension works directly on the pages you already use. Open a supported page and the controls appear automatically.',
		defaultSteps: [
			'Open a supported page in a new tab',
			'Wait a second for the page to finish loading',
			'Look for the extension panel added to the page',
			'Click it to run the extension on that page',
		],
		illustrationTargets: [
			'The target website as it normally looks, before the extension acts.',
			'The same page with the injected extension widget highlighted in place.',
			'The widget expanded, showing the extension actually doing its job.',
		],
	},
	CUSTOM: {
		goal: 'CUSTOM',
		label: 'Something else',
		summary: 'Describe your own primary action; nothing is pre-filled.',
		defaultHeadline: '',
		defaultMessage: '',
		defaultSteps: [],
		illustrationTargets: [],
	},
}

export const WELCOME_GOALS: WelcomeGoal[] = ['PIN_EXTENSION', 'NEW_TAB_OPT_IN', 'VISIT_SITE', 'CUSTOM']

export function isWelcomeGoal(v: unknown): v is WelcomeGoal {
	return typeof v === 'string' && (WELCOME_GOALS as string[]).includes(v)
}

// ── The brief ───────────────────────────────────────────────────────────────

export interface WelcomeAgentBriefInput {
	extensionName: string
	goal: WelcomeGoal
	/** Free-text description of what the extension actually does. */
	whatItDoes?: string | null
	/** Site the extension acts on — required to make VISIT_SITE illustrations concrete. */
	targetSite?: string | null
	/** Store screenshot URLs we already host, offered to the agent as raw material. */
	storeScreenshots?: string[]
	/** Steps the author has already written, if any. */
	existingSteps?: string[]
	accentColor?: string
	/** Where the finished blocks get pasted back. */
	constructorUrl?: string
}

/**
 * Render the brief that tells a coding/design agent what to produce for this
 * welcome page.
 *
 * This is the tool's real job. An author who opens the constructor knows what
 * their extension does but not what a good welcome page contains; an agent can
 * draw and annotate but does not know the goal, the store assets we already
 * hold, or the block JSON it must emit. The brief is the contract between them,
 * so it states all three — and it is a pure function of the config (no network,
 * no key, no credits) so both dojo and the MCP server can render it.
 */
export function buildWelcomeAgentBrief(input: WelcomeAgentBriefInput): string {
	const preset = WELCOME_GOAL_PRESETS[input.goal] ?? WELCOME_GOAL_PRESETS.PIN_EXTENSION
	const name = input.extensionName.trim() || 'the extension'
	const accent = input.accentColor || WELCOME_DEFAULT_ACCENT
	const shots = input.storeScreenshots ?? []
	const steps = (input.existingSteps ?? []).filter((s) => s.trim())

	const out: string[] = []

	out.push(`# Welcome-page illustrations for "${name}"`)
	out.push('')
	out.push(
		'You are producing the visual, step-by-step content for the page a user lands on the',
		'moment they install this browser extension. Everything you make here gets pasted back',
		'into the Extenshi welcome-page constructor as blocks — so produce the assets AND the',
		'block JSON at the end.',
		'',
	)

	out.push('## The one action this page must drive')
	out.push('')
	out.push(`**${preset.label}** — ${preset.summary}`)
	out.push('')
	out.push(
		'A welcome page that explains everything drives nothing. Every block you write must',
		'serve that single action; cut anything that does not.',
		'',
	)

	if (input.whatItDoes?.trim()) {
		out.push('## What the extension does')
		out.push('')
		out.push(input.whatItDoes.trim())
		out.push('')
	}

	if (input.goal === 'VISIT_SITE') {
		out.push('## Target site')
		out.push('')
		out.push(
			input.targetSite?.trim()
				? `The extension acts on: ${input.targetSite.trim()}. Illustrations must show that real site, not a generic page.`
				: 'No target site was supplied. Ask the developer which site the extension injects into before drawing anything — a generic page teaches the user nothing.',
		)
		out.push('')
	}

	out.push('## Illustrations to produce')
	out.push('')
	if (preset.illustrationTargets.length) {
		out.push('One image per step, in this order:')
		out.push('')
		preset.illustrationTargets.forEach((t, i) => {
			out.push(`${i + 1}. ${t}`)
		})
	} else {
		out.push(
			'No preset applies to this goal. Decide the shortest sequence of images that takes a',
			'brand-new user from "just installed" to having completed the action above, and produce',
			'one image per step.',
		)
	}
	out.push('')

	out.push('### How to get each image')
	out.push('')
	out.push(
		'1. **Screenshot the real thing wherever you can.** Load the extension in a clean browser',
		'   profile, drive it to the exact moment the step describes, and capture the browser',
		'   window. A real screenshot of the actual UI beats a drawing, because the user is',
		'   matching what they see on their own screen against your image.',
		'2. **Crop to the region that matters.** A full 1920px desktop capture renders unreadably',
		'   small in a page column. Crop to the toolbar, the dropdown, or the widget — enough',
		'   surrounding context to locate it, nothing more.',
		'3. **Draw an SVG instead when a screenshot is impossible or ugly** — an OS dialog you',
		'   cannot reliably reproduce, a state that needs three preconditions, or anything with',
		'   personal data in it. A clean vector mock of the browser chrome is better than a',
		'   cluttered real capture.',
		'',
	)

	if (shots.length) {
		out.push('### Screenshots we already host')
		out.push('')
		out.push(
			`This extension has ${shots.length} store screenshot${shots.length === 1 ? '' : 's'} already`,
			'mirrored on our storage. They are approved store assets and can be dropped straight into',
			'a block with `"source": "store"` and the URL as-is — no upload step:',
			'',
		)
		for (const u of shots.slice(0, 10)) {
			out.push(`- ${u}`)
		}
		out.push('')
		out.push(
			'Use these for "what the extension looks like / what it does" blocks. They are marketing',
			'captures, so they usually will NOT show the install steps — draw or capture those yourself.',
			'',
		)
	}

	out.push('## Annotating: show exactly where to click')
	out.push('')
	out.push(
		'An un-annotated screenshot makes the user hunt. Every image that has a click target must',
		'carry a marker on it. Do NOT burn arrows into the image pixels — the constructor draws',
		'markers as an overlay, so they stay crisp, stay translatable, and can be moved later.',
		'',
		'Give each marker as a percentage of the image box:',
		'',
		'- `kind: "number"` — a numbered badge on the thing to click. Use when the step is one of',
		'  an ordered sequence, which is the common case.',
		'- `kind: "arrow"` — a pointer with an `angle` in degrees clockwise from pointing right',
		'  (0 = →, 90 = ↓, 180 = ←, 270 = ↑). Use when the target is small or near an edge and a',
		'  badge would cover it.',
		"- `x` / `y` are 0–100 percentages of the image's own width/height, measured to the CENTRE",
		'  of the target. Percentages, not pixels: the page is responsive and the author may swap',
		'  in a re-captured screenshot at a different resolution.',
		`- At most ${WELCOME_MAX_ANNOTATIONS} markers per image. If you need more, the image is doing`,
		'  too much — split it into two steps.',
		'',
	)

	out.push('## Constraints that will be enforced on save')
	out.push('')
	out.push(
		`- At most ${WELCOME_MAX_BLOCKS} blocks total.`,
		`- Step titles ≤ ${WELCOME_TITLE_MAX_LEN} chars; body text ≤ ${WELCOME_TEXT_MAX_LEN} chars.`,
		`- Every image needs \`alt\` text (≤ ${WELCOME_ALT_MAX_LEN} chars) describing what is shown —`,
		'  it is what a screen-reader user gets instead of your illustration.',
		`- SVG: a single \`<svg>\` element, ≤ ${WELCOME_SVG_MAX_LEN} chars, flat shapes only. Scripts,`,
		'  event handlers, `<foreignObject>`, external references and embedded rasters are stripped',
		'  by the server sanitizer — if you rely on them the image will render broken, so do not',
		'  use them.',
		`- Uploads: PNG / JPEG / WebP only, ≤ ${Math.round(WELCOME_UPLOAD_MAX_BYTES / 1024 / 1024)} MB each.`,
		`- Accent colour for this page is \`${accent}\` — match it in drawn illustrations so the page`,
		'  reads as one design.',
		'',
	)

	if (steps.length) {
		out.push('## Steps the author already wrote')
		out.push('')
		out.push('Keep their wording and intent; you are adding the visuals, not rewriting the page:')
		out.push('')
		steps.forEach((s, i) => {
			out.push(`${i + 1}. ${s}`)
		})
		out.push('')
	}

	out.push('## What to hand back')
	out.push('')
	out.push('A JSON array of blocks in this exact shape:')
	out.push('')
	out.push('```json')
	out.push(
		JSON.stringify(
			[
				{
					kind: 'step',
					id: 'step-1',
					title: preset.defaultSteps[0] ?? 'First thing the user does',
					body: 'Optional one-sentence elaboration.',
					media: {
						source: 'svg',
						svg: '<svg viewBox="0 0 640 200">…</svg>',
						alt: 'Browser toolbar with the extensions puzzle icon at the top right',
						annotations: [{ x: 92.5, y: 18, kind: 'number', n: 1, label: 'Click here' }],
					},
				},
				{
					kind: 'image',
					id: 'shot-1',
					media: {
						source: 'store',
						url: shots[0] ?? 'https://…/screenshot.png',
						alt: 'The extension panel open on a supported page',
						annotations: [],
					},
					caption: 'What it looks like in use.',
				},
				{ kind: 'text', id: 'outro', title: 'Need help?', body: 'Short closing paragraph.' },
			],
			null,
			2,
		),
	)
	out.push('```')
	out.push('')
	out.push(
		'- `source: "svg"` → put the markup in `svg`, leave `url` unset.',
		'- `source: "store"` → put one of the hosted URLs above in `url`, leave `svg` unset.',
		'- `source: "upload"` → the author uploads the file in the constructor and the URL is filled',
		'  in there; emit the block with an empty `url` and say which local file belongs in it.',
		'- `id` just has to be unique within the page.',
		'',
	)

	out.push('## Then')
	out.push('')
	out.push(
		'1. Save any images you drew or captured as files next to the project so the author can upload them.',
		`2. Open the constructor${input.constructorUrl ? ` — ${input.constructorUrl}` : ''}, paste the block JSON,`,
		'   upload any local images, and check the live preview.',
		'3. Look at the preview at a narrow width too — annotations that read fine on desktop can',
		'   collide on a phone.',
	)

	return out.join('\n')
}
