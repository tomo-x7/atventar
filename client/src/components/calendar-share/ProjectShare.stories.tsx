import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ProjectShare } from './ProjectShare'

const clipboardWrite = fn(async (_text: string) => {})
const projectHref = 'https://example.com/calendars/frontend-2026'
const recordHref = 'https://example.com/records/entry-8f2a'

const meta = {
	title: '企画/共有',
	component: ProjectShare,
	parameters: { layout: 'centered' },
	args: { projectName: 'フロントエンド', year: 2026, projectHref },
	beforeEach: () => {
		const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
		clipboardWrite.mockReset().mockResolvedValue(undefined)
		Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboardWrite } })
		return () => {
			if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor)
			else Reflect.deleteProperty(navigator, 'clipboard')
		}
	},
} satisfies Meta<typeof ProjectShare>
export default meta
type Story = StoryObj<typeof meta>

export const Project: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('textbox', { name: '共有文' })).toHaveValue(`フロントエンド 2026\n${projectHref}`)
		await expect(canvas.queryByRole('status')).not.toBeInTheDocument()
		await expect(canvas.queryByRole('button', { name: '共有する' })).not.toBeInTheDocument()
	},
}
export const Participant: Story = {
	args: { isParticipant: true, day: 12, recordHref },
	play: async ({ canvasElement }) => {
		const text = within(canvasElement).getByRole('textbox', { name: '共有文' })
		await expect(text).toHaveValue(`フロントエンド 2026\n12月12日に参加します。\n${recordHref}`)
		await expect((text as HTMLTextAreaElement).value).not.toMatch(/シート|sheet|枚目/)
	},
}
export const ParticipantWithoutDay: Story = {
	args: { isParticipant: true, recordHref },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole('textbox', { name: '共有文' })).toHaveValue(
			`フロントエンド 2026\n参加します。\n${recordHref}`,
		)
	},
}
export const ParticipantWithoutRecordLink: Story = {
	args: { isParticipant: true, day: 8 },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole('textbox', { name: '共有文' })).toHaveValue(
			`フロントエンド 2026\n12月8日に参加します。\n${projectHref}`,
		)
	},
}
export const ProjectIgnoresParticipantFields: Story = {
	args: { isParticipant: false, day: 12, recordHref },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole('textbox', { name: '共有文' })).toHaveValue(
			`フロントエンド 2026\n${projectHref}`,
		)
	},
}
export const Copy: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'コピー' }))
		await expect(clipboardWrite).toHaveBeenCalledWith(`フロントエンド 2026\n${projectHref}`)
		await expect(canvas.getByRole('status')).toHaveTextContent('コピーしました')
	},
}
export const CopyFailure: Story = {
	play: async ({ canvasElement }) => {
		clipboardWrite.mockRejectedValueOnce(new Error('Clipboard unavailable'))
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'コピー' }))
		await expect(canvas.getByRole('status')).toHaveTextContent('コピーできませんでした')
		await expect(canvas.getByRole('textbox', { name: '共有文' })).toHaveValue(`フロントエンド 2026\n${projectHref}`)
	},
}
export const NativeShare: Story = {
	args: { isParticipant: true, day: 12, recordHref, onShare: fn() },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: '共有する' }))
		await expect(args.onShare).toHaveBeenCalledWith({
			text: `フロントエンド 2026\n12月12日に参加します。\n${recordHref}`,
			url: recordHref,
		})
		await expect(canvas.getByRole('status')).toHaveTextContent('共有しました')
	},
}
export const Mobile: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } }
