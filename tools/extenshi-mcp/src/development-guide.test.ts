import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type buildDevelopmentGuide, DEVELOPMENT_SERVICES, type GuideTool } from './development-guide.js'
import { type Capability, getServerInstructions, registerTools } from './tools.js'

vi.mock('./telemetry.js', async (original) => ({
	...(await original<typeof import('./telemetry.js')>()),
	captureEvent: vi.fn(),
	captureError: vi.fn(),
}))

interface RegisteredTool extends GuideTool {
	execute: (args: unknown, ctx: unknown) => Promise<string>
}

function register(capabilities: Capability[]) {
	const tools: RegisteredTool[] = []
	const getBff = vi.fn(() => {
		throw new Error('Guide must not access the account')
	})
	const requireApiKey = vi.fn(() => {
		throw new Error('Guide must not require credentials')
	})
	registerTools(
		{ addTool: (tool: RegisteredTool) => tools.push(tool) } as unknown as Parameters<typeof registerTools>[0],
		{
			cfg: { bffUrl: 'https://bff.test', scanUrl: 'https://scan.test', docsUrl: 'https://docs.test' },
			capabilities: new Set(capabilities),
			getBff,
			requireApiKey,
		},
	)
	return { tools, getBff, requireApiKey }
}

const repoRoot = resolve(__dirname, '../../..')
const inMonorepo = existsSync(resolve(repoRoot, 'shared-types/dev-projects.ts'))

async function readGuide(tools: RegisteredTool[]): Promise<ReturnType<typeof buildDevelopmentGuide>> {
	const tool = tools.find((tool) => tool.name === 'get_development_guide')
	if (!tool) throw new Error('Development guide was not registered')
	return JSON.parse(await tool.execute({}, {}))
}

afterEach(() => vi.unstubAllGlobals())

describe('development guide discovery contract', () => {
	it.each([['docs'], ['read', 'docs'], ['read', 'docs', 'scan', 'publish']] as Capability[][])(
		'reports exactly the registered tools for %j without account/network access',
		async (...capabilities) => {
			const fetch = vi.fn(() => {
				throw new Error('Guide must work offline')
			})
			vi.stubGlobal('fetch', fetch)
			const { tools, getBff, requireApiKey } = register(capabilities)
			const result = await readGuide(tools)
			expect(result.tools.map((tool: GuideTool) => tool.name)).toEqual(tools.map((tool) => tool.name))
			for (const action of result.localActions) {
				expect(action.availableInThisConnection).toBe(tools.some((tool) => tool.name === action.name))
				expect(action.fallback).toContain('npx @extenshi/cli@latest')
			}
			for (const service of result.services) {
				expect(
					service.toolsInThisConnection.every((name: string) => tools.some((tool) => tool.name === name)),
				).toBe(true)
			}
			expect(getBff).not.toHaveBeenCalled()
			expect(requireApiKey).not.toHaveBeenCalled()
			expect(fetch).not.toHaveBeenCalled()
		},
	)

	it('covers every registered tool in the service directory', () => {
		const { tools } = register(['read', 'docs', 'scan', 'publish'])
		const mapped = new Set(DEVELOPMENT_SERVICES.flatMap((service) => [...service.tools]))
		expect([...mapped].sort()).toEqual(tools.map((tool) => tool.name).sort())
	})

	it.skipIf(!inMonorepo)('covers cabinet tools with existing documentation and route targets', () => {
		const source = readFileSync(resolve(repoRoot, 'shared-types/dev-projects.ts'), 'utf8')
		const registry = source.split('export const DEV_PROJECT_TOOL_KEYS = [')[1].split('] as const')[0]
		const keys = [...registry.matchAll(/^\s*'([^']+)'/gm)].map((match) => match[1])
		expect(keys.length).toBeGreaterThan(0)
		const urls = DEVELOPMENT_SERVICES.flatMap((service) => [...service.urls])
		for (const key of keys) {
			expect(urls).toContain(`https://dojo.extenshi.io/tools/${key}`)
		}
		for (const url of urls) {
			const parsed = new URL(url)
			const workspace =
				parsed.hostname === 'docs.extenshi.io'
					? 'docs'
					: parsed.hostname === 'dojo.extenshi.io'
						? 'dojo'
						: null
			if (!workspace) continue
			const route = resolve(__dirname, '../../..', workspace, `src/app${parsed.pathname}`)
			expect(existsSync(`${route}/page.mdx`) || existsSync(`${route}/page.tsx`), url).toBe(true)
		}
	})

	it.skipIf(!inMonorepo)('keeps public reference tables complete as the registry grows', () => {
		const { tools } = register(['read', 'docs', 'scan', 'publish'])
		for (const file of ['docs/src/app/developers/mcp/page.mdx', 'tools/extenshi-mcp/README.md']) {
			const text = readFileSync(resolve(__dirname, '../../..', file), 'utf8')
			const documented = new Set([...text.matchAll(/^\| `([a-z_]+)` \|/gm)].map((match) => match[1]))
			expect([...documented].sort(), file).toEqual(tools.map((tool) => tool.name).sort())
		}
	})

	it('preserves mutation hints and docs links in the discovery result', async () => {
		const { tools } = register(['read', 'docs'])
		const result = await readGuide(tools)
		expect(
			result.tools.find((tool: GuideTool) => tool.name === 'publish_privacy_policy')?.annotations
				.readOnlyHint,
		).toBe(false)
		for (const tool of result.tools) expect(tool.docs.length, tool.name).toBeGreaterThan(0)
		expect(result.workflow.at(-1)?.id).toBe('operate')
		expect(result.repository.recommendation).toContain('GitHub')
	})

	it('initialize guidance distinguishes hosted operations from local artifact actions', () => {
		const remote = getServerInstructions(new Set(['read', 'docs']))
		const local = getServerInstructions(new Set(['read', 'docs', 'scan', 'publish']))
		expect(remote).toContain('get_development_guide')
		expect(remote).toContain('no local artifact scan or store-publishing tool')
		expect(local).toContain('exposes scan_extension and publish_extension')
	})
})
