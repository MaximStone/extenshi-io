import { describe, expect, it } from 'vitest'
import { describeStoreConstraints, validateSearchFilters } from './search-filters.js'

describe('describeStoreConstraints', () => {
	it('advertises the same store-specific rule that validation enforces', () => {
		const text = describeStoreConstraints()
		expect(text).toMatch(/minWeeklyDownloads/)
		expect(text).toMatch(/FIREFOX/)
		// The advertised limit must align with the runtime rejection so they can't drift.
		expect(validateSearchFilters({ minWeeklyDownloads: 1, stores: ['CHROME'] })).toMatch(/Firefox-only/)
	})
})

describe('validateSearchFilters', () => {
	it('rejects minWeeklyDownloads when stores exclude Firefox (Chrome only)', () => {
		const msg = validateSearchFilters({ minWeeklyDownloads: 100000, stores: ['CHROME'] })
		expect(msg).toMatch(/Firefox-only/)
		expect(msg).toMatch(/requested stores: CHROME/)
	})

	it('rejects minWeeklyDownloads for Edge-only and Chrome+Edge', () => {
		expect(validateSearchFilters({ minWeeklyDownloads: 1, stores: ['EDGE'] })).toMatch(/Firefox-only/)
		expect(validateSearchFilters({ minWeeklyDownloads: 1, stores: ['CHROME', 'EDGE'] })).toMatch(
			/Firefox-only/,
		)
	})

	it('allows minWeeklyDownloads when Firefox is among the requested stores', () => {
		expect(validateSearchFilters({ minWeeklyDownloads: 1, stores: ['FIREFOX'] })).toBeNull()
		expect(validateSearchFilters({ minWeeklyDownloads: 1, stores: ['CHROME', 'FIREFOX'] })).toBeNull()
	})

	it('allows minWeeklyDownloads with no store filter (narrows to FF, not a conflict)', () => {
		expect(validateSearchFilters({ minWeeklyDownloads: 1 })).toBeNull()
		expect(validateSearchFilters({ minWeeklyDownloads: 1, stores: [] })).toBeNull()
	})

	it('does not flag a Chrome-only search that omits the store-specific filter', () => {
		expect(validateSearchFilters({ stores: ['CHROME'], minRating: 4 })).toBeNull()
	})

	it('ignores a zero/explicit value the same as any other present value', () => {
		// 0 is a meaningful "present" value — still store-checked.
		expect(validateSearchFilters({ minWeeklyDownloads: 0, stores: ['CHROME'] })).toMatch(/Firefox-only/)
	})
})
