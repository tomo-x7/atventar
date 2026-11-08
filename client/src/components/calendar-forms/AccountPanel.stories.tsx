import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { AccountPanel } from './AccountPanel'

const meta = {
	title: 'Forms/Login',
	component: AccountPanel,
	parameters: { layout: 'centered' },
	args: { onSignIn: fn(), onAtPassport: fn() },
} satisfies Meta<typeof AccountPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Login: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.type(canvas.getByLabelText('ハンドル'), '@tomo.bsky.social')
		await userEvent.click(canvas.getByRole('button', { name: /^ログイン$/ }))
		await expect(args.onSignIn).toHaveBeenCalledWith('tomo.bsky.social')
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

export const AtPassport: Story = {
	play: async ({ canvasElement, args }) => {
		await userEvent.click(within(canvasElement).getByRole('button', { name: 'AtPassportでログイン' }))
		await expect(args.onAtPassport).toHaveBeenCalledOnce()
	},
}
