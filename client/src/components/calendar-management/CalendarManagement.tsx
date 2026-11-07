import { useEffect, useId, useRef, useState } from 'react'
import type { CalendarEntry, CalendarSheet } from '../advent-calendar/AdventCalendar'
import './calendar-management.css'

export interface CalendarManagementProps {
	title: string
	sheets: CalendarSheet[]
	onAddSheet: (name: string) => void
	onRenameSheet: (sheetId: string, name: string) => void
	onRemoveSheet: (sheetId: string) => void
	onRemoveEntry: (sheetId: string, day: number) => void
}

function SheetRow({
	sheet,
	onRename,
	onRemove,
}: {
	sheet: CalendarSheet
	onRename: (name: string) => void
	onRemove: () => void
}) {
	const [name, setName] = useState(sheet.name)
	const id = useId()
	return (
		<li className="management-sheet">
			<form
				onSubmit={(event) => {
					event.preventDefault()
					if (name.trim()) onRename(name.trim())
				}}
			>
				<label className="management-hidden" htmlFor={id}>
					{sheet.name}の名前
				</label>
				<input
					id={id}
					value={name}
					maxLength={80}
					required
					pattern=".*\S.*"
					onChange={(event) => setName(event.target.value)}
				/>
				<span>{sheet.entries.length} / 25</span>
				<button type="submit" disabled={!name.trim() || name.trim() === sheet.name}>
					名前を保存
				</button>
			</form>
			<button
				type="button"
				disabled={sheet.entries.length > 0}
				aria-label={`${sheet.name}を削除${sheet.entries.length ? '（参加登録あり）' : ''}`}
				onClick={onRemove}
			>
				削除
			</button>
		</li>
	)
}

export function CalendarManagement({
	title,
	sheets,
	onAddSheet,
	onRenameSheet,
	onRemoveSheet,
	onRemoveEntry,
}: CalendarManagementProps) {
	const id = useId()
	const [name, setName] = useState('')
	const [filter, setFilter] = useState('all')
	const [pending, setPending] = useState<{ sheetId: string; entry: CalendarEntry } | null>(null)
	const dialogRef = useRef<HTMLDialogElement>(null)
	const entries = sheets
		.flatMap((sheet) => sheet.entries.map((entry) => ({ sheet, entry })))
		.filter(({ sheet }) => filter === 'all' || sheet.id === filter)
	const statusNames: Record<CalendarEntry['status'], string> = {
		published: '公開済み',
		reserved: '参加登録済み',
		scheduled: '公開待ち',
	}
	useEffect(() => {
		if (pending) dialogRef.current?.showModal()
		else dialogRef.current?.close()
	}, [pending])
	return (
		<section className="calendar-management" aria-labelledby={`${id}-heading`}>
			<header className="management-heading">
				<h1 id={`${id}-heading`}>{title}の管理</h1>
			</header>
			<section aria-labelledby={`${id}-sheets`}>
				<h2 id={`${id}-sheets`}>カレンダー {sheets.length}枚</h2>
				<ul className="management-sheets">
					{sheets.map((sheet) => (
						<SheetRow
							key={sheet.id}
							sheet={sheet}
							onRename={(nextName) => onRenameSheet(sheet.id, nextName)}
							onRemove={() => {
								if (!sheet.entries.length) {
									onRemoveSheet(sheet.id)
									if (filter === sheet.id) setFilter('all')
								}
							}}
						/>
					))}
				</ul>
				<form
					className="management-add-sheet"
					onSubmit={(event) => {
						event.preventDefault()
						if (name.trim()) {
							onAddSheet(name.trim())
							setName('')
						}
					}}
				>
					<label htmlFor={`${id}-new-name`}>追加するカレンダーの名前</label>
					<div>
						<input
							id={`${id}-new-name`}
							value={name}
							onChange={(event) => setName(event.target.value)}
							required
							pattern=".*\S.*"
							maxLength={80}
						/>
						<button className="management-primary" type="submit">
							追加する
						</button>
					</div>
				</form>
			</section>
			<section aria-labelledby={`${id}-entries`}>
				<div className="management-entry-heading">
					<h2 id={`${id}-entries`}>参加登録</h2>
					<label htmlFor={`${id}-filter`}>
						カレンダー
						<select id={`${id}-filter`} value={filter} onChange={(event) => setFilter(event.target.value)}>
							<option value="all">すべて</option>
							{sheets.map((sheet) => (
								<option key={sheet.id} value={sheet.id}>
									{sheet.name}
								</option>
							))}
						</select>
					</label>
				</div>
				{entries.length ? (
					<div className="management-table-scroll">
						<table>
							<thead>
								<tr>
									<th scope="col">カレンダー</th>
									<th scope="col">日付</th>
									<th scope="col">参加者</th>
									<th scope="col">状態</th>
									<th scope="col">操作</th>
								</tr>
							</thead>
							<tbody>
								{entries.map(({ sheet, entry }) => (
									<tr key={`${sheet.id}-${entry.day}`}>
										<td>{sheet.name}</td>
										<td>12月{entry.day}日</td>
										<th scope="row">{entry.author}</th>
										<td>{statusNames[entry.status]}</td>
										<td>
											<button
												type="button"
												aria-label={`${sheet.name} 12月${entry.day}日 ${entry.author}の登録を削除`}
												onClick={() => setPending({ sheetId: sheet.id, entry })}
											>
												登録を削除
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="management-empty">参加登録はありません</p>
				)}
			</section>
			<dialog
				ref={dialogRef}
				aria-labelledby={`${id}-confirm-title`}
				onCancel={() => setPending(null)}
				onClose={() => setPending(null)}
			>
				<h2 id={`${id}-confirm-title`}>参加登録を削除</h2>
				{pending && (
					<p>
						12月{pending.entry.day}日 {pending.entry.author}の参加登録を削除しますか？
					</p>
				)}
				<div className="management-confirm-actions">
					<button type="button" onClick={() => setPending(null)}>
						キャンセル
					</button>
					<button
						className="management-primary"
						type="button"
						onClick={() => {
							if (pending) onRemoveEntry(pending.sheetId, pending.entry.day)
							setPending(null)
						}}
					>
						削除する
					</button>
				</div>
			</dialog>
		</section>
	)
}
