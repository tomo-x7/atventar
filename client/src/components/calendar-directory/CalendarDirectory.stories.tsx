import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CalendarDirectory } from './CalendarDirectory'
import { calendarSummaries } from './fixtures'

const meta = {
	title: 'カレンダー/一覧・検索',
	component: CalendarDirectory,
	parameters: { layout: 'fullscreen' },
	args: { calendars: calendarSummaries, onCalendarSelect: fn(), onCreate: fn() },
} satisfies Meta<typeof CalendarDirectory>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Search: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.type(canvas.getByRole('searchbox', { name: '検索' }), 'フロントエンド')
		await expect(canvas.getByRole('status')).toHaveTextContent('1件')
		await expect(canvas.getByRole('button', { name: 'フロントエンド' })).toBeVisible()
	},
}
export const LoadMore: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'もっと見る（残り4件）' }))
		await expect(canvas.getByRole('button', { name: '今年買ってよかったもの' })).toBeVisible()
		await expect(canvas.queryByRole('button', { name: /もっと見る/ })).not.toBeInTheDocument()
	},
}
export const NoResults: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.type(canvas.getByRole('searchbox', { name: '検索' }), '見つからない検索')
		await expect(canvas.getByText('該当するカレンダーがありません')).toBeVisible()
		await userEvent.click(canvas.getByRole('button', { name: '検索条件をクリア' }))
		await expect(canvas.getByRole('status')).toHaveTextContent('12件')
	},
}
export const Empty: Story = { args: { calendars: [] } }
export const Mobile: Story = {
	globals: { viewport: { value: 'mobile1', isRotated: false } },
	render: (args) => (
		<div style={{ maxWidth: 390 }}>
			<CalendarDirectory {...args} />
		</div>
	),
}

export const ChangeYear: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.selectOptions(canvas.getByRole('combobox', { name: '年' }), '2025')
		await userEvent.click(canvas.getByRole('button', { name: 'フロントエンド' }))
		await expect(args.onCalendarSelect).toHaveBeenCalledWith(expect.objectContaining({ year: 2025 }))
	},
}
export const SortByParticipation: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.selectOptions(canvas.getByRole('combobox', { name: '並べ替え' }), 'popular')
		await expect(canvas.getAllByRole('row')[1]).toHaveTextContent('TypeScript')
	},
}
