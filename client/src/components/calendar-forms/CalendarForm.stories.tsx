import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CalendarForm } from './CalendarForm'

const meta = {
	title: 'Forms/Calendar',
	component: CalendarForm,
	parameters: { layout: 'centered' },
	args: { currentYear: 2026, onSave: fn(), onCancel: fn() },
} satisfies Meta<typeof CalendarForm>

export default meta
type Story = StoryObj<typeof meta>

export const Create: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.type(canvas.getByLabelText('タイトル'), 'ものづくり Advent Calendar')
		await userEvent.click(canvas.getByRole('button', { name: '作成する' }))
		await expect(args.onSave).toHaveBeenCalledWith({
			title: 'ものづくり Advent Calendar',
			year: 2026,
			description: '',
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
		},
	},
}

export const Saving: Story = {
	args: { ...Edit.args, isSubmitting: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('button', { name: '保存中…' })).toBeDisabled()
		for (const field of canvas.getAllByRole('textbox')) {
			await expect(field).toBeDisabled()
		}
	},
}

export const SaveError: Story = {
	args: { ...Edit.args, error: 'カレンダーを保存できませんでした。' },
}

export const NextYear: Story = {
	args: { currentYear: 2027 },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('heading', { name: '2027年のカレンダーを作成' })).toBeVisible()
		await expect(canvas.queryByRole('spinbutton')).not.toBeInTheDocument()
		await userEvent.type(canvas.getByLabelText('タイトル'), 'ものづくり')
		await userEvent.click(canvas.getByRole('button', { name: '作成する' }))
		await expect(args.onSave).toHaveBeenCalledWith({ title: 'ものづくり', year: 2027, description: '' })
	},
}

export const EditPastYear: Story = {
	args: { ...Edit.args, currentYear: 2027, initialValue: { title: 'ものづくり', year: 2025, description: '' } },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('heading', { name: '2025年のカレンダーを編集' })).toBeVisible()
		await userEvent.click(canvas.getByRole('button', { name: '保存する' }))
		await expect(args.onSave).toHaveBeenCalledWith({ title: 'ものづくり', year: 2025, description: '' })
	},
}
