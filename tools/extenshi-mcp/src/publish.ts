/**
 * Multi-store publishing for the MCP `publish_extension` tool.
 *
 * Thin wrapper over @extenshi/publisher: credentials come from the MCP
 * client's environment (same env vars as `extenshi publish`), the upload
 * goes straight from this machine to the store APIs. FREE — no Extenshi
 * API key, nothing passes through Extenshi servers.
 */

import * as fs from 'node:fs'
import {
	ChromeAPI,
	EdgeAPI,
	FirefoxAPI,
	publishToStores,
	type StoreType,
	type UniversalPublishResult,
} from '@extenshi/publisher'
import { assertValidArtifact } from './validate-artifact.js'

export interface StoreCredentials {
	chrome?: { appId: string; clientId: string; clientSecret: string; refreshToken: string }
	firefox?: { addonGuid: string; jwtIssuer: string; jwtSecret: string }
	edge?: { productId: string; clientId: string; clientSecret: string; tenantId: string }
}

export const ENV_DOCS: Record<StoreType, string[]> = {
	chrome: ['CHROME_APP_ID', 'CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN'],
	firefox: ['FIREFOX_ADDON_GUID', 'FIREFOX_JWT_ISSUER', 'FIREFOX_JWT_SECRET'],
	edge: ['EDGE_PRODUCT_ID', 'EDGE_CLIENT_ID', 'EDGE_CLIENT_SECRET', 'EDGE_TENANT_ID'],
}

export function readStoreCredentials(env: NodeJS.ProcessEnv = process.env): StoreCredentials {
	const creds: StoreCredentials = {}
	if (env.CHROME_APP_ID && env.CHROME_CLIENT_ID && env.CHROME_CLIENT_SECRET && env.CHROME_REFRESH_TOKEN) {
		creds.chrome = {
			appId: env.CHROME_APP_ID,
			clientId: env.CHROME_CLIENT_ID,
			clientSecret: env.CHROME_CLIENT_SECRET,
			refreshToken: env.CHROME_REFRESH_TOKEN,
		}
	}
	if (env.FIREFOX_ADDON_GUID && env.FIREFOX_JWT_ISSUER && env.FIREFOX_JWT_SECRET) {
		creds.firefox = {
			addonGuid: env.FIREFOX_ADDON_GUID,
			jwtIssuer: env.FIREFOX_JWT_ISSUER,
			jwtSecret: env.FIREFOX_JWT_SECRET,
		}
	}
	if (env.EDGE_PRODUCT_ID && env.EDGE_CLIENT_ID && env.EDGE_CLIENT_SECRET && env.EDGE_TENANT_ID) {
		creds.edge = {
			productId: env.EDGE_PRODUCT_ID,
			clientId: env.EDGE_CLIENT_ID,
			clientSecret: env.EDGE_CLIENT_SECRET,
			tenantId: env.EDGE_TENANT_ID,
		}
	}
	return creds
}

export function credentialsHelp(stores: StoreType[]): string {
	return stores.map((s) => `  ${s}: ${ENV_DOCS[s].join(', ')}`).join('\n')
}

export interface PublishArgs {
	artifactPath: string
	stores?: StoreType[]
	firefoxArtifactPath?: string
	releaseNotes?: string
}

export class PublishSetupError extends Error {}

export async function publishArtifact(args: PublishArgs): Promise<UniversalPublishResult> {
	if (!fs.existsSync(args.artifactPath)) {
		throw new PublishSetupError(`Artifact not found: ${args.artifactPath}`)
	}
	if (args.firefoxArtifactPath && !fs.existsSync(args.firefoxArtifactPath)) {
		throw new PublishSetupError(`Firefox artifact not found: ${args.firefoxArtifactPath}`)
	}

	// Refuse to upload anything that isn't a real extension package.
	try {
		assertValidArtifact(args.artifactPath)
		if (args.firefoxArtifactPath) assertValidArtifact(args.firefoxArtifactPath)
	} catch (err) {
		throw new PublishSetupError(err instanceof Error ? err.message : String(err))
	}

	const creds = readStoreCredentials()
	const configured = (['chrome', 'firefox', 'edge'] as StoreType[]).filter((s) => creds[s])
	const stores = args.stores?.length ? args.stores : configured

	if (!stores.length) {
		throw new PublishSetupError(
			'No store credentials found in the environment. Publishing is free and runs locally — ' +
				'add credentials for at least one store to the MCP server env:\n' +
				credentialsHelp(['chrome', 'firefox', 'edge']),
		)
	}
	const missing = stores.filter((s) => !creds[s])
	if (missing.length) {
		throw new PublishSetupError(`Missing credentials for: ${missing.join(', ')}\n${credentialsHelp(missing)}`)
	}

	return publishToStores({
		extensionId: creds.chrome?.appId ?? creds.firefox?.addonGuid ?? creds.edge?.productId ?? 'extension',
		stores,
		packagePaths: {
			chrome: stores.includes('chrome') ? args.artifactPath : undefined,
			firefox: stores.includes('firefox') ? (args.firefoxArtifactPath ?? args.artifactPath) : undefined,
			edge: stores.includes('edge') ? args.artifactPath : undefined,
		},
		storeConfigs: {
			chrome: creds.chrome,
			firefox: creds.firefox,
			edge: creds.edge,
		},
		releaseNotes: args.releaseNotes,
		parallel: true,
	})
}

export async function validateStoreCredentials(
	stores?: StoreType[],
): Promise<Array<{ store: StoreType; configured: boolean; valid: boolean }>> {
	const creds = readStoreCredentials()
	const targets = stores?.length ? stores : (['chrome', 'firefox', 'edge'] as StoreType[])
	return Promise.all(
		targets.map(async (store) => {
			if (store === 'chrome' && creds.chrome) {
				const valid = await ChromeAPI.validateCredentials(
					creds.chrome.clientId,
					creds.chrome.clientSecret,
					creds.chrome.refreshToken,
				)
				return { store, configured: true, valid }
			}
			if (store === 'firefox' && creds.firefox) {
				const valid = await FirefoxAPI.validateCredentials(creds.firefox.jwtIssuer, creds.firefox.jwtSecret)
				return { store, configured: true, valid }
			}
			if (store === 'edge' && creds.edge) {
				const valid = await EdgeAPI.validateCredentials(
					creds.edge.clientId,
					creds.edge.clientSecret,
					creds.edge.tenantId,
				)
				return { store, configured: true, valid }
			}
			return { store, configured: false, valid: false }
		}),
	)
}
