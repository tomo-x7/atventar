import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { CalendarSheet } from '../advent-calendar/AdventCalendar'
import { makeSheet } from '../advent-calendar/fixtures'
import { CalendarManagement, type CalendarManagementProps } from './CalendarManagement'

function ManagementExample(args: CalendarManagementProps) {
	const [sheets, setSheets] = useState<CalendarSheet[]>(args.sheets)
	const [nextId, setNextId] = useState(1)
	return (
		<CalendarManagement
			{...args}
			sheets={sheets}
			onAddSheet={(name) => {
				args.onAddSheet(name)
				setSheets((current) => [...current, { id: `new-${nextId}`, name, entries: [] }])
				setNextId((value) => value + 1)
			}}
			onRenameSheet={(id, name) => {
				args.onRenameSheet(id, name)
				setSheets((current) => current.map((sheet) => (sheet.id === id ? { ...sheet, name } : sheet)))
			}}
			onRemoveSheet={(id) => {
				args.onRemoveSheet(id)
				setSheets((current) => current.filter((sheet) => sheet.id !== id))
			}}
			onRemoveEntry={(id, day) => {
				args.onRemoveEntry(id, day)
				setSheets((current) =>
					current.map((sheet) =>
						sheet.id === id ? { ...sheet, entries: sheet.entries.filter((entry) => entry.day !== day) } : sheet,
					),
				)
			}}
		/>
	)
}

const meta = {
	title: '管理/カレンダー・参加登録',
	component: CalendarManagement,
	parameters: { layout: 'fullscreen' },
	args: {
		title: 'フロントエンド',
		sheets: [
			makeSheet('first', 'カレンダー 1', 3),
			makeSheet('second', 'カレンダー 2', 1),
			makeSheet('third', 'カレンダー 3', 0),
		],
		onAddSheet: fn(),
		onRenameSheet: fn(),
		onRemoveSheet: fn(),
		onRemoveEntry: fn(),
	},
	render: (args) => <ManagementExample {...args} />,
} satisfies Meta<typeof CalendarManagement>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const AddSheet: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.type(canvas.getByRole('textbox', { name: '追加するカレンダーの名前' }), 'カレンダー 4')
		await userEvent.click(canvas.getByRole('button', { name: '追加する' }))
		await expect(canvas.getByRole('heading', { name: 'カレンダー 4枚' })).toBeVisible()
		await expect(canvas.getByRole('textbox', { name: 'カレンダー 4の名前' })).toHaveValue('カレンダー 4')
	},
}
export const RenameSheet: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.clear(canvas.getByRole('textbox', { name: 'カレンダー 3の名前' }))
		await userEvent.type(canvas.getByRole('textbox', { name: 'カレンダー 3の名前' }), '追加枠')
		await userEvent.click(canvas.getAllByRole('button', { name: '名前を保存' })[2])
		await expect(canvas.getByRole('textbox', { name: '追加枠の名前' })).toHaveValue('追加枠')
	},
}
export const RemoveEmptySheet: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('button', { name: 'カレンダー 1を削除（参加登録あり）' })).toBeDisabled()
		await userEvent.click(canvas.getByRole('button', { name: 'カレンダー 3を削除' }))
		await expect(canvas.queryByRole('textbox', { name: 'カレンダー 3の名前' })).not.toBeInTheDocument()
	},
}
export const RemoveEntry: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'カレンダー 2 12月1日 moriの登録を削除' }))
		const dialog = within(canvas.getByRole('dialog', { name: '参加登録を削除' }))
		await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
		await expect(
			canvas.queryByRole('button', { name: 'カレンダー 2 12月1日 moriの登録を削除' }),
		).not.toBeInTheDocument()
		await expect(canvas.getByRole('button', { name: 'カレンダー 2を削除' })).toBeEnabled()
	},
}
export const CancelRemoval: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'カレンダー 2 12月1日 moriの登録を削除' }))
		await userEvent.click(within(canvas.getByRole('dialog')).getByRole('button', { name: 'キャンセル' }))
		await expect(canvas.getByRole('button', { name: 'カレンダー 2 12月1日 moriの登録を削除' })).toBeVisible()
	},
}
export const Empty: Story = { args: { sheets: [] } }
