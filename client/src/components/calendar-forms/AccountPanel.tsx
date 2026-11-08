import { useId } from 'react'
import '../theme.css'
import styles from './CalendarForms.module.css'

export interface AccountPanelProps {
	onSignIn?: (provider: 'GitHub' | 'Google') => void
	isSubmitting?: boolean
	error?: string
}

export function AccountPanel({ onSignIn, isSubmitting = false, error }: AccountPanelProps) {
	const id = useId()
	return (
		<section className={styles.root} aria-labelledby={`${id}-heading`} aria-busy={isSubmitting}>
			<h1 id={`${id}-heading`}>ログイン</h1>
			<div className={styles.providers}>
				<button type="button" disabled={isSubmitting} onClick={() => onSignIn?.('GitHub')}>
					GitHub でログイン
				</button>
				<button type="button" disabled={isSubmitting} onClick={() => onSignIn?.('Google')}>
					Google でログイン
				</button>
			</div>
			{error && <p role="alert">{error}</p>}
		</section>
	)
}
