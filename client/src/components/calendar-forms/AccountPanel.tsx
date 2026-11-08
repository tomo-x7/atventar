import { useId } from 'react'
import './calendar-forms.css'

export interface AccountPanelProps {
	onSignIn?: (provider: 'GitHub' | 'Google') => void
	isSubmitting?: boolean
	error?: string
}

export function AccountPanel({ onSignIn, isSubmitting = false, error }: AccountPanelProps) {
	const id = useId()
	return (
		<section className="calendar-form-ui" aria-labelledby={`${id}-heading`} aria-busy={isSubmitting}>
			<h1 id={`${id}-heading`}>ログイン</h1>
			<div className="calendar-form-ui__providers">
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
