import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ParticipationDetail } from './AdventCalendar'
import { projectProps, sampleSheets } from './fixtures'

const meta = {
	title: '企画/参加登録',
	component: ParticipationDetail,
	parameters: { layout: 'fullscreen' },
	args: {
		projectTitle: projectProps.title,
		year: 2026,
		projectHref: projectProps.projectHref,
		entry: sampleSheets[0].entries[3],
		placement: { calendarNumber: 2, href: projectProps.getCalendarHref(2) },
		shareHref: projectProps.shareHref,
		onEditEntry: fn(),
		onShare: fn(),
	},
} satisfies Meta<typeof ParticipationDetail>
export default meta
type Story = StoryObj<typeof meta>
export const Current: Story = {
	name: '現在の配置',
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('link', { name: '現在のカレンダー：2枚目' })).toHaveAttribute(
			'href',
			projectProps.getCalendarHref(2),
		)
		await userEvent.click(canvas.getByRole('button', { name: '自分の登録を編集' }))
		await expect(args.onEditEntry).toHaveBeenCalledWith(
			expect.objectContaining({ uri: sampleSheets[0].entries[3].uri }),
		)
	},
}
export const Relocated: Story = {
	name: '同じ登録が1枚目に移動',
	args: { placement: { calendarNumber: 1, href: projectProps.getCalendarHref(1) } },
}
export const AwaitingIndex: Story = { name: '配置の反映待ち', args: { placement: undefined } }
export const OtherParticipant: Story = {
	name: '他の参加者',
	args: { entry: sampleSheets[0].entries[0] },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).queryByRole('button', { name: '自分の登録を編集' })).not.toBeInTheDocument()
	},
}
