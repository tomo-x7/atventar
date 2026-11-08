import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { YearNavigation } from './RemoteCalendarDirectory'

const meta = {
	title: '一覧/年選択',
	component: YearNavigation,
	args: { years: [2026, 2025, 2024], year: 2025, onSelect: fn() },
} satisfies Meta<typeof YearNavigation>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
	play: async ({ canvasElement, args }) => {
		await userEvent.click(within(canvasElement).getByRole('button', { name: '2024年' }))
		await expect(args.onSelect).toHaveBeenCalledWith(2024)
	},
}
