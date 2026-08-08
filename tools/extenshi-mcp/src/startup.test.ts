import { describe, expect, it, vi } from 'vitest'
import { reportServerStarted, SERVER_STARTED_EVENT, serverStartedProperties } from './startup.js'

describe('SERVER_STARTED_EVENT', () => {
	it('is the exact string PostHog queries key on', () => {
		// Asserting the symbol elsewhere in this file only pins emitter-to-test
		// agreement: an IDE rename would move both and stay green while every
		// saved insight, funnel and dashboard filtering on the old name silently
		// went to zero. The literal is the part that is load-bearing outside the
		// repo, so it is pinned here rather than inferred.
		expect(SERVER_STARTED_EVENT).toBe('mcp_server_started')
	})
})

describe('serverStartedProperties', () => {
	it('reports whether a key is configured, never the key itself', () => {
		const props = serverStartedProperties('ek_super_secret_value')
		expect(props).toEqual({ has_api_key: true })
		// The guarantee that matters: no property carries the key's value.
		expect(JSON.stringify(props)).not.toContain('ek_')
	})

	it('treats a missing or empty key as unconfigured', () => {
		expect(serverStartedProperties(null)).toEqual({ has_api_key: false })
		expect(serverStartedProperties(undefined)).toEqual({ has_api_key: false })
		expect(serverStartedProperties('')).toEqual({ has_api_key: false })
	})
})

describe('reportServerStarted', () => {
	it('emits exactly one event, under the exported name', () => {
		const capture = vi.fn()
		reportServerStarted('ek_live', capture)
		expect(capture).toHaveBeenCalledTimes(1)
		expect(capture).toHaveBeenCalledWith(SERVER_STARTED_EVENT, { has_api_key: true })
	})

	it('still reports a server that started without a key', () => {
		const capture = vi.fn()
		reportServerStarted(null, capture)
		// A keyless server is precisely the case the funnel needs to see — it is
		// a started server that no tool can serve, so it must not be dropped.
		expect(capture).toHaveBeenCalledWith(SERVER_STARTED_EVENT, { has_api_key: false })
	})

	it('never throws into startup when the sink fails', () => {
		const capture = vi.fn(() => {
			throw new Error('posthog exploded')
		})
		expect(() => reportServerStarted('ek_live', capture)).not.toThrow()
	})
})
