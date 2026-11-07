import { useId, useState } from 'react'
import './calendar-forms.css'

export interface EntryFormValue {
	title: string
	url: string
	comment: string
}

export interface EntryFormProps {
	calendarTitle: string
	sheet: number
	day: number
	participant: string
	mode?: 'join' | 'edit'
	initialValue?: Partial<EntryFormValue>
	onSave?: (value: EntryFormValue) => void
	onCancel?: () => void
	onWithdraw?: () => void
	isSubmitting?: boolean
	error?: string
}

export function EntryForm({
	calendarTitle,
	sheet,
	day,
	participant,
	mode = 'join',
	initialValue,
	onSave,
	onCancel,
	onWithdraw,
	isSubmitting = false,
	error,
}: EntryFormProps) {
	const id = useId()
	const [saved, setSaved] = useState(false)
	const [confirmWithdraw, setConfirmWithdraw] = useState(false)
	const [withdrawn, setWithdrawn] = useState(false)

	if (withdrawn)
		return (
			<div className="calendar-form-ui">
				<output>参加登録を取り消しました</output>
			</div>
		)

	return (
		<section className="calendar-form-ui" aria-labelledby={`${id}-heading`}>
			<h1 id={`${id}-heading`}>{mode === 'join' ? '参加する' : '記事を編集'}</h1>
			<dl className="calendar-form-ui__details">
				<div>
					<dt>カレンダー</dt>
					<dd>{calendarTitle}</dd>
				</div>
				<div>
					<dt>日付</dt>
					<dd>
						カレンダー {sheet} · 12月{day}日
					</dd>
				</div>
				<div>
					<dt>参加者</dt>
					<dd>{participant}</dd>
				</div>
			</dl>
			<form
				aria-busy={isSubmitting}
				onChange={() => setSaved(false)}
				onSubmit={(event) => {
					event.preventDefault()
					if (isSubmitting) return
					const data = new FormData(event.currentTarget)
					onSave?.({
						title: String(data.get('title')).trim(),
						url: String(data.get('url')).trim(),
						comment: String(data.get('comment')).trim(),
					})
					setSaved(true)
				}}
			>
				<label htmlFor={`${id}-title`}>記事タイトル</label>
				<input
					disabled={isSubmitting}
					id={`${id}-title`}
					name="title"
					maxLength={200}
					defaultValue={initialValue?.title ?? ''}
				/>
				<label htmlFor={`${id}-url`}>記事URL</label>
				<input
					disabled={isSubmitting}
					id={`${id}-url`}
					name="url"
					type="url"
					pattern="https?://.*"
					defaultValue={initialValue?.url ?? ''}
				/>
				<label htmlFor={`${id}-comment`}>コメント</label>
				<textarea
					disabled={isSubmitting}
					id={`${id}-comment`}
					name="comment"
					rows={4}
					maxLength={1000}
					defaultValue={initialValue?.comment ?? ''}
				/>
				<div className="calendar-form-ui__actions">
					<button className="calendar-form-ui__primary" type="submit" disabled={isSubmitting}>
						{isSubmitting ? '保存中…' : mode === 'join' ? '参加を登録' : '保存する'}
					</button>
					{onCancel && (
						<button type="button" disabled={isSubmitting} onClick={onCancel}>
							キャンセル
						</button>
					)}
				</div>
				{error && <p role="alert">{error}</p>}
				{saved && !error && !isSubmitting && (
					<output>{mode === 'join' ? '参加を登録しました' : '記事を保存しました'}</output>
				)}
			</form>
			{mode === 'edit' && onWithdraw && (
				<div className="calendar-form-ui__danger-zone">
					{confirmWithdraw ? (
						<div role="alertdialog" aria-labelledby={`${id}-withdraw`}>
							<h2 id={`${id}-withdraw`}>12月{day}日の参加登録を取り消しますか？</h2>
							<div className="calendar-form-ui__actions">
								<button
									type="button"
									disabled={isSubmitting}
									onClick={() => {
										onWithdraw()
										setWithdrawn(true)
									}}
								>
									参加を取り消す
								</button>
								<button type="button" disabled={isSubmitting} onClick={() => setConfirmWithdraw(false)}>
									戻る
								</button>
							</div>
						</div>
					) : (
						<button type="button" disabled={isSubmitting} onClick={() => setConfirmWithdraw(true)}>
							参加登録を取り消す
						</button>
					)}
				</div>
			)}
		</section>
	)
}
