import type { CalendarEntry, CalendarSheet } from './AdventCalendar'

const authors = ['mori', '佐藤 はる', 'natsuki', '小林', 'yuki', '田中', 'aki']
// Local sample identicons keep Storybook independent of external avatar hosts.
const avatarColors = [
	{ foreground: '#c64d2f', background: '#fff0e5' },
	{ foreground: '#2d75bb', background: '#e8f2fc' },
	{ foreground: '#2e8a68', background: '#e8f5ed' },
	{ foreground: '#b37219', background: '#fff4d6' },
	{ foreground: '#9b4f9c', background: '#f6eafa' },
	{ foreground: '#407e91', background: '#e5f3f6' },
	{ foreground: '#ca586c', background: '#fcebef' },
]
const avatars = authors.map((_, authorIndex) => {
	const { foreground, background } = avatarColors[authorIndex]
	const cells = Array.from({ length: 25 }, (_, index) => {
		const x = index % 5
		const y = Math.floor(index / 5)
		const bit = y * 3 + Math.min(x, 4 - x)
		return (((authorIndex + 3) * 7919) >> bit) & 1
			? `<rect x="${x * 6 + 5}" y="${y * 6 + 5}" width="6" height="6"/>`
			: ''
	}).join('')
	return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><path fill="${background}" d="M0 0h40v40H0z"/><g fill="${foreground}">${cells}</g></svg>`)}`
})
const titles = [
	'小さなWebを作り続ける',
	'CSS Gridで考えるレイアウト',
	'今年書いてよかったコード',
	'アクセシビリティの実践記録',
	'自分のための開発環境',
	'型と向き合う一年',
	'個人開発を続ける工夫',
]

export function makeSheet(id: string, number: number, count: number): CalendarSheet {
	return {
		id,
		number,
		entries: Array.from(
			{ length: Math.min(25, Math.max(0, count)) },
			(_, index): CalendarEntry => ({
				day: index + 1,
				author: authors[index % authors.length],
				authorAvatarUrl: avatars[index % avatars.length],
				title: titles[index % titles.length],
				url: index < 7 ? 'https://example.com' : undefined,
				status: index < 7 ? 'published' : index === 9 ? 'scheduled' : 'reserved',
				isOwner: index === 3,
			}),
		),
	}
}

export const sampleSheets = [makeSheet('first', 1, 25), makeSheet('second', 2, 14)]
