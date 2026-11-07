import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CalendarCollection } from '../advent-calendar/AdventCalendar'
import { sampleSheets } from '../advent-calendar/fixtures'
import { ServiceHelp, ServiceShell, ServiceState } from './ServiceShell'

const meta = {
	title: '共通/サービス',
	component: ServiceShell,
	parameters: { layout: 'fullscreen' },
	args: {
		onNavigate: fn(),
		children: (
			<CalendarCollection
				year={2026}
				title="ものづくりとWeb"
				description="Webの技術、デザイン、日々の制作について書くカレンダーです。"
				organizer="mori"
				sheets={sampleSheets}
				onJoin={fn()}
			/>
		),
	},
} satisfies Meta<typeof ServiceShell>
export default meta
type Story = StoryObj<typeof meta>
export const Guest: Story = { name: '未ログイン' }
export const LoggedIn: Story = {
	name: 'ログイン済み',
	args: { user: 'mori' },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: /^mori$/ }))
		await expect(args.onNavigate).toHaveBeenCalledWith('profile')
	},
}
export const Help: Story = {
	name: 'ヘルプ',
	args: { active: 'help', children: <ServiceHelp /> },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByText('カレンダーを増やすには？'))
		await expect(
			canvas.getByText(
				'主催者は同じ企画にカレンダーを追加できます。それぞれのカレンダーに12月1日から25日までの参加枠があります。',
			),
		).toBeVisible()
	},
}
export const Loading: Story = { name: '読み込み中', args: { children: <ServiceState state="loading" /> } }
export const LoadError: Story = { name: '取得失敗', args: { children: <ServiceState state="error" onRetry={fn()} /> } }
export const NotFound: Story = {
	name: '見つからない',
	args: { children: <ServiceState state="not-found" onRetry={fn()} /> },
}
export const Mobile: Story = { name: 'モバイル', globals: { viewport: { value: 'mobile1', isRotated: false } } }
