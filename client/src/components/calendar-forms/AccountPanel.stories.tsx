import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { AccountPanel } from './AccountPanel'

const meta = {
	title: 'Forms/Account',
	component: AccountPanel,
	parameters: { layout: 'centered' },
	args: { onSignIn: fn(), onSave: fn(), onSignOut: fn(), onDelete: fn() },
} satisfies Meta<typeof AccountPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Login: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'GitHub でログイン' }))
		await expect(args.onSignIn).toHaveBeenCalledWith('GitHub')
	},
}

export const Settings: Story = {
	args: { profile: { name: '鈴木 はる', bio: 'Webと暮らしのことを書いています。', website: 'https://example.com' } },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.clear(canvas.getByLabelText('表示名'))
		await userEvent.type(canvas.getByLabelText('表示名'), 'はる')
		await userEvent.click(canvas.getByRole('button', { name: '保存する' }))
		await expect(args.onSave).toHaveBeenCalledWith({
			name: 'はる',
			bio: 'Webと暮らしのことを書いています。',
			website: 'https://example.com',
		})
		await expect(canvas.getByRole('status')).toHaveTextContent('プロフィールを保存しました')
	},
}

export const DeleteAccount: Story = {
	args: { ...Settings.args },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: 'アカウントを削除' }))
		await expect(args.onDelete).not.toHaveBeenCalled()
		await userEvent.click(canvas.getByRole('button', { name: '削除する' }))
		await expect(args.onDelete).toHaveBeenCalledOnce()
		await expect(canvas.getByRole('status')).toHaveTextContent('アカウントを削除しました')
	},
}

export const Saving: Story = {
	args: { ...Settings.args, isSubmitting: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		for (const field of canvas.getAllByRole('textbox')) {
			await expect(field).toBeDisabled()
		}
	},
}

export const SaveError: Story = {
	args: { ...Settings.args, error: 'プロフィールを保存できませんでした。' },
}

export const LoginError: Story = {
	args: { error: 'ログインできませんでした。' },
}
