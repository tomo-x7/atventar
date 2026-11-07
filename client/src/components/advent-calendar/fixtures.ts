import type { CalendarEntry, CalendarSheet } from './AdventCalendar'

const authors = ['mori', '佐藤 はる', 'natsuki', '小林', 'yuki', '田中', 'aki']
const titles = [
	'小さなWebを作り続ける',
	'CSS Gridで考えるレイアウト',
	'今年書いてよかったコード',
	'アクセシビリティの実践記録',
	'自分のための開発環境',
	'型と向き合う一年',
	'個人開発を続ける工夫',
]

export function makeSheet(id: string, name: string, count: number): CalendarSheet {
	return {
		id,
		name,
		entries: Array.from(
			{ length: Math.min(25, Math.max(0, count)) },
			(_, index): CalendarEntry => ({
				day: index + 1,
				author: authors[index % authors.length],
				title: index < 7 ? titles[index] : undefined,
				url: index < 7 ? 'https://example.com' : undefined,
				status: index < 7 ? 'published' : index === 9 ? 'scheduled' : 'reserved',
				isOwner: index === 3,
			}),
		),
	}
}

export const sampleSheets = [makeSheet('first', 'カレンダー 1', 25), makeSheet('second', 'カレンダー 2', 14)]
