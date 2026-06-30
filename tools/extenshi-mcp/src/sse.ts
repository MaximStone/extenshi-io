/**
 * Minimal Server-Sent Events frame parser for the scan progress stream.
 *
 * Vendored from `@extenshi/cli` (tools/extenshi-cli/src/sse.ts) so this package
 * stays a clean standalone npm publish with no cross-workspace dependency
 * (npm rejects `workspace:*` at publish time — see scripts/publish.sh in the
 * CLI). The scan backend emits `text/event-stream` with named events
 * (`progress`, `result`, `error`) plus keep-alive comment frames (`:ping`).
 *
 * Pure (no I/O): feed it the accumulated buffer, get back the complete events
 * plus the unconsumed tail to carry into the next chunk.
 */

export interface SseEvent {
	/** The `event:` field value (defaults to "message" per the SSE spec). */
	event: string
	/** The joined `data:` field value(s). */
	data: string
}

/**
 * Split an accumulated SSE buffer into complete events. Frames are delimited by
 * a blank line (`\n\n`); a partial trailing frame is returned as `rest`.
 * Comment frames (lines starting with `:`) and dataless frames are skipped.
 */
export function parseSseFrames(buffer: string): { events: SseEvent[]; rest: string } {
	let buf = buffer.replace(/\r\n/g, '\n')
	const events: SseEvent[] = []

	while (true) {
		const boundary = buf.indexOf('\n\n')
		if (boundary === -1) break

		const frame = buf.slice(0, boundary)
		buf = buf.slice(boundary + 2)

		let eventName = 'message'
		const dataLines: string[] = []

		for (const line of frame.split('\n')) {
			if (line === '' || line.startsWith(':')) continue // blank or comment (keep-alive)

			const colon = line.indexOf(':')
			const field = colon === -1 ? line : line.slice(0, colon)
			let value = colon === -1 ? '' : line.slice(colon + 1)
			if (value.startsWith(' ')) value = value.slice(1)

			if (field === 'event') eventName = value
			else if (field === 'data') dataLines.push(value)
		}

		if (dataLines.length > 0) {
			events.push({ event: eventName, data: dataLines.join('\n') })
		}
	}

	return { events, rest: buf }
}
