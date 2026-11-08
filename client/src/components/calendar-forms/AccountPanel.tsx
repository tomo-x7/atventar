import { AtPassportIcon, AtPassportUI } from '@atpassport/client/ui'
import { useId } from 'react'
import '../theme.css'
import styles from './CalendarForms.module.css'

export interface AccountPanelProps {
	onSignIn: (handle: string) => void
	onAtPassport: () => void
	isSubmitting?: boolean
	error?: string
}

export function AccountPanel({ onSignIn, onAtPassport, isSubmitting = false, error }: AccountPanelProps) {
	const id = useId()
	return (
		<section className={styles.root} aria-labelledby={`${id}-heading`} aria-busy={isSubmitting}>
			<h1 id={`${id}-heading`}>ログイン</h1>
			<button className={styles.passport} type="button" disabled={isSubmitting} onClick={onAtPassport}>
				<AtPassportIcon size={24} aria-hidden="true" />
				{AtPassportUI.ja.title}
			</button>
			<form
				className={styles.handleLogin}
				onSubmit={(event) => {
					event.preventDefault()
					if (!isSubmitting) onSignIn(String(new FormData(event.currentTarget).get('handle')).trim().replace(/^@/, ''))
				}}
			>
				<h2>Bluesky・Atmosphereでログイン</h2>
				<label htmlFor={`${id}-handle`}>ハンドル</label>
				<input
					id={`${id}-handle`}
					name="handle"
					required
					pattern="@?[^\s@]+\.[^\s@]+"
					autoComplete="username"
					autoCapitalize="none"
					spellCheck={false}
					disabled={isSubmitting}
				/>
				<div className={styles.actions}>
					<button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'ログイン中…' : 'ログイン'}
					</button>
				</div>
			</form>
			{error && <p role="alert">{error}</p>}
		</section>
	)
}
