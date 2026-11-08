import { useId } from 'react'
import '../theme.css'
import styles from './CalendarForms.module.css'

export interface IndexingResultProps {
	title: string
	projectName: string
	day?: number
	pending: boolean
	recordHref: string
	onCheck?: () => void
	onShare?: () => void
	isChecking?: boolean
	error?: string
}

export function IndexingResult({
	title,
	projectName,
	day,
	pending,
	recordHref,
	onCheck,
	onShare,
	isChecking = false,
	error,
}: IndexingResultProps) {
	const id = useId()
	const safeRecordHref = /^(https?:\/\/|\/(?!\/))/i.test(recordHref) ? recordHref : undefined
	return (
		<section className={styles.root} aria-labelledby={`${id}-heading`}>
			<h1 id={`${id}-heading`}>{title}</h1>
			<p>
				{projectName}
				{day !== undefined && ` · 12月${day}日`}
			</p>
			<output>{pending ? '保存しました。反映を待っています。' : 'カレンダーに反映しました。'}</output>
			{pending && error && <p role="alert">保存は完了しています。反映状況を確認できません。{error}</p>}
			<div className={`${styles.actions} ${styles.completionActions}`}>
				{pending && onCheck && (
					<button type="button" onClick={onCheck} disabled={isChecking}>
						{isChecking ? '確認中…' : '反映を確認'}
					</button>
				)}
				{!pending && safeRecordHref && <a href={safeRecordHref}>登録内容を見る</a>}
				{!pending && onShare && (
					<button type="button" onClick={onShare}>
						共有する
					</button>
				)}
			</div>
		</section>
	)
}
