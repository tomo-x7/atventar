import { useId } from 'react'
import '../theme.css'
import { CalendarRows, type CalendarSummary } from './CalendarDirectory'
import styles from './CalendarDirectory.module.css'

export interface RemoteCalendarDirectoryProps {
	query: string
	onQueryChange: (query: string) => void
	year: number
	years?: number[]
	onYearChange?: (year: number) => void
	onSearch: () => void
	calendars: CalendarSummary[]
	hasMore: boolean
	onLoadMore: () => void
	isLoading?: boolean
	error?: string
	onCreate?: () => void
	onCalendarSelect?: (calendar: CalendarSummary) => void
}

export function YearNavigation({
	years,
	year,
	onSelect,
}: {
	years: number[]
	year: number
	onSelect: (year: number) => void
}) {
	return (
		<div className={`${styles.root} ${styles.yearNavigation}`}>
			<fieldset className={styles.years} aria-label="年を選択">
				{[...new Set(years)]
					.sort((a, b) => b - a)
					.map((value) => (
						<button key={value} type="button" aria-pressed={year === value} onClick={() => onSelect(value)}>
							{value}年
						</button>
					))}
			</fieldset>
		</div>
	)
}

export function RemoteCalendarDirectory({
	query,
	onQueryChange,
	year,
	years = [],
	onYearChange,
	onSearch,
	calendars,
	hasMore,
	onLoadMore,
	isLoading = false,
	error,
	onCreate,
	onCalendarSelect,
}: RemoteCalendarDirectoryProps) {
	const id = useId()
	const selectableYears = [...new Set([year, ...years])].sort((a, b) => b - a)
	return (
		<section className={styles.root} aria-labelledby={`${id}-title`}>
			<header className={styles.heading}>
				<h1 id={`${id}-title`}>{year}年のカレンダー</h1>
				{onCreate && (
					<button className={styles.primary} type="button" onClick={onCreate}>
						カレンダーを作る
					</button>
				)}
			</header>
			<form
				className={styles.filters}
				onSubmit={(event) => {
					event.preventDefault()
					if (!isLoading) onSearch()
				}}
			>
				<label htmlFor={`${id}-year`}>
					年
					<select
						id={`${id}-year`}
						value={year}
						disabled={!onYearChange || isLoading}
						onChange={(event) => onYearChange?.(Number(event.currentTarget.value))}
					>
						{selectableYears.map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</select>
				</label>
				<label className={styles.search} htmlFor={`${id}-query`}>
					検索
					<input
						id={`${id}-query`}
						type="search"
						value={query}
						onChange={(event) => onQueryChange(event.currentTarget.value)}
						disabled={isLoading}
					/>
				</label>
				<button type="submit" disabled={isLoading}>
					検索する
				</button>
			</form>
			{calendars.length > 0 && <CalendarRows calendars={calendars} onCalendarSelect={onCalendarSelect} />}
			{!calendars.length && !isLoading && !error && <p className={styles.empty}>カレンダーはありません</p>}
			{isLoading && <output className={styles.resultCount}>読み込み中…</output>}
			{error && <p role="alert">{error}</p>}
			{error && (
				<button
					className={styles.more}
					type="button"
					onClick={calendars.length ? onLoadMore : onSearch}
					disabled={isLoading}
				>
					再試行
				</button>
			)}
			{hasMore && !error && (
				<button className={styles.more} type="button" onClick={onLoadMore} disabled={isLoading}>
					{isLoading ? '読み込み中…' : 'もっと見る'}
				</button>
			)}
		</section>
	)
}
