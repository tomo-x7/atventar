import { useId, useState } from 'react'
import '../theme.css'
import styles from './CalendarDirectory.module.css'

export interface CalendarSummary {
	id: string
	title: string
	year: number
	owner: string
	participants: number
	sheets?: number
	createdAt: string
}

export interface ArticleSummary {
	id: string
	title: string
	calendarTitle: string
	date: string
	url: string
}

export type ProfileTab = 'joined' | 'hosted' | 'articles'

type CalendarSelect = (calendar: CalendarSummary) => void

export function CalendarRows({
	calendars,
	onCalendarSelect,
}: {
	calendars: CalendarSummary[]
	onCalendarSelect?: CalendarSelect
}) {
	const showSheets = calendars.some((calendar) => calendar.sheets !== undefined)
	return (
		<div className={styles.tableScroll}>
			<table className={styles.table} data-show-sheets={showSheets}>
				<thead>
					<tr>
						<th scope="col">カレンダー</th>
						<th scope="col">年</th>
						<th scope="col">主催</th>
						<th scope="col">参加登録</th>
						{showSheets && <th scope="col">枚数</th>}
					</tr>
				</thead>
				<tbody>
					{calendars.map((calendar) => (
						<tr key={calendar.id}>
							<th scope="row">
								{onCalendarSelect ? (
									<button className={styles.titleButton} type="button" onClick={() => onCalendarSelect(calendar)}>
										{calendar.title}
									</button>
								) : (
									calendar.title
								)}
							</th>
							<td className={styles.numeric}>{calendar.year}年</td>
							<td>@{calendar.owner}</td>
							<td className={styles.numeric}>{calendar.participants}件</td>
							{showSheets && (
								<td className={styles.numeric}>{calendar.sheets === undefined ? '—' : `${calendar.sheets}枚`}</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export function CalendarDirectory({
	calendars,
	initialYear = 2026,
	pageSize = 8,
	onCalendarSelect,
	onCreate,
}: {
	calendars: CalendarSummary[]
	initialYear?: number
	pageSize?: number
	onCalendarSelect?: CalendarSelect
	onCreate?: () => void
}) {
	const id = useId()
	const [year, setYear] = useState(initialYear)
	const [query, setQuery] = useState('')
	const [sort, setSort] = useState('newest')
	const [visibleCount, setVisibleCount] = useState(Math.max(1, pageSize))
	const years = [...new Set([initialYear, ...calendars.map((calendar) => calendar.year)])].sort((a, b) => b - a)
	const matching = calendars
		.filter(
			(calendar) =>
				calendar.year === year &&
				`${calendar.title} ${calendar.owner}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
		)
		.sort((a, b) =>
			sort === 'popular'
				? b.participants - a.participants
				: sort === 'title'
					? a.title.localeCompare(b.title, 'ja')
					: b.createdAt.localeCompare(a.createdAt),
		)
	function resetFilters() {
		setQuery('')
		setSort('newest')
		setVisibleCount(Math.max(1, pageSize))
	}
	return (
		<section className={styles.root} aria-labelledby={`${id}-title`}>
			<header className={styles.heading}>
				<h1 id={`${id}-title`}>カレンダー</h1>
				{onCreate && (
					<button className={styles.primary} type="button" onClick={onCreate}>
						カレンダーを作る
					</button>
				)}
			</header>
			<div className={styles.filters}>
				<label htmlFor={`${id}-year`}>
					年
					<select
						id={`${id}-year`}
						value={year}
						onChange={(event) => {
							setYear(Number(event.target.value))
							setVisibleCount(Math.max(1, pageSize))
						}}
					>
						{years.map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</select>
				</label>
				<label className={styles.search} htmlFor={`${id}-search`}>
					検索
					<input
						id={`${id}-search`}
						type="search"
						value={query}
						onChange={(event) => {
							setQuery(event.target.value)
							setVisibleCount(Math.max(1, pageSize))
						}}
					/>
				</label>
				<label htmlFor={`${id}-sort`}>
					並べ替え
					<select
						id={`${id}-sort`}
						value={sort}
						onChange={(event) => {
							setSort(event.target.value)
							setVisibleCount(Math.max(1, pageSize))
						}}
					>
						<option value="newest">新着順</option>
						<option value="popular">登録件数順</option>
						<option value="title">名前順</option>
					</select>
				</label>
			</div>
			<output className={styles.resultCount}>{matching.length}件</output>
			{matching.length ? (
				<CalendarRows calendars={matching.slice(0, visibleCount)} onCalendarSelect={onCalendarSelect} />
			) : (
				<div className={styles.empty}>
					<p>該当するカレンダーがありません</p>
					<button type="button" onClick={resetFilters}>
						検索条件をクリア
					</button>
				</div>
			)}
			{visibleCount < matching.length && (
				<button
					className={styles.more}
					type="button"
					onClick={() => setVisibleCount((count) => count + Math.max(1, pageSize))}
				>
					もっと見る（残り{matching.length - visibleCount}件）
				</button>
			)}
		</section>
	)
}

export function UserCalendarPage({
	name,
	avatarUrl,
	joined,
	hosted,
	articles,
	onCalendarSelect,
	tab: controlledTab,
	onTabChange,
	counts,
	hasMore = false,
	onLoadMore,
	isLoading = false,
	error,
}: {
	name: string
	avatarUrl?: string
	joined: CalendarSummary[]
	hosted: CalendarSummary[]
	articles: ArticleSummary[]
	onCalendarSelect?: CalendarSelect
	tab?: ProfileTab
	onTabChange?: (tab: ProfileTab) => void
	counts?: Record<ProfileTab, number>
	hasMore?: boolean
	onLoadMore?: (tab: ProfileTab) => void
	isLoading?: boolean
	error?: string
}) {
	const id = useId()
	const [localTab, setTab] = useState<ProfileTab>('joined')
	const tab = controlledTab ?? localTab
	return (
		<section className={styles.root} aria-labelledby={`${id}-title`}>
			<header className={styles.heading}>
				<div className={styles.profile}>
					<span className={styles.avatar} aria-hidden="true">
						{avatarUrl ? <img src={avatarUrl} alt="" width={44} height={44} /> : Array.from(name)[0]}
					</span>
					<h1 id={`${id}-title`}>{name}</h1>
				</div>
			</header>
			<fieldset className={styles.tabs} aria-label="表示内容">
				{(
					[
						{ key: 'joined', label: '参加', count: counts?.joined ?? joined.length },
						{ key: 'hosted', label: '主催', count: counts?.hosted ?? hosted.length },
						{ key: 'articles', label: '記事', count: counts?.articles ?? articles.length },
					] as const
				).map((item) => (
					<button
						key={item.key}
						type="button"
						aria-pressed={tab === item.key}
						onClick={() => {
							if (controlledTab === undefined) setTab(item.key)
							onTabChange?.(item.key)
						}}
					>
						{item.label} {item.count}
					</button>
				))}
			</fieldset>
			{tab === 'articles' ? (
				articles.length ? (
					<ul className={styles.articles}>
						{articles.map((article) => (
							<li key={article.id}>
								<time dateTime={article.date}>{article.date.replaceAll('-', '/')}</time>
								<a href={article.url} target="_blank" rel="noreferrer">
									{article.title}
									<span className={styles.visuallyHidden}>（新しいタブで開く）</span>
								</a>
								<span>{article.calendarTitle}</span>
							</li>
						))}
					</ul>
				) : (
					!isLoading && !error && <p className={styles.empty}>記事はありません</p>
				)
			) : (tab === 'joined' ? joined : hosted).length ? (
				<CalendarRows calendars={tab === 'joined' ? joined : hosted} onCalendarSelect={onCalendarSelect} />
			) : (
				!isLoading && !error && <p className={styles.empty}>カレンダーはありません</p>
			)}
			{error && <p role="alert">{error}</p>}
			{isLoading && <output>読み込み中…</output>}
			{onLoadMore && (hasMore || error) && (
				<button className={styles.more} type="button" disabled={isLoading} onClick={() => onLoadMore(tab)}>
					{isLoading ? '読み込み中…' : error ? '再試行' : 'もっと見る'}
				</button>
			)}
		</section>
	)
}

export function CalendarArchive({
	calendars,
	initialYear,
	onCalendarSelect,
}: {
	calendars: CalendarSummary[]
	initialYear?: number
	onCalendarSelect?: CalendarSelect
}) {
	const id = useId()
	const years = [...new Set(calendars.map((calendar) => calendar.year))].sort((a, b) => b - a)
	const [year, setYear] = useState(initialYear ?? years[0])
	const selected = calendars.filter((calendar) => calendar.year === year)
	return (
		<section className={styles.root} aria-labelledby={`${id}-title`}>
			<header className={styles.heading}>
				<h1 id={`${id}-title`}>過去のカレンダー</h1>
			</header>
			<fieldset className={styles.years} aria-label="年を選択">
				{years.map((value) => (
					<button key={value} type="button" aria-pressed={value === year} onClick={() => setYear(value)}>
						{value}年
					</button>
				))}
			</fieldset>
			{selected.length ? (
				<>
					<h2 className={styles.archiveYear}>{year}年</h2>
					<CalendarRows calendars={selected} onCalendarSelect={onCalendarSelect} />
				</>
			) : (
				<p className={styles.empty}>カレンダーはありません</p>
			)}
		</section>
	)
}
