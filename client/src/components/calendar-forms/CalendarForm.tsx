import { useId, useState } from 'react'
import './calendar-forms.css'

export interface CalendarFormValue {
	title: string
	year: number
	description: string
	sheetCount: number
}

export interface CalendarFormProps {
	mode?: 'create' | 'edit'
	initialValue?: Partial<CalendarFormValue>
	onSave?: (value: CalendarFormValue) => void
	onCancel?: () => void
	onDelete?: () => void
	isSubmitting?: boolean
	error?: string
}

export function CalendarForm({
	mode = 'create',
	initialValue,
	onSave,
	onCancel,
	onDelete,
	isSubmitting = false,
	error,
}: CalendarFormProps) {
	const id = useId()
	const [saved, setSaved] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [deleted, setDeleted] = useState(false)

	if (deleted) {
		return (
			<div className="calendar-form-ui">
				<output>カレンダーを削除しました</output>
			</div>
		)
	}

	return (
		<section className="calendar-form-ui" aria-labelledby={`${id}-heading`}>
			<h1 id={`${id}-heading`}>{mode === 'create' ? 'カレンダーを作成' : 'カレンダーを編集'}</h1>
			<form
				aria-busy={isSubmitting}
				onChange={() => setSaved(false)}
				onSubmit={(event) => {
					event.preventDefault()
					if (isSubmitting) return
					const data = new FormData(event.currentTarget)
					onSave?.({
						title: String(data.get('title')).trim(),
						year: Number(data.get('year')),
						description: String(data.get('description')).trim(),
						sheetCount: Number(data.get('sheetCount')),
					})
					setSaved(true)
				}}
			>
				<label htmlFor={`${id}-title`}>タイトル</label>
				<input
					disabled={isSubmitting}
					id={`${id}-title`}
					name="title"
					required
					maxLength={100}
					pattern=".*\S.*"
					defaultValue={initialValue?.title ?? ''}
				/>
				<div className="calendar-form-ui__columns">
					<div>
						<label htmlFor={`${id}-year`}>年</label>
						<input
							disabled={isSubmitting}
							id={`${id}-year`}
							name="year"
							type="number"
							required
							min={2000}
							max={2100}
							defaultValue={initialValue?.year ?? 2026}
						/>
					</div>
					<div>
						<label htmlFor={`${id}-sheets`}>カレンダー枚数</label>
						<input
							disabled={isSubmitting}
							id={`${id}-sheets`}
							name="sheetCount"
							type="number"
							required
							min={mode === 'edit' ? (initialValue?.sheetCount ?? 1) : 1}
							max={20}
							defaultValue={initialValue?.sheetCount ?? 1}
						/>
					</div>
				</div>
				<label htmlFor={`${id}-description`}>説明</label>
				<textarea
					disabled={isSubmitting}
					id={`${id}-description`}
					name="description"
					rows={6}
					maxLength={3000}
					defaultValue={initialValue?.description ?? ''}
				/>
				<div className="calendar-form-ui__actions">
					<button className="calendar-form-ui__primary" type="submit" disabled={isSubmitting}>
						{isSubmitting ? '保存中…' : mode === 'create' ? '作成する' : '保存する'}
					</button>
					{onCancel && (
						<button type="button" disabled={isSubmitting} onClick={onCancel}>
							キャンセル
						</button>
					)}
				</div>
				{error && <p role="alert">{error}</p>}
				{saved && !error && !isSubmitting && (
					<output>{mode === 'create' ? 'カレンダーを作成しました' : '変更を保存しました'}</output>
				)}
			</form>
			{mode === 'edit' && onDelete && (
				<div className="calendar-form-ui__danger-zone">
					{confirmDelete ? (
						<div role="alertdialog" aria-labelledby={`${id}-delete`}>
							<h2 id={`${id}-delete`}>このカレンダーと参加登録を削除しますか？</h2>
							<div className="calendar-form-ui__actions">
								<button
									type="button"
									disabled={isSubmitting}
									onClick={() => {
										onDelete()
										setDeleted(true)
									}}
								>
									削除する
								</button>
								<button type="button" disabled={isSubmitting} onClick={() => setConfirmDelete(false)}>
									戻る
								</button>
							</div>
						</div>
					) : (
						<button type="button" disabled={isSubmitting} onClick={() => setConfirmDelete(true)}>
							カレンダーを削除
						</button>
					)}
				</div>
			)}
		</section>
	)
}
