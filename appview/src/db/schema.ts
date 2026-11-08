import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { Record as CalendarRecord } from '../lexicons/types/win/tomo-x/atventar/calendar.js'
import type { Record as EntryRecord } from '../lexicons/types/win/tomo-x/atventar/entry.js'

// Deletes retain their version so delayed deliveries cannot resurrect a record.
export const records = sqliteTable(
	'records',
	{
		uri: text('uri').primaryKey(),
		did: text('did').notNull(),
		collection: text('collection').notNull(),
		cid: text('cid'),
		rev: text('rev').notNull(),
		record: text('record', { mode: 'json' }).$type<CalendarRecord | EntryRecord>(),
		indexedAt: text('indexed_at').notNull(),
		year: integer('year'),
		title: text('title'),
		description: text('description'),
		calendarUri: text('calendar_uri'),
		day: integer('day'),
	},
	(t) => [
		index('records_collection_order').on(t.collection, t.indexedAt, t.uri),
		index('records_author_order').on(t.did, t.collection, t.indexedAt, t.uri),
		index('records_calendar_day').on(t.calendarUri, t.day, t.indexedAt, t.uri),
		index('records_year').on(t.year),
	],
)
