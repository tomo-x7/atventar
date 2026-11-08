import type { Record as CalendarRecord } from './lexicons/types/win/tomo-x/atventar/calendar.js'

// The generator refers to record #main as Main, but emits Record.
declare module './lexicons/types/win/tomo-x/atventar/calendar.js' {
	export type Main = CalendarRecord
}
