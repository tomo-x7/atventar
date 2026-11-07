import type { ArticleSummary, CalendarSummary } from './CalendarDirectory'

const titles = [
	'フロントエンド',
	'個人開発',
	'デザインと暮らし',
	'読書の記録',
	'TypeScript',
	'Webアクセシビリティ',
	'コーヒーを淹れる',
	'小さなものづくり',
	'写真と散歩',
	'インターネットの思い出',
	'日々の料理',
	'今年買ってよかったもの',
]
const owners = ['saki', 'tomo', 'haru', 'yuki', 'natsuki', 'mori']
export const calendarSummaries: CalendarSummary[] = [2026, 2025, 2024, 2023].flatMap((year) =>
	titles.map((title, index) => ({
		id: `${year}-${index}`,
		title,
		year,
		owner: owners[index % owners.length],
		participants: [39, 25, 18, 9, 48, 16, 8, 22, 25, 11, 17, 5][index],
		sheets: index === 0 || index === 4 ? 2 : 1,
		createdAt: `${year}-11-${String(24 - index).padStart(2, '0')}`,
	})),
)

export const userArticles: ArticleSummary[] = [
	{
		id: 'a1',
		title: '小さな道具をつくり続ける',
		calendarTitle: '個人開発',
		date: '2025-12-21',
		url: 'https://example.com/articles/small-tools',
	},
	{
		id: 'a2',
		title: 'CSSを少しずつ整理する',
		calendarTitle: 'フロントエンド',
		date: '2025-12-08',
		url: 'https://example.com/articles/css',
	},
	{
		id: 'a3',
		title: 'はじめてのアドベントカレンダー',
		calendarTitle: '小さなものづくり',
		date: '2024-12-01',
		url: 'https://example.com/articles/first-calendar',
	},
]
