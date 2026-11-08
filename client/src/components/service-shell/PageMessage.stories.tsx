import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ContentLayout, PageMessage } from './ServiceShell'

const meta = {
	title: 'サービス/ページメッセージ',
	component: PageMessage,
	parameters: { layout: 'fullscreen' },
	args: { title: '読み込めませんでした', onRetry: fn() },
} satisfies Meta<typeof PageMessage>
export default meta
type Story = StoryObj<typeof meta>
export const LoadError: Story = {}
export const NotFound: Story = { args: { title: '企画が見つかりません', onRetry: undefined } }
export const Content: Story = {
	render: () => (
		<ContentLayout>
			<h1>参加登録</h1>
			<p>ログインしてください。</p>
		</ContentLayout>
	),
}
