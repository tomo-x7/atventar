import type { CalendarEntry, CalendarSheet } from '../components/advent-calendar/AdventCalendar'
import type { ArticleSummary, CalendarSummary } from '../components/calendar-directory/CalendarDirectory'
import type { CalendarFormValue } from '../components/calendar-forms/CalendarForm'
import type { EntryFormValue } from '../components/calendar-forms/EntryForm'
import type { CalendarView, EntryView, ProfileView } from '../lexicons/win/tomo-x/atventar/defs'
import { DataError } from './errors'
import type { CalendarSnapshot, EntrySnapshot } from './repository'
import { httpUrl } from './validation'

export function profileName(profile: ProfileView): string {
	return profile.displayName?.trim() || profile.handle || profile.did
}

export interface DisplayLinks {
	viewerDid?: string
	getProfileHref: (did: string) => string
}

function displayHttpUrl(value?: string) {
	try {
		return httpUrl(value)
	} catch {
		return undefined
	}
}

/** A projected future entry does not reveal whether a hidden URL was supplied. */
export function toCalendarEntry(entry: EntryView, links: DisplayLinks): CalendarEntry {
	return {
		uri: entry.uri,
		day: entry.day,
		author: profileName(entry.author),
		authorAvatarUrl: displayHttpUrl(entry.author.avatar),
		authorHref: links.getProfileHref(entry.author.did),
		title: entry.title,
		url: displayHttpUrl(entry.url),
		comment: entry.comment,
		status: entry.url || entry.article ? 'published' : 'reserved',
		isOwner: links.viewerDid !== undefined && entry.author.did === links.viewerDid,
	}
}

/** Group by the AppView's assigned sheet; never compute a position from local sorting. */
export function toCalendarSheets(calendar: CalendarView, entries: EntryView[], links: DisplayLinks): CalendarSheet[] {
	const sheets = new Map<number, CalendarSheet>()
	for (const entry of entries) {
		if (entry.calendar.uri !== calendar.uri || !Number.isInteger(entry.sheet) || entry.sheet < 1)
			throw new DataError('invalid-record', 'カレンダーの表示位置が正しくありません')
		let sheet = sheets.get(entry.sheet)
		if (!sheet) {
			sheet = { id: `${calendar.uri}#calendar-${entry.sheet}`, number: entry.sheet, entries: [] }
			sheets.set(entry.sheet, sheet)
		}
		sheet.entries.push(toCalendarEntry(entry, links))
	}
	return [...sheets.values()].sort((a, b) => a.number - b.number)
}

/** List/search views expose entryCount, but cannot determine the number of sheets. */
export function toCalendarSummary(
	calendar: CalendarView,
	sheets?: CalendarSheet[],
): Omit<CalendarSummary, 'sheets'> & { sheets?: number } {
	return {
		id: calendar.uri,
		title: calendar.record.title,
		year: calendar.record.year,
		owner: calendar.author.handle || profileName(calendar.author),
		participants: calendar.entryCount,
		createdAt: calendar.indexedAt,
		...(sheets ? { sheets: sheets.length } : {}),
	}
}

export function toArticleSummary(entry: EntryView): ArticleSummary | undefined {
	const url = displayHttpUrl(entry.url)
	if (!url) return undefined
	return {
		id: entry.uri,
		title: entry.title,
		calendarTitle: entry.calendar.record.title,
		date: `${String(entry.calendar.record.year).padStart(4, '0')}-12-${String(entry.day).padStart(2, '0')}`,
		url,
	}
}

export function toEntryFormValue(snapshot: EntrySnapshot): EntryFormValue {
	return {
		day: snapshot.record.day,
		title: snapshot.record.title,
		url: snapshot.record.url ?? '',
		comment: snapshot.record.comment ?? '',
	}
}

export function toCalendarFormValue(snapshot: CalendarSnapshot): CalendarFormValue {
	return { title: snapshot.record.title, year: snapshot.record.year, description: snapshot.record.description ?? '' }
}
