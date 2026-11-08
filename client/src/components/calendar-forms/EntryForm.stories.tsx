import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { EntryForm } from './EntryForm'

const meta = {
	title: 'Forms/Entry',
	component: EntryForm,
	parameters: { layout: 'centered' },
	args: {
		calendarTitle: 'フロントエンド Advent Calendar 2026',
		sheet: 2,
		day: 12,
		participant: '鈴木 はる',
		onSave: fn(),
		onCancel: fn(),
	},
} satisfies Meta<typeof EntryForm>

export default meta
type Story = StoryObj<typeof meta>

export const Join: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.type(canvas.getByLabelText('書く内容'), 'CSSについて書きます')
		await userEvent.click(canvas.getByRole('button', { name: '参加を登録' }))
		await expect(args.onSave).toHaveBeenCalledWith({ title: 'CSSについて書きます', url: '', comment: '' })
		await expect(canvas.getByRole('status')).toHaveTextContent('参加を登録しました')
	},
}

export const WritingContentRequired: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: '参加を登録' }))
		await expect(canvas.getByLabelText('書く内容')).toBeInvalid()
		await expect(args.onSave).not.toHaveBeenCalled()
	},
}

export const EditArticle: Story = {
	args: {
		mode: 'edit',
		initialValue: {
			title: '小さく始めるデザインシステム',
			url: 'https://example.com/articles/design-system',
			comment: '実際に運用してみた記録です。',
		},
		onWithdraw: fn(),
	},
}

export const Withdraw: Story = {
	args: { ...EditArticle.args },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: '参加登録を取り消す' }))
		await expect(args.onWithdraw).not.toHaveBeenCalled()
		await userEvent.click(canvas.getByRole('button', { name: '参加を取り消す' }))
		await expect(args.onWithdraw).toHaveBeenCalledOnce()
		await expect(canvas.getByRole('status')).toHaveTextContent('参加登録を取り消しました')
	},
}

export const InvalidArticleUrl: Story = {
	args: { mode: 'edit' },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.type(canvas.getByLabelText('書く内容'), '小さく始めるデザインシステム')
		await userEvent.type(canvas.getByLabelText('記事URL'), 'javascript:alert(1)')
		await userEvent.click(canvas.getByRole('button', { name: '保存する' }))
		await expect(args.onSave).not.toHaveBeenCalled()
		await expect(canvas.getByLabelText('記事URL')).toBeInvalid()
	},
}

export const Saving: Story = {
	args: { ...EditArticle.args, isSubmitting: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		for (const field of canvas.getAllByRole('textbox')) {
			await expect(field).toBeDisabled()
		}
	},
}

export const RegistrationError: Story = {
	args: { error: '参加を登録できませんでした。' },
}
