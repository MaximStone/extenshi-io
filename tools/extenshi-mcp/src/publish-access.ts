/**
 * Publish-access preflight for the MCP `publish_extension` tool.
 *
 * Mirrors the CLI preflight (tools/extenshi-cli/src/publish-access.ts): one call
 * to the catalog BFF evaluates the `publish-access` PostHog flag and gates the
 * in-testing publish beta to specific developers / extensions. Publishing is
 * otherwise fully local.
 *
 * Fail-OPEN: any transport error resolves to `{ allowed: true }` so an Extenshi
 * outage never blocks a release; only a definitive server `allowed:false` blocks.
 */

export interface PublishAccessRequest {
	bffUrl: string
	apiKey: string | null
	storeIds: Partial<Record<'chrome' | 'firefox' | 'edge', string>>
	extensionId?: number
	timeoutMs?: number
}

export interface PublishAccessResult {
	allowed: boolean
	message?: string
}

const FALLBACK_DENIED_MESSAGE =
	"Publishing is in an active testing phase and isn't available for your account yet. " +
	'Access is currently limited to selected developers and extensions. ' +
	'Request early access at https://dojo.extenshi.io/tools/publish'

export async function checkPublishAccess(req: PublishAccessRequest): Promise<PublishAccessResult> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 5000)
	try {
		const res = await fetch(`${req.bffUrl}/cli/publish/access`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(req.apiKey ? { Authorization: `Bearer ${req.apiKey}` } : {}),
			},
			body: JSON.stringify({ storeIds: req.storeIds, extensionId: req.extensionId }),
			signal: controller.signal,
		})
		if (!res.ok) return { allowed: true }

		const data = (await res.json()) as { allowed?: boolean; message?: string }
		if (data.allowed === false) {
			return { allowed: false, message: data.message ?? FALLBACK_DENIED_MESSAGE }
		}
		return { allowed: true }
	} catch {
		return { allowed: true }
	} finally {
		clearTimeout(timer)
	}
}
