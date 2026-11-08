import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CalendarDetail } from './AdventCalendar'
import { getEntryHref, projectProps, sampleSheets } from './fixtures'

const meta = {
	title: '企画/カレンダー詳細',
	component: CalendarDetail,
	parameters: { layout: 'fullscreen' },
	args: {
		...projectProps,
		currentNumber: 2,
		getEntryHref,
		today: 8,
		onJoin: fn(),
		onEditEntry: fn(),
		onShare: fn(),
		onCalendarSelect: fn(),
	},
} satisfies Meta<typeof CalendarDetail>
export default meta
type Story = StoryObj<typeof meta>

export const SecondSheet: Story = {
	name: '2枚目',
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('heading', { name: '2枚目 / 全2枚' })).toBeVisible()
		await expect(canvas.getByRole('link', { name: '1枚目' })).toHaveAttribute('href', projectProps.getCalendarHref(1))
		await userEvent.click(canvas.getByRole('link', { name: '12月16日に参加する' }))
		await expect(args.onJoin).toHaveBeenCalledWith(16)
		await userEvent.click(canvas.getByRole('link', { name: '12月1日 moriの登録を表示' }))
		const row = canvas.getByRole('list', { name: '日付ごとの参加登録' }).children[0]
		await expect(row).toHaveFocus()
		await expect(canvas.getByRole('list', { name: '日付ごとの参加登録' }).children).toHaveLength(25)
		await expect(within(row as HTMLElement).getByText('公開済み')).toBeVisible()
		await userEvent.click(canvas.getByRole('button', { name: '12月4日の自分の登録を編集' }))
		await expect(args.onEditEntry).toHaveBeenCalledWith(
			expect.objectContaining({ uri: sampleSheets[1].entries[3].uri }),
		)
	},
}
export const FirstSheet: Story = { name: '1枚目', args: { currentNumber: 1 } }
export const Mobile: Story = { name: 'モバイル', globals: { viewport: { value: 'mobile1', isRotated: false } } }
export const ReadOnly: Story = { name: '過去年・閲覧のみ', args: { year: 2025, readOnly: true, today: undefined } }
export const MissingSheet: Story = { name: '再配置でなくなった番号', args: { currentNumber: 3 } }
export const LongContent: Story = {
	name: '長い表示名と執筆予定',
	args: {
		sheets: [
			{
				id: 'long',
				number: 1,
				entries: [
					{
						uri: 'at://did:plc:sample/org.atventar.participation/long',
						day: 1,
						author: 'とても長い表示名の参加者',
						title: 'コンポーネントの設計を見直しながらチームで小さな改善を続けた一年の記録',
						status: 'reserved',
					},
				],
			},
		],
		currentNumber: 1,
	},
}
export const StableRegistration: Story = {
	name: '再配置後の登録リンク',
	args: {
		sheets: [
			{ ...sampleSheets[0], entries: sampleSheets[0].entries.filter((entry) => entry.day !== 4) },
			{ ...sampleSheets[1], entries: [sampleSheets[0].entries[3]] },
		],
	},
	play: async ({ canvasElement }) => {
		const list = within(canvasElement).getByRole('list', { name: '日付ごとの参加登録' })
		await expect(within(list).getByRole('link', { name: '12月4日の参加登録' })).toHaveAttribute(
			'href',
			getEntryHref(sampleSheets[0].entries[3].uri),
		)
		await expect(within(list).queryByText('mori')).not.toBeInTheDocument()
	},
}
export const Navigation: Story = {
	name: 'リンクから別の枚へ',
	render: (args) => {
		const [currentNumber, setCurrentNumber] = useState(args.currentNumber)
		return <CalendarDetail {...args} currentNumber={currentNumber} onCalendarSelect={setCurrentNumber} />
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('link', { name: '1枚目' }))
		await expect(canvas.getByRole('heading', { name: '1枚目 / 全2枚' })).toBeVisible()
		await userEvent.click(canvas.getByRole('link', { name: '2枚目' }))
		await expect(canvas.getByRole('heading', { name: '2枚目 / 全2枚' })).toBeVisible()
	},
}
