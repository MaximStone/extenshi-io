import { defineConfig } from 'vitest/config'

// Self-contained config so `vitest run` here doesn't climb to the monorepo
// root config (which defines unrelated workspace projects with paths relative
// to the repo root — those resolve wrong from this workspace and crash the
// run). Mirrors tools/extenshi-cli/vitest.config.ts.
export default defineConfig({
	test: {
		root: __dirname,
		include: ['src/**/*.test.ts'],
	},
})
