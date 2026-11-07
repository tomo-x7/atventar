import { type ReactNode, useId } from 'react'
import './service-shell.css'

export type ServiceDestination = 'calendars' | 'archive' | 'help' | 'profile' | 'login'

export function ServiceShell({
	children,
	user,
	active = 'calendars',
	onNavigate,
}: {
	children: ReactNode
	user?: string
	active?: ServiceDestination
	onNavigate: (destination: ServiceDestination) => void
}) {
	const id = useId()
	return (
		<div className="service-ui">
			<a className="service-skip" href={`#${id}`}>
				本文へ
			</a>
			<header className="service-header">
				<button type="button" className="service-brand" onClick={() => onNavigate('calendars')}>
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
				<button className="service-account" type="button" onClick={() => onNavigate(user ? 'profile' : 'login')}>
					{user ?? 'ログイン'}
				</button>
			</header>
			<div id={id} tabIndex={-1}>
				{children}
			</div>
			<footer className="service-footer">
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
		<section className="service-page">
			<h1>ヘルプ</h1>
			{[
				['アドベントカレンダーとは？', '12月1日から25日まで、参加者が1日ずつ記事を公開する企画です。'],
				[
					'参加するには？',
					'ログインして、カレンダーの空いている日から「参加する」を選びます。記事のURLは後から登録できます。',
				],
				[
					'カレンダーを増やすには？',
					'主催者は同じ企画にカレンダーを追加できます。それぞれのカレンダーに12月1日から25日までの参加枠があります。',
				],
				[
					'記事を登録・変更するには？',
					'自分の参加枠の「編集」から記事のタイトルとURLを登録します。参加の取り消しも同じ画面で行います。',
				],
				[
					'登録を管理するには？',
					'主催者は管理画面で参加登録を確認・削除できます。参加登録のあるカレンダーは、登録を削除してから削除します。',
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
		<section className="service-page service-state" aria-busy={state === 'loading'}>
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
