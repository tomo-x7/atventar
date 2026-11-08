import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { AdventCalendar, CalendarCollection } from './AdventCalendar'
import { makeSheet, sampleSheets } from './fixtures'

const meta = {
	title: 'カレンダー/詳細',
	component: CalendarCollection,
	parameters: { layout: 'fullscreen' },
	args: {
		year: 2026,
		title: 'ものづくりとWeb',
		description: 'Webの技術、デザイン、日々の制作について、12月の25日間に書くカレンダーです。',
		organizer: 'mori',
		sheets: sampleSheets,
		today: 8,
		onJoin: fn(),
		onEditEntry: fn(),
	},
} satisfies Meta<typeof CalendarCollection>
export default meta
type Story = StoryObj<typeof meta>

export const Multiple: Story = { name: '複数枚' }
export const Single: Story = { name: '1枚', args: { sheets: [sampleSheets[1]] } }
export const ThreeSheets: Story = { name: '3枚', args: { sheets: [...sampleSheets, makeSheet('third', 3, 4)] } }
export const Empty: Story = { name: '未作成', args: { sheets: [] } }
export const Occupied: Story = {
	name: '埋まった日への参加',
	args: { sheets: [sampleSheets[0]] },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'カレンダー 1 12月1日に参加する' }))
		await expect(args.onJoin).toHaveBeenCalledWith(1)
		await expect(canvas.getByRole('heading', { name: 'カレンダー 1' })).toBeVisible()
		await expect(canvas.queryByRole('button', { name: /カレンダーを追加/ })).not.toBeInTheDocument()
	},
}
export const Archive: Story = {
	name: '閲覧のみ',
	args: { year: 2025, readOnly: true, today: undefined },
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).queryByRole('button', { name: /日に参加する|登録を編集/ }),
		).not.toBeInTheDocument()
	},
}
export const Mobile: Story = { name: 'モバイル', globals: { viewport: { value: 'mobile1', isRotated: false } } }
export const LongContent: Story = {
	name: '長いタイトル',
	args: {
		title: 'デザインとエンジニアリングのあいだで考えたこと、試したこと、これからやってみたいこと',
		sheets: [
			{
				id: 'long',
				number: 1,
				entries: [
					{
						day: 1,
						author: 'とても長い表示名の参加者',
						status: 'reserved',
						title: 'コンポーネントの設計を見直しながらチームで小さな改善を続けた一年の記録',
					},
				],
			},
		],
	},
}
export const PlannedContent: Story = {
	name: '参加時の書く内容',
	args: {
		sheets: [
			{
				id: 'planned',
				number: 1,
				entries: [
					{ day: 1, author: 'mori', title: '今年作ったものと学んだこと', status: 'reserved', isOwner: true },
					{
						day: 2,
						author: '佐藤 はる',
						title: 'デザインシステムの設計',
						url: 'https://example.com/private-draft',
						status: 'scheduled',
					},
				],
			},
		],
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByText('今年作ったものと学んだこと')).toBeVisible()
		await expect(canvas.getByText('デザインシステムの設計')).toBeVisible()
		await expect(canvas.queryByRole('link', { name: 'デザインシステムの設計' })).not.toBeInTheDocument()
		await expect(canvas.queryByRole('button', { name: 'カレンダー 1 12月2日の登録を編集' })).not.toBeInTheDocument()
		await userEvent.click(canvas.getByRole('button', { name: 'カレンダー 1 12月1日の登録を編集' }))
		await expect(args.onEditEntry).toHaveBeenCalledWith('planned', expect.objectContaining({ day: 1 }))
	},
}
export const Sheet: StoryObj<typeof AdventCalendar> = {
	name: 'カレンダー単体',
	render: () => (
		<div style={{ padding: 24, maxWidth: 800 }}>
			<AdventCalendar sheet={sampleSheets[1]} year={2026} onJoin={fn()} onEditEntry={fn()} />
		</div>
	),
}
