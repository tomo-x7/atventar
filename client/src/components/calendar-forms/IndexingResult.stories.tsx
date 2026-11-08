import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { IndexingResult } from './IndexingResult'

const meta = {
	title: 'Forms/反映結果',
	component: IndexingResult,
	parameters: { layout: 'centered' },
	args: {
		title: 'カレンダーを保存しました',
		projectName: 'ものづくり Advent Calendar 2026',
		pending: true,
		recordHref: '/projects/example',
		onCheck: fn(),
		onShare: fn(),
	},
} satisfies Meta<typeof IndexingResult>
export default meta
type Story = StoryObj<typeof meta>
export const AwaitingIndex: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('status')).toHaveTextContent('保存しました。反映を待っています。')
		await userEvent.click(canvas.getByRole('button', { name: '反映を確認' }))
		await expect(args.onCheck).toHaveBeenCalledOnce()
		await expect(canvas.queryByRole('link', { name: '登録内容を見る' })).not.toBeInTheDocument()
	},
}
export const Complete: Story = {
	args: { pending: false },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('status')).toHaveTextContent('カレンダーに反映しました。')
		await expect(canvas.getByRole('link', { name: '登録内容を見る' })).toHaveAttribute('href', '/projects/example')
		await expect(canvas.queryByRole('button', { name: '反映を確認' })).not.toBeInTheDocument()
		await userEvent.click(canvas.getByRole('button', { name: '共有する' }))
		await expect(args.onShare).toHaveBeenCalledOnce()
	},
}
export const Checking: Story = { args: { isChecking: true } }
export const CheckError: Story = { args: { error: '接続を確認して再試行してください。' } }
export const Participation: Story = { args: { title: '参加を登録しました', day: 12 } }
