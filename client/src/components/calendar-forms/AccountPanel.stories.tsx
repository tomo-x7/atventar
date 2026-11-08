import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { AccountPanel } from './AccountPanel'

const meta = {
	title: 'Forms/Login',
	component: AccountPanel,
	parameters: { layout: 'centered' },
	args: { onSignIn: fn() },
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

export const SigningIn: Story = {
	args: { isSubmitting: true },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		for (const button of canvas.getAllByRole('button')) {
			await expect(button).toBeDisabled()
		}
	},
}

export const LoginError: Story = {
	args: { error: 'ログインできませんでした。' },
}
