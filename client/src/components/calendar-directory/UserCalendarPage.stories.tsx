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
		joined: calendarSummaries.slice(0, 4),
		hosted: calendarSummaries.slice(1, 2),
		articles: userArticles,
		onCalendarSelect: fn(),
	},
} satisfies Meta<typeof UserCalendarPage>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
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

export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } }

export const RemotePage: Story = {
	args: {
		tab: 'joined',
		counts: { joined: 42, hosted: 7, articles: 30 },
		hasMore: true,
		onLoadMore: fn(),
		onTabChange: fn(),
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'もっと見る' }))
		await expect(args.onLoadMore).toHaveBeenCalledWith('joined')
		await userEvent.click(canvas.getByRole('button', { name: '記事 30' }))
		await expect(args.onTabChange).toHaveBeenCalledWith('articles')
	},
}
export const LoadingMore: Story = { args: { hasMore: true, onLoadMore: fn(), isLoading: true } }
export const PageError: Story = { args: { error: '続きを読み込めませんでした。', onLoadMore: fn() } }
