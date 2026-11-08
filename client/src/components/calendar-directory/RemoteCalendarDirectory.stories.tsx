import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { calendarSummaries } from './fixtures'
import { RemoteCalendarDirectory, type RemoteCalendarDirectoryProps } from './RemoteCalendarDirectory'

function DirectoryDemo(args: RemoteCalendarDirectoryProps) {
	const [query, setQuery] = useState(args.query)
	const [year, setYear] = useState(args.year)
	return (
		<RemoteCalendarDirectory
			{...args}
			query={query}
			year={year}
			onQueryChange={(value) => {
				setQuery(value)
				args.onQueryChange(value)
			}}
			onYearChange={(value) => {
				setYear(value)
				args.onYearChange?.(value)
			}}
		/>
	)
}

const meta = {
	title: '一覧/サーバーページング',
	component: RemoteCalendarDirectory,
	parameters: { layout: 'fullscreen' },
	args: {
		query: '',
		year: 2026,
		years: [2026, 2025, 2024],
		onQueryChange: fn(),
		onYearChange: fn(),
		onSearch: fn(),
		calendars: calendarSummaries.slice(0, 4),
		hasMore: true,
		onLoadMore: fn(),
		onCalendarSelect: fn(),
		onCreate: fn(),
	},
	render: (args) => <DirectoryDemo {...args} />,
} satisfies Meta<typeof RemoteCalendarDirectory>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement)
		await userEvent.type(canvas.getByLabelText('検索'), 'React')
		await userEvent.click(canvas.getByRole('button', { name: '検索する' }))
		await expect(args.onQueryChange).toHaveBeenLastCalledWith('React')
		await expect(args.onSearch).toHaveBeenCalledOnce()
		await userEvent.click(canvas.getByRole('button', { name: 'もっと見る' }))
		await expect(args.onLoadMore).toHaveBeenCalledOnce()
	},
}
export const Loading: Story = { args: { isLoading: true } }
export const LoadError: Story = { args: { error: 'カレンダーを読み込めませんでした。' } }
export const Empty: Story = { args: { calendars: [], hasMore: false } }
export const LastPage: Story = { args: { hasMore: false } }
