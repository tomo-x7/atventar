import { useId, useState } from 'react'
import '../theme.css'
import styles from './CalendarForms.module.css'

export interface CalendarFormValue {
	title: string
	year: number
	description: string
}

interface CalendarFormCommonProps {
	/** サーバーから受け取った現在の年。端末の時計は使用しません。 */
	currentYear: number
	onSave?: (value: CalendarFormValue) => void
	onCancel?: () => void
	isSubmitting?: boolean
	error?: string
}

export type CalendarFormProps = CalendarFormCommonProps &
	({ mode?: 'create'; initialValue?: Partial<CalendarFormValue> } | { mode: 'edit'; initialValue: CalendarFormValue })

export function CalendarForm(props: CalendarFormProps) {
	const { mode = 'create', initialValue, onSave, onCancel, isSubmitting = false, error } = props
	const year = props.mode === 'edit' ? props.initialValue.year : props.currentYear

	const id = useId()
	const [saved, setSaved] = useState(false)
	return (
		<section className={styles.root} aria-labelledby={`${id}-heading`}>
			<h1 id={`${id}-heading`}>
				{year}年のカレンダーを{mode === 'create' ? '作成' : '編集'}
			</h1>
			<form
				aria-busy={isSubmitting}
				onChange={() => setSaved(false)}
				onSubmit={(event) => {
					event.preventDefault()
					if (isSubmitting) return
					const data = new FormData(event.currentTarget)
					onSave?.({
						title: String(data.get('title')).trim(),
						year,
						description: String(data.get('description')).trim(),
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
				<label htmlFor={`${id}-description`}>説明</label>
				<textarea
					disabled={isSubmitting}
					id={`${id}-description`}
					name="description"
					rows={6}
					maxLength={3000}
					defaultValue={initialValue?.description ?? ''}
				/>
				<div className={styles.actions}>
					<button className={styles.primary} type="submit" disabled={isSubmitting}>
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
		</section>
	)
}
