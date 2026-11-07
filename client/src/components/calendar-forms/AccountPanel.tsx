import { useId, useState } from 'react'
import './calendar-forms.css'

export interface ProfileValue {
	name: string
	bio: string
	website: string
}

export interface AccountPanelProps {
	profile?: ProfileValue
	onSignIn?: (provider: 'GitHub' | 'Google') => void
	onSave?: (profile: ProfileValue) => void
	onSignOut?: () => void
	onDelete?: () => void
	isSubmitting?: boolean
	error?: string
}

export function AccountPanel({
	profile,
	onSignIn,
	onSave,
	onSignOut,
	onDelete,
	isSubmitting = false,
	error,
}: AccountPanelProps) {
	const id = useId()
	const [saved, setSaved] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [deleted, setDeleted] = useState(false)
	if (deleted)
		return (
			<div className="calendar-form-ui">
				<output>アカウントを削除しました</output>
			</div>
		)
	if (!profile)
		return (
			<section className="calendar-form-ui" aria-labelledby={`${id}-heading`}>
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

	return (
		<section className="calendar-form-ui" aria-labelledby={`${id}-heading`}>
			<h1 id={`${id}-heading`}>アカウント設定</h1>
			<form
				aria-busy={isSubmitting}
				onChange={() => setSaved(false)}
				onSubmit={(event) => {
					event.preventDefault()
					if (isSubmitting) return
					const data = new FormData(event.currentTarget)
					onSave?.({
						name: String(data.get('name')).trim(),
						bio: String(data.get('bio')).trim(),
						website: String(data.get('website')).trim(),
					})
					setSaved(true)
				}}
			>
				<label htmlFor={`${id}-name`}>表示名</label>
				<input
					disabled={isSubmitting}
					id={`${id}-name`}
					name="name"
					autoComplete="nickname"
					required
					maxLength={50}
					pattern=".*\S.*"
					defaultValue={profile.name}
				/>
				<label htmlFor={`${id}-bio`}>自己紹介</label>
				<textarea
					disabled={isSubmitting}
					id={`${id}-bio`}
					name="bio"
					rows={4}
					maxLength={500}
					defaultValue={profile.bio}
				/>
				<label htmlFor={`${id}-website`}>ウェブサイト</label>
				<input
					disabled={isSubmitting}
					id={`${id}-website`}
					name="website"
					type="url"
					pattern="https?://.*"
					autoComplete="url"
					defaultValue={profile.website}
				/>
				<div className="calendar-form-ui__actions">
					<button className="calendar-form-ui__primary" type="submit" disabled={isSubmitting}>
						{isSubmitting ? '保存中…' : '保存する'}
					</button>
				</div>
				{error && <p role="alert">{error}</p>}
				{saved && !error && !isSubmitting && <output>プロフィールを保存しました</output>}
			</form>
			<div className="calendar-form-ui__danger-zone">
				<div className="calendar-form-ui__actions">
					{onSignOut && (
						<button type="button" disabled={isSubmitting} onClick={onSignOut}>
							ログアウト
						</button>
					)}
					{onDelete && !confirmDelete && (
						<button type="button" disabled={isSubmitting} onClick={() => setConfirmDelete(true)}>
							アカウントを削除
						</button>
					)}
				</div>
				{onDelete && confirmDelete && (
					<div role="alertdialog" aria-labelledby={`${id}-delete`}>
						<h2 id={`${id}-delete`}>アカウントと参加登録を削除しますか？</h2>
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
				)}
			</div>
		</section>
	)
}
