import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { UserCalendarPage } from './CalendarDirectory'
import { calendarSummaries, userArticles } from './fixtures'

const meta = {
	title: 'ユーザー/プロフィール',
	component: UserCalendarPage,
	parameters: { layout: 'fullscreen' },
	args: {
		name: 'tomo',
		handle: 'tomo',
		joined: calendarSummaries.slice(0, 4),
		hosted: calendarSummaries.slice(1, 2),
		articles: userArticles,
		onCalendarSelect: fn(),
	},
} satisfies Meta<typeof UserCalendarPage>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const OwnProfile: Story = { args: { onEditProfile: fn() } }
export const Articles: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: '記事 3' }))
		await expect(canvas.getByRole('link', { name: /小さな道具をつくり続ける/ })).toBeVisible()
	},
}
export const Hosting: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: '主催 1' }))
		await expect(canvas.getByRole('button', { name: '個人開発' })).toBeVisible()
		await expect(canvas.queryByRole('button', { name: 'フロントエンド' })).not.toBeInTheDocument()
	},
}
export const Empty: Story = { args: { joined: [], hosted: [], articles: [] } }
