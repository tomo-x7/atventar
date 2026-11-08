import type { Meta, StoryObj } from '@storybook/react-vite'
import { act, useEffect, useRef, useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { EntryForm, type EntryFormProps, type EntrySubmissionState } from './EntryForm'

const indexingCompletions = new WeakMap<Element, () => void>()

function RegistrationDemo({ onSave, ...args }: EntryFormProps) {
	const [submissionState, setSubmissionState] = useState<EntrySubmissionState>('idle')
	const root = useRef<HTMLDivElement>(null)
	useEffect(() => {
		const element = root.current
		if (!element) return
		indexingCompletions.set(element, () => setSubmissionState('complete'))
		return () => {
			indexingCompletions.delete(element)
		}
	}, [])
	return (
		<div ref={root} data-testid="entry-flow">
			<EntryForm
				{...args}
				submissionState={submissionState}
				onSave={(value) => {
					onSave?.(value)
					setSubmissionState('awaiting-index')
				}}
			/>
		</div>
	)
}

function WithdrawalDemo({ onWithdraw, ...args }: EntryFormProps) {
	const [withdrawalState, setWithdrawalState] = useState<EntrySubmissionState>('idle')
	return (
		<EntryForm
			{...args}
			withdrawalState={withdrawalState}
			onWithdraw={() => {
				onWithdraw?.()
				setWithdrawalState('complete')
			}}
		/>
	)
}

const meta = {
	title: 'Forms/Entry',
	component: EntryForm,
	parameters: { layout: 'centered' },
	args: {
		calendarTitle: 'フロントエンド Advent Calendar 2026',
		day: 12,
		participant: '鈴木 はる',
		onSave: fn(),
		onCancel: fn(),
	},
} satisfies Meta<typeof EntryForm>

export default meta
type Story = StoryObj<typeof meta>

export const Join: Story = {
	render: (args) => <RegistrationDemo {...args} />,
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.selectOptions(canvas.getByLabelText('担当日'), '18')
		await userEvent.type(canvas.getByLabelText('書く内容'), 'CSSについて書きます')
		await userEvent.click(canvas.getByRole('button', { name: '参加を登録' }))
		await expect(args.onSave).toHaveBeenCalledWith({ day: 18, title: 'CSSについて書きます', url: '', comment: '' })
		await expect(canvas.getByRole('status')).toHaveTextContent(
			'参加登録を保存しました。カレンダーへの反映を待っています。',
		)
		await expect(canvas.getByRole('button', { name: '反映待ち' })).toBeDisabled()
		await act(async () => {
			indexingCompletions.get(canvas.getByTestId('entry-flow'))?.()
		})
		await expect(canvas.getByRole('heading', { name: '参加を登録しました' })).toBeVisible()
		await expect(canvas.getByRole('status')).toHaveTextContent('フロントエンド Advent Calendar 2026 · 12月18日')
	},
}

export const SelectDate: Story = {
	args: { day: undefined },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getAllByRole('option')).toHaveLength(25)
		await userEvent.selectOptions(canvas.getByLabelText('担当日'), '25')
		await expect(canvas.getByLabelText('担当日')).toHaveValue('25')
	},
}

export const InvalidInitialDate: Story = {
	args: { day: 99 },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByLabelText('担当日')).toHaveValue('1')
		await userEvent.type(canvas.getByLabelText('書く内容'), 'CSSについて書きます')
		await userEvent.click(canvas.getByRole('button', { name: '参加を登録' }))
		await expect(args.onSave).toHaveBeenCalledWith({ day: 1, title: 'CSSについて書きます', url: '', comment: '' })
	},
}

export const WritingContentRequired: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: '参加を登録' }))
		await expect(canvas.getByLabelText('書く内容')).toBeInvalid()
		await expect(args.onSave).not.toHaveBeenCalled()
	},
}

export const EditArticle: Story = {
	args: {
		mode: 'edit',
		initialValue: {
			title: '小さく始めるデザインシステム',
			url: 'https://example.com/articles/design-system',
			comment: '実際に運用してみた記録です。',
		},
		onWithdraw: fn(),
	},
}

export const Withdraw: Story = {
	args: { ...EditArticle.args },
	render: (args) => <WithdrawalDemo {...args} />,
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: '参加登録を取り消す' }))
		await expect(args.onWithdraw).not.toHaveBeenCalled()
		await userEvent.click(canvas.getByRole('button', { name: '参加を取り消す' }))
		await expect(args.onWithdraw).toHaveBeenCalledOnce()
		await expect(canvas.getByRole('status')).toHaveTextContent('12月12日の参加登録を取り消しました。')
	},
}

export const InvalidArticleUrl: Story = {
	args: { mode: 'edit' },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.type(canvas.getByLabelText('書く内容'), '小さく始めるデザインシステム')
		await userEvent.type(canvas.getByLabelText('記事URL'), 'javascript:alert(1)')
		await userEvent.click(canvas.getByRole('button', { name: '保存する' }))
		await expect(args.onSave).not.toHaveBeenCalled()
		await expect(canvas.getByLabelText('記事URL')).toBeInvalid()
	},
}

export const Saving: Story = {
	args: { ...EditArticle.args, submissionState: 'submitting' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		for (const field of [...canvas.getAllByRole('textbox'), canvas.getByRole('combobox')]) {
			await expect(field).toBeDisabled()
		}
	},
}

export const AwaitingIndex: Story = {
	args: { submissionState: 'awaiting-index', initialValue: { title: 'CSSについて書きます' } },
}

export const Complete: Story = {
	args: { submissionState: 'complete', recordHref: 'https://example.com/registrations/haru-2026', onShare: fn() },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: '共有する' }))
		await expect(args.onShare).toHaveBeenCalledOnce()
		await expect(canvas.getByRole('link', { name: '登録内容を見る' })).toHaveAttribute('href', args.recordHref)
	},
}

export const RegistrationError: Story = {
	args: {
		submissionState: 'error',
		error: '参加登録を保存できませんでした。',
		initialValue: { title: 'CSSについて書きます' },
	},
}

export const WithdrawalAwaitingIndex: Story = {
	args: { ...EditArticle.args, withdrawalState: 'awaiting-index' },
}

export const WithdrawalError: Story = {
	args: { ...EditArticle.args, withdrawalState: 'error', withdrawalError: '参加登録を取り消せませんでした。' },
}
