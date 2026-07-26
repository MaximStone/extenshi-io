/**
 * Static content for the free `generate_welcome_page_workflow` MCP tool.
 *
 * Like `generate_icon_workflow`, this path deliberately spends ZERO Extenshi
 * credits and touches no Extenshi infrastructure: the brief is a pure function
 * of its arguments, so the tool works offline and can never fail on a docs or
 * BFF outage. An agent connected through the MCP connector gets the exact
 * requirements — what to illustrate, how to annotate, what JSON to emit —
 * instead of guessing them.
 *
 * The brief itself lives in ./welcome-agent-brief.ts, a byte-identical copy of
 * shared-types/welcome-agent-brief.ts. That sync is what guarantees the spec an
 * agent is handed here is the same spec catalog-bff enforces on save.
 *
 * Store screenshots are NOT fetched here: that would need a catalog read (an
 * API key and a credit) and would turn a free tool into a paid one. An agent
 * that wants them calls `get_extension` and passes the URLs back in via
 * `store_screenshots`.
 */

import { buildWelcomeAgentBrief, isWelcomeGoal, type WelcomeGoal } from './welcome-agent-brief.js'

export const CONSTRUCTOR_URL = 'https://dojo.extenshi.io/tools/onboarding-page'

export interface WelcomeWorkflowArgs {
	extensionName?: string
	goal?: string
	whatItDoes?: string
	targetSite?: string
	storeScreenshots?: string[]
	existingSteps?: string[]
	accentColor?: string
}

export function renderWelcomeWorkflow(args: WelcomeWorkflowArgs): string {
	// An unrecognised goal falls back to the ~90% case rather than erroring: a
	// slightly-wrong preset still produces a usable brief, and a hard failure
	// here would strand the agent with nothing.
	const goal: WelcomeGoal = isWelcomeGoal(args.goal) ? args.goal : 'PIN_EXTENSION'

	const brief = buildWelcomeAgentBrief({
		extensionName: args.extensionName ?? '',
		goal,
		whatItDoes: args.whatItDoes,
		targetSite: args.targetSite,
		storeScreenshots: args.storeScreenshots,
		existingSteps: args.existingSteps,
		accentColor: args.accentColor,
		constructorUrl: CONSTRUCTOR_URL,
	})

	return [
		brief,
		'',
		'---',
		'',
		'## How this page gets published',
		'',
		'The author does not have to host anything. Saving in the constructor publishes the page at',
		'`welcome.extenshi.io/{extensionId}/{slug}` and produces a `chrome.runtime.onInstalled`',
		'snippet that opens it once on first install (never on update) and counts confirmed installs',
		'by version and browser.',
		'',
		'If the author would rather host the page themselves, they can set their own URL in the',
		'constructor instead — the generated snippet then opens their page and fires a separate',
		'permission-free beacon, so the install counter keeps working either way. In that case the',
		'block JSON above is still worth producing: it is the content spec for their own page.',
	].join('\n')
}
