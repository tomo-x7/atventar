import { type ReactNode, useId } from 'react'
import styles from './ServiceShell.module.css'
import '../theme.css'

export type ServiceDestination = 'calendars' | 'archive' | 'help' | 'profile' | 'login'

export function ServiceShell({
	children,
	user,
	active = 'calendars',
	onNavigate,
	onSignOut,
}: {
	children: ReactNode
	user?: string
	onSignOut?: () => void
	active?: ServiceDestination
	onNavigate: (destination: ServiceDestination) => void
}) {
	const id = useId()
	return (
		<div className={styles.root}>
			<a className={styles.skip} href={`#${id}`}>
				本文へ
			</a>
			<header className={styles.header}>
				<button type="button" className={styles.brand} onClick={() => onNavigate('calendars')}>
					atventar<span aria-hidden="true"> /</span>
				</button>
				<nav aria-label="メイン">
					{(
						[
							{ value: 'calendars', label: 'カレンダー' },
							{ value: 'archive', label: '過去年' },
							{ value: 'help', label: 'ヘルプ' },
						] as const
					).map((item) => (
						<button
							key={item.value}
							type="button"
							aria-current={active === item.value ? 'page' : undefined}
							onClick={() => onNavigate(item.value)}
						>
							{item.label}
						</button>
					))}
				</nav>
				<button className={styles.account} type="button" onClick={() => onNavigate(user ? 'profile' : 'login')}>
					{user ?? 'ログイン'}
				</button>
				{user && onSignOut && (
					<button type="button" onClick={onSignOut}>
						ログアウト
					</button>
				)}
			</header>
			<div id={id} tabIndex={-1}>
				{children}
			</div>
			<footer className={styles.footer}>
				<span>atventar</span>
				<button type="button" onClick={() => onNavigate('help')}>
					ヘルプ
				</button>
			</footer>
		</div>
	)
}

export function ServiceHelp() {
	return (
		<section className={styles.page}>
			<h1>ヘルプ</h1>
			{[
				['アドベントカレンダーとは？', '12月1日から25日まで、参加者が1日ずつ記事を公開する企画です。'],
				[
					'参加するには？',
					'ログインして、書きたい日の「参加」を選び、書く内容を登録します。記事のURLは後から登録できます。',
				],
				[
					'同じ日に参加者がいる場合は？',
					'企画と日付を選んで参加できます。カレンダーの追加・配置は自動で決まり、表示中のカレンダーに配置されるとは限りません。',
				],
				[
					'登録したのに表示されない場合は？',
					'保存後、カレンダーへの反映を待つ場合があります。反映待ちは登録の失敗とは異なります。',
				],
				[
					'記事を登録・変更するには？',
					'自分の参加登録の「編集」から書く内容とURLを登録します。参加の取り消しも同じ画面で行います。',
				],
				[
					'参加を取り消すには？',
					'登録した本人が、自分の参加枠の「編集」から取り消せます。カレンダーの作成者は他の参加者の登録を変更・解除できません。',
				],
			].map(([question, answer]) => (
				<details key={question}>
					<summary>{question}</summary>
					<p>{answer}</p>
				</details>
			))}
		</section>
	)
}

export function ServiceState({ state, onRetry }: { state: 'loading' | 'error' | 'not-found'; onRetry?: () => void }) {
	return (
		<section className={`${styles.page} ${styles.state}`} aria-busy={state === 'loading'}>
			{state === 'loading' ? (
				<output>読み込み中…</output>
			) : (
				<>
					<h1>{state === 'error' ? '読み込めませんでした' : 'カレンダーが見つかりません'}</h1>
					{onRetry && (
						<button type="button" onClick={onRetry}>
							{state === 'error' ? '再試行' : 'カレンダー一覧へ'}
						</button>
					)}
				</>
			)}
		</section>
	)
}

export function ContentLayout({ children }: { children: ReactNode }) {
	return <div className={styles.page}>{children}</div>
}

export function PageMessage({
	title,
	children,
	onRetry,
}: {
	title: string
	children?: ReactNode
	onRetry?: () => void
}) {
	return (
		<section className={`${styles.page} ${styles.state}`}>
			<h1>{title}</h1>
			{children}
			{onRetry && (
				<button type="button" onClick={onRetry}>
					再試行
				</button>
			)}
		</section>
	)
}
