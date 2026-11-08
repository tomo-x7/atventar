import { Buffer } from 'node:buffer'
import { ApiError } from './errors.js'

type Cursor = { scope: string; key: string | number; uri: string }

export function readCursor(value: string | undefined, scope: string): Cursor | undefined {
	if (value === undefined) return undefined
	try {
		const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Cursor
		if (
			parsed.scope !== scope ||
			typeof parsed.uri !== 'string' ||
			!parsed.uri.startsWith('at://did:') ||
			!(typeof parsed.key === 'string' || (typeof parsed.key === 'number' && Number.isFinite(parsed.key)))
		)
			throw new Error()
		return parsed
	} catch {
		throw new ApiError(400, 'InvalidCursor', 'Cursor does not match this request')
	}
}

export function writeCursor(scope: string, key: string | number, uri: string) {
	return Buffer.from(JSON.stringify({ scope, key, uri })).toString('base64url')
}
