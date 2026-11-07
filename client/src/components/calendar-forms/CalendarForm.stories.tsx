import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CalendarForm } from './CalendarForm'

const meta = {
	title: 'Forms/Calendar',
	component: CalendarForm,
	parameters: { layout: 'centered' },
	args: { onSave: fn(), onCancel: fn() },
} satisfies Meta<typeof CalendarForm>

export default meta
type Story = StoryObj<typeof meta>

export const Create: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.type(canvas.getByLabelText('タイトル'), 'ものづくり Advent Calendar')
		await userEvent.clear(canvas.getByLabelText('カレンダー枚数'))
		await userEvent.type(canvas.getByLabelText('カレンダー枚数'), '3')
		await userEvent.click(canvas.getByRole('button', { name: '作成する' }))
		await expect(args.onSave).toHaveBeenCalledWith({
			title: 'ものづくり Advent Calendar',
			year: 2026,
			description: '',
			sheetCount: 3,
		})
		await expect(canvas.getByRole('status')).toHaveTextContent('カレンダーを作成しました')
	},
}

export const Edit: Story = {
	args: {
		mode: 'edit',
		initialValue: {
			title: 'フロントエンド Advent Calendar',
			year: 2026,
			description: '今年つくったものや、気づいたことを書きます。',
			sheetCount: 2,
		},
		onDelete: fn(),
	},
}

export const DeleteConfirmation: Story = {
	args: { ...Edit.args },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'カレンダーを削除' }))
		await expect(canvas.getByRole('alertdialog')).toBeVisible()
		await userEvent.click(canvas.getByRole('button', { name: '戻る' }))
		await expect(args.onDelete).not.toHaveBeenCalled()
		await expect(canvas.queryByRole('alertdialog')).not.toBeInTheDocument()
	},
}

export const Saving: Story = {
	args: { ...Edit.args, isSubmitting: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('button', { name: '保存中…' })).toBeDisabled()
		await expect(canvas.getByRole('button', { name: 'カレンダーを削除' })).toBeDisabled()
	},
}

export const SaveError: Story = {
	args: { ...Edit.args, error: 'カレンダーを保存できませんでした。' },
}
