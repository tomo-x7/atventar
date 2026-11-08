import { useId, useState } from 'react'
import './advent-calendar.css'

export type CalendarEntry = {
	day: number
	author: string
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

export function AdventCalendar({ sheet, year, today, readOnly, onJoin, onEditEntry }: AdventCalendarProps) {
	const headingId = useId()
	return (
		<section className="ac-sheet" aria-labelledby={headingId}>
			<header className="ac-sheet-heading">
				<h2 id={headingId}>カレンダー {sheet.number}</h2>
				<span>{sheet.entries.length} / 25</span>
			</header>
			<ol className="ac-days">
				{Array.from({ length: 25 }, (_, index) => {
					const day = index + 1
					const entry = sheet.entries.find((item) => item.day === day)
					return (
						<li
							key={day}
							className={`ac-day ${entry ? 'ac-day-filled' : ''}`}
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
										<div className="ac-author">{entry.author}</div>
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
	const activeId = sheets.some((sheet) => sheet.id === selectedId) ? selectedId : sheets[0]?.id
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
							aria-pressed={sheet.id === activeId}
							onClick={() => setSelectedId(sheet.id)}
						>
							{sheet.number}
						</button>
					))}
				</fieldset>
			)}
			{sheets.length ? (
				<div className="ac-sheets">
					{sheets.map((sheet) => (
						<div className="ac-sheet-panel" key={sheet.id} data-active={sheet.id === activeId}>
							<AdventCalendar sheet={sheet} {...calendarProps} />
						</div>
					))}
				</div>
			) : (
				<p className="ac-empty">カレンダーがありません</p>
			)}
		</main>
	)
}
