import { describe, expect, it } from 'vitest'
import { shapeExtension, shapeInstallDialog, shapeSearch, shapeSecurity } from './shape.js'

// Mirrors the `installDialogPreview` shape catalog-api attaches to
// getExtensionById (see shared-types/permission-warnings.ts → InstallDialogPreview).
const preview = {
	chrome: {
		warnings: [
			{
				message: 'Read and change all your data on the websites you visit',
				sources: ['<all_urls>', 'proxy'],
			},
			{ message: 'Read your browsing history', sources: ['tabs'] },
		],
		readsAllData: true,
	},
	firefox: {
		warnings: [{ message: 'Access your data for all websites', sources: ['<all_urls>'] }],
		readsAllData: true,
	},
	silentPermissions: ['storage', 'scripting'],
	unknownPermissions: ['brandNewPermission'],
	excluded: ['bookmarks'],
	consideredCount: 4,
}

describe('shapeInstallDialog', () => {
	it('reduces each browser to readsAllData + human-readable warning lines', () => {
		const out = shapeInstallDialog(preview)
		expect(out?.chrome).toEqual({
			readsAllData: true,
			warnings: ['Read and change all your data on the websites you visit', 'Read your browsing history'],
		})
		expect(out?.firefox).toEqual({
			readsAllData: true,
			warnings: ['Access your data for all websites'],
		})
		expect(out?.silentPermissions).toEqual(['storage', 'scripting'])
		expect(out?.optionalExcluded).toEqual(['bookmarks'])
		expect(out?.unknownPermissions).toEqual(['brandNewPermission'])
	})

	it('drops empty silent/optional lists and returns undefined for non-objects', () => {
		const out = shapeInstallDialog({
			chrome: { warnings: [], readsAllData: false },
			firefox: { warnings: [], readsAllData: false },
			silentPermissions: [],
			excluded: [],
		})
		expect(out?.silentPermissions).toBeUndefined()
		expect(out?.optionalExcluded).toBeUndefined()
		expect(shapeInstallDialog(null)).toBeUndefined()
		expect(shapeInstallDialog('nope')).toBeUndefined()
	})
})

describe('shapeSecurity with install-dialog preview', () => {
	it('surfaces the preview even when the extension was never scanned', () => {
		const out = shapeSecurity(null, null, preview)
		expect(out.scanned).toBe(false)
		expect(out.message).toMatch(/not been scanned/)
		expect(out.installDialogPreview).toBeDefined()
	})

	it('includes the preview alongside scan data (no scanned:false flag)', () => {
		const security = {
			findings: {
				total: 1,
				groupTotal: 1,
				bySeverity: { HIGH: [{ scanner: 'semgrep', severity: 'HIGH', count: 1 }] },
			},
		}
		const out = shapeSecurity(security, null, preview)
		expect(out.findings).toBeDefined()
		expect(out.installDialogPreview).toBeDefined()
		expect(out.scanned).toBeUndefined()
	})

	it('omits the preview key when none is provided', () => {
		const out = shapeSecurity(null, { overallScore: 10 }, undefined)
		expect(out.installDialogPreview).toBeUndefined()
	})
})

describe('shapeExtension', () => {
	it('carries the install-dialog preview through', () => {
		const out = shapeExtension({ id: 1, slug: 'x', snapshots: [], installDialogPreview: preview }) as Record<
			string,
			unknown
		>
		expect(out.installDialogPreview).toBeDefined()
	})

	it('converts the backend risk score into the website safety score (100 - risk)', () => {
		const out = shapeExtension({ id: 1, slug: 'x', snapshots: [], latestRiskScore: 72.29 }) as Record<
			string,
			unknown
		>
		expect(out.safetyScore).toBeCloseTo(27.71)
		expect(out.riskScore).toBeUndefined()
	})

	it('omits safetyScore entirely when the extension was never scored', () => {
		const out = shapeExtension({ id: 1, slug: 'x', snapshots: [] }) as Record<string, unknown>
		expect(out.safetyScore).toBeUndefined()
	})
})

describe('safety-score parity with the website', () => {
	it('shapeSearch surfaces safetyScore (not riskScore) per cluster', () => {
		const out = shapeSearch(
			{ items: [{ id: 1, slug: 'x', snapshots: [{ name: 'X' }], security: { overallScore: 40 } }], total: 1 },
			10,
		)
		const item = (out.items as Record<string, unknown>[])[0]
		expect(item.safetyScore).toBe(60)
		expect(item.riskScore).toBeUndefined()
	})

	it('shapeSecurity summary reports safetyScore from the raw risk summary', () => {
		const out = shapeSecurity(null, { overallScore: 10, riskCategory: 'LOW' }, undefined)
		const summary = out.summary as Record<string, unknown>
		expect(summary.safetyScore).toBe(90)
		expect(summary.overallScore).toBeUndefined()
		expect(summary.riskCategory).toBe('LOW')
	})

	it('shapeSecurity summary falls back to riskAssessment.overallScore → safetyScore', () => {
		const out = shapeSecurity({ riskAssessment: { overallScore: 25 } }, null, undefined)
		const summary = out.summary as Record<string, unknown>
		expect(summary.safetyScore).toBe(75)
	})
})
