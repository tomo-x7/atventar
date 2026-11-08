import { l } from '@atproto/lex'
import { DataError } from './errors'

export const calendarCollection = 'win.tomo-x.atventar.calendar'
export const entryCollection = 'win.tomo-x.atventar.entry'

const didSchema = l.string({ format: 'did' })
const keySchema = l.string({ format: 'record-key' })

/** Only DID-based, complete record URIs are accepted for repository operations. */
export function parseRecordUri(uri: string, collection?: string) {
	const match = /^at:\/\/(did:[^/?#]+)\/([^/?#]+)\/([^/?#]+)$/.exec(uri)
	if (!match || (collection !== undefined && match[2] !== collection)) {
		throw new DataError('invalid-input', '登録URIが正しくありません')
	}
	try {
		const did = didSchema.parse(match[1])
		keySchema.parse(match[3])
		l.string({ format: 'nsid' }).parse(match[2])
		return { did, collection: match[2], rkey: match[3] }
	} catch (cause) {
		throw new DataError('invalid-input', '登録URIが正しくありません', { cause })
	}
}

export function validateDid(did: string) {
	try {
		return didSchema.parse(did)
	} catch (cause) {
		throw new DataError('invalid-input', 'DIDが正しくありません', { cause })
	}
}

export function httpUrl(value: string | undefined): string | undefined {
	const text = value?.trim()
	if (!text) return undefined
	try {
		const url = new URL(text)
		if (!/^https?:\/\//i.test(text) || !['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid scheme')
		return url.href
	} catch (cause) {
		throw new DataError('invalid-input', 'URLはHTTPまたはHTTPSで入力してください', { cause })
	}
}

export function validateDay(day: number) {
	if (!Number.isInteger(day) || day < 1 || day > 25)
		throw new DataError('invalid-input', '日付は12月1日から25日で指定してください')
	return day
}

export function validateYear(year: number) {
	if (!Number.isInteger(year) || year < 1 || year > 9999) throw new DataError('invalid-input', '年が正しくありません')
	return year
}

export function requiredTitle(title: string) {
	const trimmed = title.trim()
	if (!trimmed) throw new DataError('invalid-input', 'タイトルを入力してください')
	return trimmed
}
