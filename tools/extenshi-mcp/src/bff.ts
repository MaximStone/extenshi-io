/**
 * Thin tRPC client for the public catalog BFF (`bff.extenshi.io`).
 *
 * The BFF tRPC server is configured WITHOUT a data transformer (no superjson),
 * so this client must match — plain JSON over the wire. We type the proxy as
 * `any` on purpose: catalog-api emits no `.d.ts`, so the BFF↔API type chain
 * can't be imported reliably across a published-package boundary. The runtime
 * proxy builds the procedure path from property access regardless of types.
 *
 * Every call carries `Authorization: Bearer <ek_…>`. Today the BFF read
 * procedures are anonymous, but they are moving to mandatory key-enforcement
 * (no anonymous data access) — sending the key now is forward-compatible and
 * needs no client change when enforcement lands.
 */

import { createTRPCClient, httpBatchLink } from '@trpc/client'

type AnyTRPCClient = any

export interface Bff {
	searchExtensions(input: Record<string, unknown>): Promise<unknown>
	getExtensionById(id: number): Promise<unknown>
	/** Paginated store user reviews for an extension (PII-free projection). */
	getReviews(input: Record<string, unknown>): Promise<unknown>
	getSecurityData(extensionId: number): Promise<unknown>
	getRiskSummary(extensionId: number): Promise<unknown>
	getSearchFacets(input: Record<string, unknown>): Promise<unknown>
	getStats(): Promise<unknown>
	/** Catalog-wide extended facets (manifest / permissions / risk / freshness …), cached server-side. */
	getExtendedFilterFacets(): Promise<unknown>
	/** Catalog-wide category tree with per-category counts. */
	getCategoryTree(): Promise<unknown>
}

/** Build a BFF client from a static `ek_…` key (stdio path). */
export function makeBff(bffUrl: string, apiKey: string): Bff {
	return makeBffWithAuth(bffUrl, () => `Bearer ${apiKey}`)
}

/**
 * Build a BFF client whose Authorization header is produced per request by
 * `authHeader` (may be async). The remote OAuth server uses this to mint a
 * fresh, short-lived genkan JWT for each call instead of holding a static key.
 * The provider returns the FULL header value (e.g. `Bearer eyJ…`).
 */
export function makeBffWithAuth(bffUrl: string, authHeader: () => string | Promise<string>): Bff {
	const client: AnyTRPCClient = createTRPCClient({
		links: [
			httpBatchLink({
				url: `${bffUrl}/api/trpc`,
				headers: async () => ({ authorization: await authHeader() }),
			}),
		],
	})

	// NB: the store router is mounted under `catalog` in the BFF appRouter
	// (routers/index.ts: `catalog: storeRouter`), NOT `store`. Security is `security`.
	return {
		searchExtensions: (input) => client.catalog.searchExtensions.query(input),
		getExtensionById: (id) => client.catalog.getExtensionById.query({ id }),
		getReviews: (input) => client.catalog.getReviewsForExtension.query(input),
		getSecurityData: (extensionId) => client.security.getSecurityData.query({ extensionId }),
		getRiskSummary: (extensionId) => client.security.getRiskSummary.query({ extensionId }),
		getSearchFacets: (input) => client.catalog.getSearchFacets.query(input),
		getStats: () => client.catalog.getStats.query(),
		getExtendedFilterFacets: () => client.catalog.getExtendedFilterFacets.query(),
		getCategoryTree: () => client.catalog.getCategoryTree.query(),
	}
}
