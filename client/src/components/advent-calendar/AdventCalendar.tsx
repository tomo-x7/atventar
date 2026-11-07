import { useId } from 'react'
import './advent-calendar.css'

export type CalendarEntry = {
	day: number
	author: string
	title?: string
	url?: string
	comment?: string
	status: 'reserved' | 'published' | 'scheduled'
	isOwner?: boolean
}

export type CalendarSheet = {
	id: string
	name: string
	entries: CalendarEntry[]
}

export type AdventCalendarProps = {
	sheet: CalendarSheet
	year: number
	today?: number
	readOnly?: boolean
	onJoin?: (sheetId: string, day: number) => void
	onEditEntry?: (sheetId: string, entry: CalendarEntry) => void
}

export function AdventCalendar({ sheet, year, today, readOnly, onJoin, onEditEntry }: AdventCalendarProps) {
	const headingId = useId()
	return (
		<section className="ac-sheet" aria-labelledby={headingId}>
			<header className="ac-sheet-heading">
				<h2 id={headingId}>{sheet.name}</h2>
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
							<div className="ac-day-top">
								<time dateTime={`${year}-12-${String(day).padStart(2, '0')}`}>{day}</time>
								{entry?.isOwner && onEditEntry && !readOnly && (
									<button
										type="button"
										className="ac-text-button"
										aria-label={`${sheet.name} 12月${day}日の登録を編集`}
										onClick={() => onEditEntry(sheet.id, entry)}
									>
										編集
									</button>
								)}
							</div>
							{entry ? (
								<>
									<div className="ac-author">{entry.author}</div>
									{entry.status === 'published' && entry.title ? (
										entry.url ? (
											<a className="ac-article" href={entry.url} target="_blank" rel="noreferrer">
												{entry.title}
												<span aria-hidden="true"> ↗</span>
											</a>
										) : (
											<span className="ac-article">{entry.title}</span>
										)
									) : (
										<span className="ac-status">{entry.status === 'scheduled' ? '公開待ち' : '参加登録済み'}</span>
									)}
									{entry.comment && <p className="ac-comment">{entry.comment}</p>}
								</>
							) : onJoin && !readOnly ? (
								<button
									className="ac-join"
									type="button"
									aria-label={`${sheet.name} 12月${day}日に参加する`}
									onClick={() => onJoin(sheet.id, day)}
								>
									＋ 参加する
								</button>
							) : (
								<span className="ac-status">空き</span>
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
	onAddSheet?: () => void
	onEdit?: () => void
}

export function CalendarCollection({
	title,
	description,
	organizer,
	sheets,
	onAddSheet,
	onEdit,
	...calendarProps
}: CalendarCollectionProps) {
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
				<span>
					{sheets.reduce((sum, sheet) => sum + sheet.entries.length, 0)} / {sheets.length * 25} 枠
				</span>
				{onAddSheet && (
					<button className="ac-button ac-button-primary" type="button" onClick={onAddSheet}>
						＋ カレンダーを追加
					</button>
				)}
			</div>
			{sheets.length ? (
				<div className="ac-sheets">
					{sheets.map((sheet) => (
						<AdventCalendar key={sheet.id} sheet={sheet} {...calendarProps} />
					))}
				</div>
			) : (
				<p className="ac-empty">カレンダーがありません</p>
			)}
		</main>
	)
}
