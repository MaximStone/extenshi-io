import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EXTENSION_TEMPLATE_CATALOG, EXTENSION_TEMPLATE_IDS } from './extension-templates.js'
import { renderExtensionTemplates } from './templates.js'

describe('synced copy of extension-templates', () => {
	// Gate on the shared-types workspace being present, NOT on the file itself:
	// shared-types is absent when this package is extracted standalone (the npm
	// tarball), so there the test skips and is reported as a skip rather than
	// passing vacuously. Inside the monorepo it always runs, so editing the
	// canonical file without copying it here fails instead of silently shipping
	// an agent a different catalog than the website has.
	const sharedTypes = new URL('../../../shared-types/package.json', import.meta.url)
	const inMonorepo = fs.existsSync(sharedTypes)

	it.skipIf(!inMonorepo)('is byte-identical to the canonical shared-types file', () => {
		const canonical = new URL('../../../shared-types/extension-templates.ts', import.meta.url)
		const copy = new URL('./extension-templates.ts', import.meta.url)
		expect(fs.readFileSync(copy, 'utf8')).toBe(fs.readFileSync(canonical, 'utf8'))
	})
})

describe('renderExtensionTemplates', () => {
	it('names every type and the permissions it forces', () => {
		const out = renderExtensionTemplates()
		for (const template of EXTENSION_TEMPLATE_CATALOG) {
			expect(out).toContain(template.label)
			expect(out).toContain(template.id)
			for (const permission of template.requiredPermissions) expect(out).toContain(permission)
		}
	})

	it('says "none" rather than nothing for a type that needs no permissions', () => {
		// Silence would read as "unknown" to an agent, which is the one answer that
		// invites it to add permissions defensively.
		const out = renderExtensionTemplates(['popup'])
		expect(out).toMatch(/Required permissions \(cannot be dropped\): none/)
	})

	it('narrows to the requested types', () => {
		const out = renderExtensionTemplates(['sidepanel'])
		expect(out).toContain('Side panel')
		expect(out).not.toContain('In-page assistant')
	})

	it('ignores ids it does not know instead of failing the call', () => {
		// The argument comes from a language model; an invented id must degrade to
		// the full catalog, not strand the agent with an error.
		const out = renderExtensionTemplates(['teleporter'])
		for (const id of EXTENSION_TEMPLATE_IDS) expect(out).toContain(id)
	})

	it('states the cross-browser side-panel rule, which is the easiest to get wrong', () => {
		const out = renderExtensionTemplates()
		expect(out).toContain('side_panel')
		expect(out).toContain('sidebar_action')
	})

	it('warns that a declared-but-missing file breaks the whole extension', () => {
		// The single most expensive mistake an agent can make here: the browser
		// refuses the package, it does not skip the feature.
		expect(renderExtensionTemplates()).toMatch(/refuse the whole extension/i)
	})

	it('points at the UI and at the per-project tool', () => {
		const out = renderExtensionTemplates()
		expect(out).toContain('https://dojo.extenshi.io/manifest-generator')
		expect(out).toContain('get_project_state')
	})
})
