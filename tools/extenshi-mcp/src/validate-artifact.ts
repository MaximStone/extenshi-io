/**
 * Artifact safety gate — shared by the `scan_extension` and `publish_extension`
 * MCP tools.
 *
 * Before we read an extension package into memory, upload it to the scan
 * backend, or push it to a store, we confirm it really is an extension
 * archive:
 *
 *   1. the filename extension is one of .crx / .xpi / .zip, AND
 *   2. the file's leading bytes are a ZIP (`PK\x03\x04`, or the empty-archive
 *      marker `PK\x05\x06`) or a CRX (`Cr24`) container — an .xpi is a ZIP.
 *
 * Anything else — an ELF/PE/Mach-O executable, a shell script, a gzip stream,
 * an HTML error page — is refused outright: we never upload it or hand it on.
 * The scan server enforces the same rule at its own boundary; this is a fast,
 * local, defence-in-depth check so a non-extension never leaves the machine.
 *
 * This module is intentionally vendored (copied) into both @extenshi/cli and
 * @extenshi/mcp rather than shared — npm rejects `workspace:*`, so each package
 * stays independently publishable.
 */

import fs from 'node:fs'
import path from 'node:path'

const ALLOWED_EXTENSIONS = new Set(['.crx', '.xpi', '.zip'])

/** Compare the head buffer against a byte signature. */
function startsWith(head: Buffer, sig: readonly number[]): boolean {
	if (head.length < sig.length) return false
	for (let i = 0; i < sig.length; i++) {
		if (head[i] !== sig[i]) return false
	}
	return true
}

/** A ZIP local-file header `PK\x03\x04` or the empty-archive marker `PK\x05\x06`. */
function isZip(head: Buffer): boolean {
	return startsWith(head, [0x50, 0x4b, 0x03, 0x04]) || startsWith(head, [0x50, 0x4b, 0x05, 0x06])
}

/** The Chrome/Edge CRX container magic `Cr24`. */
function isCrx(head: Buffer): boolean {
	return startsWith(head, [0x43, 0x72, 0x32, 0x34])
}

/**
 * Best-effort label for a clearer refusal message. NOT the security gate — the
 * ZIP/CRX allow-list is. We only reach here for a file that is already rejected.
 */
function sniffNonArchive(head: Buffer): string | null {
	const signatures: ReadonlyArray<readonly [readonly number[], string]> = [
		[[0x7f, 0x45, 0x4c, 0x46], 'an ELF executable'],
		[[0x4d, 0x5a], 'a Windows PE executable'],
		[[0xfe, 0xed, 0xfa, 0xce], 'a Mach-O executable'],
		[[0xfe, 0xed, 0xfa, 0xcf], 'a Mach-O executable'],
		[[0xce, 0xfa, 0xed, 0xfe], 'a Mach-O executable'],
		[[0xcf, 0xfa, 0xed, 0xfe], 'a Mach-O executable'],
		[[0xca, 0xfe, 0xba, 0xbe], 'a Mach-O or fat binary'],
		[[0x23, 0x21], 'a script'],
		[[0x1f, 0x8b], 'a gzip stream'],
	]
	for (const [sig, label] of signatures) {
		if (startsWith(head, sig)) return label
	}
	return null
}

/**
 * Throw unless `artifactPath` is a real extension package (.crx/.xpi/.zip whose
 * leading bytes are a ZIP or CRX archive). Call this before reading, uploading,
 * or publishing the file. Assumes the path already exists and is a regular file.
 */
export function assertValidArtifact(artifactPath: string): void {
	const ext = path.extname(artifactPath).toLowerCase()
	if (!ALLOWED_EXTENSIONS.has(ext)) {
		throw new Error(
			`Unsupported artifact type "${ext || '(no extension)'}". ` +
				'Provide a packaged extension: .crx (Chrome/Edge), .xpi (Firefox), or .zip.',
		)
	}

	// Read just the first 8 bytes — enough to identify the container.
	const head = Buffer.alloc(8)
	const fd = fs.openSync(artifactPath, 'r')
	let bytesRead = 0
	try {
		bytesRead = fs.readSync(fd, head, 0, 8, 0)
	} finally {
		fs.closeSync(fd)
	}
	const leading = head.subarray(0, bytesRead)

	if (isZip(leading) || isCrx(leading)) return

	const detected = sniffNonArchive(leading)
	throw new Error(
		`"${path.basename(artifactPath)}" is not a valid extension package — its contents are ` +
			'not a ZIP or CRX archive' +
			(detected ? ` (looks like ${detected})` : '') +
			'. Refusing to process it.',
	)
}
