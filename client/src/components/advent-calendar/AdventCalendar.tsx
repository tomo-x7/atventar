import { useId, useRef, useState } from 'react'
import './advent-calendar.css'

export type CalendarEntry = {
	day: number
	author: string
	authorAvatarUrl?: string
	title: string
	url?: string
	comment?: string
	status: 'reserved' | 'published' | 'scheduled'
	isOwner?: boolean
}

export type CalendarSheet = {
	id: string
	number: number
	entries: CalendarEntry[]
}

export type AdventCalendarProps = {
	sheet: CalendarSheet
	year: number
	today?: number
	readOnly?: boolean
	onJoin?: (day: number) => void
	onEditEntry?: (sheetId: string, entry: CalendarEntry) => void
}

function UserAvatar({ entry }: { entry: CalendarEntry }) {
	const [failedUrl, setFailedUrl] = useState<string>()
	return (
		<span className="ac-avatar" aria-hidden="true">
			{entry.authorAvatarUrl && failedUrl !== entry.authorAvatarUrl ? (
				<img
					src={entry.authorAvatarUrl}
					alt=""
					width={32}
					height={32}
					onError={() => setFailedUrl(entry.authorAvatarUrl)}
				/>
			) : (
				entry.author.trim().slice(0, 1)
			)}
		</span>
	)
}

export function AdventCalendar({ sheet, year, today, readOnly, onJoin, onEditEntry }: AdventCalendarProps) {
	const headingId = useId()
	const [selectedDay, setSelectedDay] = useState<number | null>(null)
	const rows = useRef(new Map<number, HTMLLIElement>())
	const days = Array.from({ length: 25 }, (_, index) => index + 1)
	// This derives the displayed month's weekday from the provided year, never the device's current time.
	const firstWeekday = new Date(Date.UTC(year, 11, 1)).getUTCDay()
	return (
		<section className="ac-sheet" aria-labelledby={headingId}>
			<header className="ac-sheet-heading">
				<h2 id={headingId}>カレンダー {sheet.number}</h2>
				<span>{sheet.entries.length} / 25</span>
			</header>
			<div className="ac-sheet-body">
				<nav className="ac-mini" aria-label={`カレンダー ${sheet.number}の日付`}>
					<h3>12月</h3>
					<div className="ac-weekdays" aria-hidden="true">
						{['日', '月', '火', '水', '木', '金', '土'].map((weekday) => (
							<span key={weekday}>{weekday}</span>
						))}
					</div>
					<ol className="ac-mini-days">
						{days.map((day) => {
							const entry = sheet.entries.find((item) => item.day === day)
							return (
								<li key={day} style={day === 1 ? { gridColumnStart: firstWeekday + 1 } : undefined}>
									<button
										type="button"
										aria-label={entry ? `12月${day}日 ${entry.author}の登録を表示` : `12月${day}日の空き枠を表示`}
										aria-current={today === day ? 'date' : undefined}
										aria-pressed={selectedDay === day}
										onClick={() => {
											setSelectedDay(day)
											const row = rows.current.get(day)
											row?.focus({ preventScroll: true })
											row?.scrollIntoView({ block: 'center', behavior: 'auto' })
										}}
									>
										<span className="ac-mini-date">{day}</span>
										{entry ? (
											<UserAvatar entry={entry} />
										) : (
											<span className="ac-mini-empty" aria-hidden="true">
												＋
											</span>
										)}
									</button>
								</li>
							)
						})}
					</ol>
				</nav>
				<ol className="ac-days" aria-label="日付ごとの参加登録">
					{days.map((day) => {
						const entry = sheet.entries.find((item) => item.day === day)
						return (
							<li
								key={day}
								ref={(element) => {
									if (element) rows.current.set(day, element)
									else rows.current.delete(day)
								}}
								tabIndex={-1}
								className={`ac-day ${entry ? 'ac-day-filled' : ''}`}
								data-selected={selectedDay === day}
								aria-current={today === day ? 'date' : undefined}
							>
								<time dateTime={`${year}-12-${String(day).padStart(2, '0')}`}>
									<span className="ac-visually-hidden">12月</span>
									{day}
									<span className="ac-visually-hidden">日</span>
								</time>
								<div className="ac-entry">
									{entry ? (
										<>
											<div className="ac-author">
												<UserAvatar entry={entry} />
												<span>{entry.author}</span>
											</div>
											{entry.status === 'published' && entry.url ? (
												<a className="ac-article" href={entry.url} target="_blank" rel="noreferrer">
													{entry.title}
													<span aria-hidden="true"> ↗</span>
												</a>
											) : (
												<div className="ac-topic">{entry.title}</div>
											)}
											{entry.comment && <p className="ac-comment">{entry.comment}</p>}
										</>
									) : (
										<span className="ac-status">空き</span>
									)}
								</div>
								{!readOnly && (
									<div className="ac-day-actions">
										{entry?.isOwner && onEditEntry && (
											<button
												type="button"
												className="ac-text-button"
												aria-label={`カレンダー ${sheet.number} 12月${day}日の登録を編集`}
												onClick={() => onEditEntry(sheet.id, entry)}
											>
												編集
											</button>
										)}
										{onJoin && (
											<button
												className="ac-join"
												type="button"
												aria-label={`カレンダー ${sheet.number} 12月${day}日に参加する`}
												onClick={() => onJoin(day)}
											>
												参加
											</button>
										)}
									</div>
								)}
							</li>
						)
					})}
				</ol>
			</div>
		</section>
	)
}

export type CalendarCollectionProps = Omit<AdventCalendarProps, 'sheet'> & {
	title: string
	description: string
	organizer: string
	sheets: CalendarSheet[]
	onEdit?: () => void
}

export function CalendarCollection({
	title,
	description,
	organizer,
	sheets,
	onEdit,
	...calendarProps
}: CalendarCollectionProps) {
	const [selectedId, setSelectedId] = useState(sheets[0]?.id)
	const activeSheet = sheets.find((sheet) => sheet.id === selectedId) ?? sheets[0]
	return (
		<main className="ac-root">
			<header className="ac-collection-heading">
				<div className="ac-heading-top">
					<span className="ac-year">{calendarProps.year} / 12.01 — 12.25</span>
					{onEdit && (
						<button type="button" className="ac-button" onClick={onEdit}>
							カレンダーを編集
						</button>
					)}
				</div>
				<h1>{title}</h1>
				<div className="ac-details">
					<p>{description}</p>
					<span>主催 {organizer}</span>
				</div>
			</header>
			<div className="ac-toolbar">
				<strong>{sheets.length} 枚のカレンダー</strong>
				<span>{sheets.reduce((sum, sheet) => sum + sheet.entries.length, 0)} 件の参加登録</span>
			</div>
			{sheets.length > 1 && (
				<fieldset className="ac-sheet-picker" aria-label="表示するカレンダー">
					{sheets.map((sheet) => (
						<button
							key={sheet.id}
							type="button"
							aria-label={`カレンダー ${sheet.number}を表示`}
							aria-pressed={sheet.id === activeSheet?.id}
							onClick={() => setSelectedId(sheet.id)}
						>
							{sheet.number}
						</button>
					))}
				</fieldset>
			)}
			{activeSheet ? (
				<AdventCalendar key={activeSheet.id} sheet={activeSheet} {...calendarProps} />
			) : (
				<p className="ac-empty">カレンダーがありません</p>
			)}
		</main>
	)
}
