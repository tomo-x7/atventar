import { useId, useState } from 'react'
import '../theme.css'
import styles from './CalendarForms.module.css'

export type EntrySubmissionState = 'idle' | 'submitting' | 'awaiting-index' | 'complete' | 'error'

export interface EntryFormValue {
	day: number
	title: string
	url: string
	comment: string
}

export interface EntryFormProps {
	calendarTitle: string
	day?: number
	participant: string
	mode?: 'join' | 'edit'
	initialValue?: Partial<EntryFormValue>
	onSave?: (value: EntryFormValue) => void
	onCancel?: () => void
	onReload?: () => void
	onWithdraw?: () => void
	onShare?: () => void
	onCheckIndex?: () => void
	isCheckingIndex?: boolean
	recordHref?: string
	submissionState?: EntrySubmissionState
	withdrawalState?: EntrySubmissionState
	error?: string
	withdrawalError?: string
}

export function EntryForm({
	calendarTitle,
	day,
	participant,
	mode = 'join',
	initialValue,
	onSave,
	onCancel,
	onReload,
	onWithdraw,
	onShare,
	onCheckIndex,
	isCheckingIndex = false,
	recordHref,
	submissionState = 'idle',
	withdrawalState = 'idle',
	error,
	withdrawalError,
}: EntryFormProps) {
	const id = useId()
	const initialDay = day ?? initialValue?.day ?? 1
	const registeredDay = Number.isInteger(initialDay) && initialDay >= 1 && initialDay <= 25 ? initialDay : 1
	const [selectedDay, setSelectedDay] = useState(registeredDay)
	const [confirmWithdraw, setConfirmWithdraw] = useState(false)
	const isSubmitting = submissionState === 'submitting' || withdrawalState === 'submitting'
	const awaitingIndex = submissionState === 'awaiting-index' || withdrawalState === 'awaiting-index'
	const disabled = isSubmitting || awaitingIndex
	const safeRecordHref = recordHref && /^(https?:\/\/|\/(?!\/))/i.test(recordHref) ? recordHref : undefined

	if (withdrawalState === 'complete') {
		return (
			<section className={styles.root} aria-labelledby={`${id}-heading`}>
				<h1 id={`${id}-heading`}>参加を取り消しました</h1>
				<output>
					{calendarTitle} · 12月{registeredDay}日の参加登録を取り消しました。
				</output>
			</section>
		)
	}

	if (submissionState === 'complete') {
		return (
			<section className={styles.root} aria-labelledby={`${id}-heading`}>
				<h1 id={`${id}-heading`}>{mode === 'join' ? '参加を登録しました' : '記事を保存しました'}</h1>
				<output>
					{calendarTitle} · 12月{selectedDay}日
				</output>
				<div className={`${styles.actions} ${styles.completionActions}`}>
					{safeRecordHref && <a href={safeRecordHref}>登録内容を見る</a>}
					{onShare && (
						<button type="button" onClick={onShare}>
							共有する
						</button>
					)}
				</div>
			</section>
		)
	}

	return (
		<section className={styles.root} aria-labelledby={`${id}-heading`}>
			<h1 id={`${id}-heading`}>{mode === 'join' ? '参加する' : '記事を編集'}</h1>
			<dl className={styles.details}>
				<div>
					<dt>企画</dt>
					<dd>{calendarTitle}</dd>
				</div>
				<div>
					<dt>参加者</dt>
					<dd>{participant}</dd>
				</div>
			</dl>
			<form
				aria-busy={isSubmitting}
				onSubmit={(event) => {
					event.preventDefault()
					if (disabled) return
					const data = new FormData(event.currentTarget)
					onSave?.({
						day: selectedDay,
						title: String(data.get('title')).trim(),
						url: String(data.get('url')).trim(),
						comment: String(data.get('comment')).trim(),
					})
				}}
			>
				<label htmlFor={`${id}-day`}>担当日</label>
				<select
					id={`${id}-day`}
					name="day"
					required
					value={selectedDay}
					disabled={disabled}
					onChange={(event) => setSelectedDay(Number(event.currentTarget.value))}
				>
					{Array.from({ length: 25 }, (_, index) => index + 1).map((date) => (
						<option key={date} value={date}>
							12月{date}日
						</option>
					))}
				</select>
				<label htmlFor={`${id}-title`}>書く内容</label>
				<input
					disabled={disabled}
					id={`${id}-title`}
					name="title"
					required
					pattern=".*\S.*"
					maxLength={200}
					defaultValue={initialValue?.title ?? ''}
				/>
				<label htmlFor={`${id}-url`}>記事URL</label>
				<input
					disabled={disabled}
					id={`${id}-url`}
					name="url"
					type="url"
					pattern="https?://.*"
					defaultValue={initialValue?.url ?? ''}
				/>
				<label htmlFor={`${id}-comment`}>コメント</label>
				<textarea
					disabled={disabled}
					id={`${id}-comment`}
					name="comment"
					rows={4}
					maxLength={1000}
					defaultValue={initialValue?.comment ?? ''}
				/>
				<div className={styles.actions}>
					<button className={styles.primary} type="submit" disabled={disabled}>
						{isSubmitting ? '保存中…' : awaitingIndex ? '反映待ち' : mode === 'join' ? '参加を登録' : '保存する'}
					</button>
					{onCancel && (
						<button type="button" disabled={disabled} onClick={onCancel}>
							キャンセル
						</button>
					)}
				</div>
				{submissionState === 'error' && (
					<>
						<p role="alert">{error ?? '参加登録を保存できませんでした。'}</p>
						{onReload && (
							<button type="button" disabled={isSubmitting} onClick={onReload}>
								最新の内容を読み込む
							</button>
						)}
					</>
				)}
				{submissionState === 'awaiting-index' && (
					<>
						<output>参加登録を保存しました。カレンダーへの反映を待っています。</output>
						{error && <p role="alert">参加登録の保存は完了しています。反映状況を確認できません。{error}</p>}
						{onCheckIndex && (
							<button type="button" disabled={isCheckingIndex} onClick={onCheckIndex}>
								{isCheckingIndex ? '確認中…' : '反映を確認'}
							</button>
						)}
					</>
				)}
			</form>
			{mode === 'edit' && onWithdraw && (
				<div className={styles.dangerZone}>
					{confirmWithdraw ? (
						<div role="alertdialog" aria-labelledby={`${id}-withdraw`}>
							<h2 id={`${id}-withdraw`}>12月{registeredDay}日の参加登録を取り消しますか？</h2>
							<div className={styles.actions}>
								<button type="button" disabled={disabled} onClick={onWithdraw}>
									参加を取り消す
								</button>
								<button type="button" disabled={disabled} onClick={() => setConfirmWithdraw(false)}>
									戻る
								</button>
							</div>
						</div>
					) : (
						<button type="button" disabled={disabled} onClick={() => setConfirmWithdraw(true)}>
							参加登録を取り消す
						</button>
					)}
					{withdrawalState === 'error' && <p role="alert">{withdrawalError ?? '参加登録を取り消せませんでした。'}</p>}
					{withdrawalState === 'awaiting-index' && (
						<>
							<output>参加取消を保存しました。カレンダーへの反映を待っています。</output>
							{withdrawalError && (
								<p role="alert">参加取消の保存は完了しています。反映状況を確認できません。{withdrawalError}</p>
							)}
							{onCheckIndex && (
								<button type="button" disabled={isCheckingIndex} onClick={onCheckIndex}>
									{isCheckingIndex ? '確認中…' : '反映を確認'}
								</button>
							)}
						</>
					)}
				</div>
			)}
		</section>
	)
}
