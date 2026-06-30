import os from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { classifyError, flagsFromArgv, redactText, telemetryEnabled } from './telemetry.js'

const SAVED = { ...process.env }

beforeEach(() => {
	process.env = { ...SAVED }
	delete process.env.DO_NOT_TRACK
	delete process.env.EXTENSHI_TELEMETRY
	delete process.env.CI
})

afterEach(() => {
	process.env = { ...SAVED }
})

describe('telemetryEnabled', () => {
	it('is enabled by default — the shared-project key is embedded', () => {
		delete process.env.EXTENSHI_POSTHOG_KEY
		expect(telemetryEnabled()).toBe(true)
	})

	it('stays enabled with an explicit key override and no opt-out signals', () => {
		process.env.EXTENSHI_POSTHOG_KEY = 'phc_test'
		expect(telemetryEnabled()).toBe(true)
	})

	it('honors DO_NOT_TRACK=1', () => {
		process.env.EXTENSHI_POSTHOG_KEY = 'phc_test'
		process.env.DO_NOT_TRACK = '1'
		expect(telemetryEnabled()).toBe(false)
	})

	it('honors EXTENSHI_TELEMETRY=0 / false / off', () => {
		process.env.EXTENSHI_POSTHOG_KEY = 'phc_test'
		for (const v of ['0', 'false', 'off', 'no']) {
			process.env.EXTENSHI_TELEMETRY = v
			expect(telemetryEnabled()).toBe(false)
		}
	})
})

describe('classifyError (MCP ScanError carries a numeric status)', () => {
	it('maps a numeric status', () => {
		expect(classifyError({ status: 401 })).toBe('auth')
		expect(classifyError({ status: 402 })).toBe('quota')
		expect(classifyError({ status: 429 })).toBe('rate_limit')
		expect(classifyError({ status: 503 })).toBe('api_5xx')
		expect(classifyError({ status: 422 })).toBe('api_4xx')
	})

	it('falls back to message patterns', () => {
		expect(classifyError(new Error('fetch failed'))).toBe('network')
		expect(classifyError(new Error('something weird'))).toBe('unexpected')
	})
})

describe('flagsFromArgv', () => {
	it('never leaks flag values', () => {
		expect(flagsFromArgv(['--api-url', 'https://secret/y', '--json'])).toEqual(['--api-url', '--json'])
	})
})

describe('redactText', () => {
	it('strips absolute home paths', () => {
		const home = os.homedir()
		expect(redactText(`oops ${home}/proj`)).not.toContain(home)
		expect(redactText('at /Users/alice/x and /home/bob/y')).toBe('at ~/x and ~/y')
	})
})
