import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CalendarArchive } from './CalendarDirectory'
import { calendarSummaries } from './fixtures'

const meta = {
	title: 'カレンダー/過去のカレンダー',
	component: CalendarArchive,
	parameters: { layout: 'fullscreen' },
	args: { calendars: calendarSummaries.filter((calendar) => calendar.year < 2026), onCalendarSelect: fn() },
} satisfies Meta<typeof CalendarArchive>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const ChangeYear: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: '2024年' }))
		await expect(canvas.getByRole('heading', { name: '2024年' })).toBeVisible()
		await expect(canvas.getByRole('button', { name: '2024年' })).toHaveAttribute('aria-pressed', 'true')
	},
}
export const Empty: Story = { args: { calendars: [] } }
