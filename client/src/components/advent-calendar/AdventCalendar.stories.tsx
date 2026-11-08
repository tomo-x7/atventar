import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CalendarCollection } from './AdventCalendar'
import { makeSheet, projectProps, sampleSheets } from './fixtures'

const meta = {
	title: '企画/トップ',
	component: CalendarCollection,
	parameters: { layout: 'fullscreen' },
	args: { ...projectProps, onJoin: fn(), onShare: fn(), onCalendarSelect: fn() },
} satisfies Meta<typeof CalendarCollection>
export default meta
type Story = StoryObj<typeof meta>

export const Multiple: Story = {
	name: 'すべてのカレンダー',
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('link', { name: '1枚目 25/25人' })).toHaveAttribute(
			'href',
			projectProps.getCalendarHref(1),
		)
		await expect(canvas.getByRole('link', { name: '2枚目 14/25人' })).toHaveAttribute(
			'href',
			projectProps.getCalendarHref(2),
		)
		await expect(canvas.queryByRole('list', { name: '日付ごとの参加登録' })).not.toBeInTheDocument()
		await userEvent.click(canvas.getByRole('link', { name: '2枚目 14/25人' }))
		await expect(args.onCalendarSelect).toHaveBeenCalledWith(2)
		await userEvent.click(canvas.getByRole('link', { name: '参加登録' }))
		await expect(args.onJoin).toHaveBeenCalledWith()
		await userEvent.click(canvas.getByRole('link', { name: '共有' }))
		await expect(args.onShare).toHaveBeenCalledOnce()
	},
}
export const Single: Story = { name: '1枚', args: { sheets: [sampleSheets[0]] } }
export const Unsorted: Story = {
	name: '連番順に表示',
	args: { sheets: [makeSheet('third', 3, 4), sampleSheets[1], sampleSheets[0]] },
	play: async ({ canvasElement }) => {
		const links = within(canvasElement).getAllByRole('link', { name: /枚目 .*人/ })
		await expect(links.map((link) => link.getAttribute('href'))).toEqual([1, 2, 3].map(projectProps.getCalendarHref))
	},
}
export const ManySheets: Story = {
	name: '12枚',
	args: { sheets: Array.from({ length: 12 }, (_, index) => makeSheet(`record-set-${index}`, index + 1, 25 - index)) },
}
export const Empty: Story = { name: '参加登録なし', args: { sheets: [] } }
export const Archive: Story = { name: '過去年', args: { year: 2025, readOnly: true } }
export const Mobile: Story = { name: 'モバイル', globals: { viewport: { value: 'mobile1', isRotated: false } } }
