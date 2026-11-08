import { calendarCollection, entryCollection, parseRecordUri } from '../data'

function recordPath(uri: string, collection: string, base: string) {
	const { did, rkey } = parseRecordUri(uri, collection)
	return `${base}/${encodeURIComponent(did)}/${encodeURIComponent(rkey)}`
}

export const paths = {
	calendar: (uri: string) => recordPath(uri, calendarCollection, '/calendars'),
	entry: (uri: string) => recordPath(uri, entryCollection, '/entries'),
	profile: (actor: string) => `/users/${encodeURIComponent(actor)}`,
	sheet: (uri: string, number: number) => `${paths.calendar(uri)}/sheets/${number}`,
	join: (uri: string, day?: number) => `${paths.calendar(uri)}/join${day ? `?day=${day}` : ''}`,
	editCalendar: (uri: string) => `${paths.calendar(uri)}/edit`,
	editEntry: (uri: string) => `${paths.entry(uri)}/edit`,
	share: (uri: string) => `${paths.calendar(uri)}/share`,
	shareEntry: (uri: string) => `${paths.entry(uri)}/share`,
}

export function calendarUri(did: string, rkey: string) {
	const uri = `at://${did}/${calendarCollection}/${rkey}`
	parseRecordUri(uri, calendarCollection)
	return uri
}
export function calendarDocumentUri(uri: string) {
	const { did, rkey } = parseRecordUri(uri, calendarCollection)
	return `at://${did}/site.standard.document/${rkey}`
}
export function entryUri(did: string, rkey: string) {
	const uri = `at://${did}/${entryCollection}/${rkey}`
	parseRecordUri(uri, entryCollection)
	return uri
}
