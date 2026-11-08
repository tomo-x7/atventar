import { type MouseEvent, useId, useRef, useState } from 'react'
import './advent-calendar.css'

export type CalendarEntry = {
	/** The participation record URI stays the same when its calendar position changes. */
	uri: string
	day: number
	author: string
	authorAvatarUrl?: string
	authorHref?: string
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

type CalendarNavigation = {
	getEntryHref: (uri: string) => string
	getJoinHref: (day?: number) => string
	onJoin?: (day?: number) => void
	onEditEntry?: (entry: CalendarEntry) => void
}

export type AdventCalendarProps = CalendarNavigation & {
	sheet: CalendarSheet
	year: number
	today?: number
	readOnly?: boolean
}

function CalendarDate({ year, day }: { year: number; day: number }) {
	return (
		<time dateTime={`${year}-12-${String(day).padStart(2, '0')}`}>
			<span className="ac-visually-hidden">12月</span>
			{day}
			<span className="ac-visually-hidden">日</span>
		</time>
	)
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
				Array.from(entry.author.trim())[0]
			)}
		</span>
	)
}

function isPlainClick(event: MouseEvent<HTMLAnchorElement>) {
	return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

const statusLabels = { reserved: '未公開', scheduled: '公開待ち', published: '公開済み' }

export function AdventCalendar({
	sheet,
	year,
	today,
	readOnly,
	getEntryHref,
	getJoinHref,
	onJoin,
	onEditEntry,
}: AdventCalendarProps) {
	const id = useId()
	const [selectedDay, setSelectedDay] = useState<number | null>(null)
	const rows = useRef(new Map<number, HTMLLIElement>())
	const days = Array.from({ length: 25 }, (_, index) => index + 1)
	// Calendar arithmetic uses the supplied year, not the device's current clock.
	const firstWeekday = new Date(Date.UTC(year, 11, 1)).getUTCDay()
	return (
		<section className="ac-sheet" aria-label={`${sheet.number}枚目のカレンダー`}>
			<section className="ac-month" aria-labelledby={`${id}-month`}>
				<h2 id={`${id}-month`}>12月</h2>
				<div className="ac-weekdays" aria-hidden="true">
					{['日', '月', '火', '水', '木', '金', '土'].map((weekday) => (
						<span key={weekday}>{weekday}</span>
					))}
				</div>
				<ol className="ac-month-days">
					{days.map((day) => {
						const entry = sheet.entries.find((item) => item.day === day)
						return (
							<li key={day} style={day === 1 ? { gridColumnStart: firstWeekday + 1 } : undefined}>
								<a
									href={entry || readOnly ? `#${id}-day-${day}` : getJoinHref(day)}
									aria-label={
										entry
											? `12月${day}日 ${entry.author}の登録を表示`
											: `12月${day}日${readOnly ? 'の空き枠を表示' : 'に参加する'}`
									}
									aria-current={today === day ? 'date' : undefined}
									data-selected={selectedDay === day}
									onClick={(event) => {
										if (!isPlainClick(event)) return
										if (!entry && !readOnly && onJoin) {
											event.preventDefault()
											onJoin(day)
											return
										}
										if (entry || readOnly) {
											event.preventDefault()
											setSelectedDay(day)
											const row = rows.current.get(day)
											row?.focus({ preventScroll: true })
											row?.scrollIntoView({ block: 'center', behavior: 'auto' })
										}
									}}
								>
									{entry?.status === 'published' && <span className="ac-published-mark" aria-hidden="true" />}
									<span className="ac-calendar-date">{day}</span>
									{entry ? (
										<>
											<UserAvatar entry={entry} />
											<span className="ac-calendar-name">{entry.author}</span>
										</>
									) : (
										<span className="ac-status">空き</span>
									)}
								</a>
							</li>
						)
					})}
				</ol>
			</section>
			<section className="ac-articles" aria-labelledby={`${id}-articles`}>
				<h2 id={`${id}-articles`}>参加者と記事</h2>
				<ol className="ac-days" aria-label="日付ごとの参加登録">
					{days.map((day) => {
						const entry = sheet.entries.find((item) => item.day === day)
						return (
							<li
								key={day}
								id={`${id}-day-${day}`}
								ref={(element) => {
									if (element) rows.current.set(day, element)
									else rows.current.delete(day)
								}}
								tabIndex={-1}
								className="ac-day"
								data-filled={Boolean(entry)}
								data-selected={selectedDay === day}
								aria-current={today === day ? 'date' : undefined}
							>
								<div className="ac-date">
									{entry ? (
										<a href={getEntryHref(entry.uri)} aria-label={`12月${day}日の参加登録`}>
											<CalendarDate year={year} day={day} />
										</a>
									) : (
										<CalendarDate year={year} day={day} />
									)}
								</div>
								<div className="ac-entry">
									{entry ? (
										<>
											<div className="ac-author">
												<UserAvatar entry={entry} />
												{entry.authorHref ? <a href={entry.authorHref}>{entry.author}</a> : <span>{entry.author}</span>}
												<span className="ac-entry-status">{statusLabels[entry.status]}</span>
											</div>
											{entry.url ? (
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
												aria-label={`12月${day}日の自分の登録を編集`}
												onClick={() => onEditEntry(entry)}
											>
												編集
											</button>
										)}
										<a
											className="ac-join"
											href={getJoinHref(day)}
											aria-label={`12月${day}日に参加登録`}
											onClick={
												onJoin
													? (event) => {
															if (!isPlainClick(event)) return
															event.preventDefault()
															onJoin(day)
														}
													: undefined
											}
										>
											参加
										</a>
									</div>
								)}
							</li>
						)
					})}
				</ol>
			</section>
		</section>
	)
}

export type CalendarCollectionProps = CalendarNavigation & {
	title: string
	year: number
	description: string
	organizer: string
	organizerHref?: string
	sheets: CalendarSheet[]
	projectHref: string
	getCalendarHref: (number: number) => string
	shareHref: string
	readOnly?: boolean
	onShare?: () => void
	onEdit?: () => void
	onCalendarSelect?: (number: number) => void
	today?: number
}

function ProjectHeading({
	title,
	year,
	description,
	organizer,
	organizerHref,
	sheets,
	getCalendarHref,
	getJoinHref,
	shareHref,
	readOnly,
	onJoin,
	onShare,
	onEdit,
}: CalendarCollectionProps) {
	return (
		<header className="ac-collection-heading">
			<div className="ac-heading-top">
				<span className="ac-year">{year} / 12.01 — 12.25</span>
				{onEdit && (
					<button type="button" className="ac-button" onClick={onEdit}>
						企画を編集
					</button>
				)}
			</div>
			<h1>{title}</h1>
			<div className="ac-details">
				<p>{description}</p>
				<span>主催 {organizerHref ? <a href={organizerHref}>{organizer}</a> : organizer}</span>
			</div>
			<div className="ac-toolbar">
				<strong>{sheets.reduce((sum, sheet) => sum + sheet.entries.length, 0)} 件の参加登録</strong>
				<span>
					{sheets.length === 1 ? (
						<a href={getCalendarHref(sheets[0].number)}>1 枚のカレンダー</a>
					) : (
						`${sheets.length} 枚のカレンダー`
					)}
				</span>
				<div className="ac-project-actions">
					{!readOnly && (
						<a
							className="ac-button ac-button-primary"
							href={getJoinHref()}
							onClick={
								onJoin
									? (event) => {
											if (!isPlainClick(event)) return
											event.preventDefault()
											onJoin()
										}
									: undefined
							}
						>
							参加登録
						</a>
					)}
					<a
						className="ac-button"
						href={shareHref}
						onClick={
							onShare
								? (event) => {
										if (!isPlainClick(event)) return
										event.preventDefault()
										onShare()
									}
								: undefined
						}
					>
						共有
					</a>
				</div>
			</div>
		</header>
	)
}

function visibleSheets(sheets: CalendarSheet[]): CalendarSheet[] {
	// A display placeholder, not a stored sheet or a client-side placement decision.
	return sheets.length
		? [...sheets].sort((a, b) => a.number - b.number)
		: [{ id: 'unassigned-first-calendar', number: 1, entries: [] }]
}

export function CalendarCollection(props: CalendarCollectionProps) {
	const id = useId()
	const sheets = visibleSheets(props.sheets)
	return (
		<main className="ac-root">
			<ProjectHeading {...props} sheets={sheets} />
			{sheets.length === 1 ? (
				<AdventCalendar
					sheet={sheets[0]}
					year={props.year}
					today={props.today}
					readOnly={props.readOnly}
					getEntryHref={props.getEntryHref}
					getJoinHref={props.getJoinHref}
					onJoin={props.onJoin}
					onEditEntry={props.onEditEntry}
				/>
			) : (
				<div className="ac-card-grid">
					{sheets.map((sheet) => (
						<a
							key={sheet.id}
							className="ac-card"
							href={props.getCalendarHref(sheet.number)}
							aria-labelledby={`${id}-${sheet.number}-heading ${id}-${sheet.number}-count`}
							onClick={
								props.onCalendarSelect
									? (event) => {
											if (!isPlainClick(event)) return
											event.preventDefault()
											props.onCalendarSelect?.(sheet.number)
										}
									: undefined
							}
						>
							<div className="ac-card-heading">
								<h2 id={`${id}-${sheet.number}-heading`}>{sheet.number}枚目</h2>
								<span id={`${id}-${sheet.number}-count`}>{sheet.entries.length}/25人</span>
							</div>
							<ol className="ac-card-days" aria-label="日付ごとの参加状況">
								{Array.from({ length: 25 }, (_, index) => {
									const day = index + 1
									const entry = sheet.entries.find((item) => item.day === day)
									return (
										<li key={day} data-filled={Boolean(entry)}>
											<span>{day}</span>
											{entry ? (
												<UserAvatar entry={entry} />
											) : (
												<span className="ac-card-empty" aria-hidden="true">
													—
												</span>
											)}
											<span className="ac-visually-hidden">{entry ? entry.author : '空き'}</span>
										</li>
									)
								})}
							</ol>
						</a>
					))}
				</div>
			)}
		</main>
	)
}

export type CalendarDetailProps = CalendarCollectionProps & {
	currentNumber: number
}

export function CalendarDetail(props: CalendarDetailProps) {
	const sheets = visibleSheets(props.sheets)
	const current = sheets.find((sheet) => sheet.number === props.currentNumber)
	return (
		<main className="ac-root">
			<a className="ac-back-link" href={props.projectHref}>
				企画トップに戻る
			</a>
			<ProjectHeading {...props} sheets={sheets} />
			{sheets.length > 1 && (
				<nav className="ac-sheet-navigation" aria-label="他のカレンダー">
					{sheets.map((sheet) => (
						<a
							key={sheet.id}
							href={props.getCalendarHref(sheet.number)}
							aria-current={sheet.number === props.currentNumber ? 'page' : undefined}
							onClick={
								props.onCalendarSelect
									? (event) => {
											if (!isPlainClick(event)) return
											event.preventDefault()
											props.onCalendarSelect?.(sheet.number)
										}
									: undefined
							}
						>
							{sheet.number}枚目
						</a>
					))}
				</nav>
			)}
			{current ? (
				<>
					<div className="ac-detail-heading">
						<h2>
							{current.number}枚目 / 全{sheets.length}枚
						</h2>
						<span>{current.entries.length}/25人</span>
					</div>
					<AdventCalendar
						key={current.number}
						sheet={current}
						year={props.year}
						today={props.today}
						readOnly={props.readOnly}
						getEntryHref={props.getEntryHref}
						getJoinHref={props.getJoinHref}
						onJoin={props.onJoin}
						onEditEntry={props.onEditEntry}
					/>
				</>
			) : (
				<section className="ac-empty">
					<h2>このカレンダーはありません</h2>
					<a href={props.projectHref}>企画トップに戻る</a>
				</section>
			)}
		</main>
	)
}

export type ParticipationDetailProps = {
	projectTitle: string
	year: number
	projectHref: string
	entry: CalendarEntry
	/** Resolved by AppView from the participation URI, rather than stored in the record. */
	placement?: { calendarNumber: number; href: string }
	shareHref: string
	onEditEntry?: (entry: CalendarEntry) => void
	onShare?: () => void
}

export function ParticipationDetail({
	projectTitle,
	year,
	projectHref,
	entry,
	placement,
	shareHref,
	onEditEntry,
	onShare,
}: ParticipationDetailProps) {
	return (
		<main className="ac-root ac-participation">
			<a className="ac-back-link" href={projectHref}>
				企画トップに戻る
			</a>
			<header className="ac-collection-heading">
				<span className="ac-year">{year}年</span>
				<h1>
					{projectTitle} · 12月{entry.day}日
				</h1>
			</header>
			<div className="ac-author">
				<UserAvatar entry={entry} />
				{entry.authorHref ? <a href={entry.authorHref}>{entry.author}</a> : <span>{entry.author}</span>}
				<span className="ac-entry-status">{statusLabels[entry.status]}</span>
			</div>
			<h2>
				{entry.url ? (
					<a href={entry.url} target="_blank" rel="noreferrer">
						{entry.title} ↗
					</a>
				) : (
					entry.title
				)}
			</h2>
			{entry.comment && <p>{entry.comment}</p>}
			{placement ? (
				<a className="ac-placement" href={placement.href}>
					現在のカレンダー：{placement.calendarNumber}枚目
				</a>
			) : (
				<output className="ac-placement">カレンダーへの反映待ち</output>
			)}
			<div className="ac-project-actions">
				{entry.isOwner && onEditEntry && (
					<button className="ac-button" type="button" onClick={() => onEditEntry(entry)}>
						自分の登録を編集
					</button>
				)}
				<a
					className="ac-button"
					href={shareHref}
					onClick={
						onShare
							? (event) => {
									if (!isPlainClick(event)) return
									event.preventDefault()
									onShare()
								}
							: undefined
					}
				>
					共有
				</a>
			</div>
		</main>
	)
}
