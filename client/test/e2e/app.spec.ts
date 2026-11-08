import { expect, test } from '@playwright/test'

const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
const secondDid = 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb'
const cid = 'bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'
const projectUri = `at://${did}/win.tomo-x.atventar.calendar/3mabcdefghij2`
const entryUri = `at://${secondDid}/win.tomo-x.atventar.entry/3mabcdefghij3`
const profile = { did, handle: 'mori.bsky.social', displayName: 'mori' }
const calendar = {
	uri: projectUri,
	cid,
	author: profile,
	indexedAt: '2026-11-01T00:00:00Z',
	entryCount: 3,
	record: {
		$type: 'win.tomo-x.atventar.calendar',
		year: 2026,
		title: 'ものづくり2026',
		description: 'Webの技術について書きます。',
		createdAt: '2026-11-01T00:00:00Z',
	},
}
const entries = [
	{
		uri: `at://${did}/win.tomo-x.atventar.entry/3mabcdefghij4`,
		cid,
		day: 1,
		sheet: 1,
		title: 'CSSについて書きます',
		author: profile,
		calendar,
		createdAt: '2026-11-01T00:00:00Z',
		indexedAt: '2026-11-01T00:00:00Z',
	},
	{
		uri: entryUri,
		cid,
		day: 1,
		sheet: 2,
		title: '型設計の話',
		author: { did: secondDid, handle: 'haru.bsky.social', displayName: 'haru' },
		calendar,
		createdAt: '2026-11-01T00:00:00Z',
		indexedAt: '2026-11-01T01:00:00Z',
	},
	{
		uri: `at://${did}/win.tomo-x.atventar.entry/3mabcdefghij5`,
		cid,
		day: 2,
		sheet: 1,
		title: 'これから作るもの',
		author: profile,
		calendar,
		createdAt: '2026-11-01T00:00:00Z',
		indexedAt: '2026-11-01T00:00:00Z',
	},
]

const projectPath = `/calendars/${encodeURIComponent(did)}/3mabcdefghij2`
const entryPath = `/entries/${encodeURIComponent(secondDid)}/3mabcdefghij3`

async function mockApi(page: import('@playwright/test').Page) {
	await page.route('https://**/*', (route) => route.abort())
	await page.route('**/health', (route) =>
		route.fulfill({ json: { status: 'ok', currentYear: 2026, serverTime: '2026-11-09T12:00:00Z' } }),
	)
	await page.route('**/xrpc/*', (route) => {
		const url = new URL(route.request().url())
		const method = url.pathname.split('/').at(-1)
		if (method === 'win.tomo-x.atventar.getProfile')
			return route.fulfill({
				json: {
					...profile,
					did: url.searchParams.get('actor')?.startsWith('did:') ? url.searchParams.get('actor') : did,
				},
			})
		if (method === 'win.tomo-x.atventar.getCalendar')
			return url.searchParams.get('uri') === projectUri
				? route.fulfill({ json: { calendar, entries } })
				: route.fulfill({ status: 404, json: { error: 'CalendarNotFound', message: 'Not found' } })
		if (method === 'win.tomo-x.atventar.getActorEntries')
			return route.fulfill({
				json: { entries: entries.filter((entry) => entry.author.did === url.searchParams.get('actor')) },
			})
		if (method === 'win.tomo-x.atventar.listCalendars' || method === 'win.tomo-x.atventar.searchCalendars') {
			const matching =
				(!url.searchParams.get('q') || 'ものづくり2026'.includes(url.searchParams.get('q') ?? '')) &&
				(!url.searchParams.get('year') || url.searchParams.get('year') === '2026')
			return route.fulfill({ json: { calendars: matching ? [calendar] : [] } })
		}
		return route.fulfill({ status: 404, json: { error: 'MethodNotImplemented' } })
	})
}

test.beforeEach(async ({ page }) => {
	await mockApi(page)
})

test('browse all calendars, open the second sheet, and keep a stable registration URL', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('button', { name: 'ものづくり2026', exact: true }).click()
	await expect(page.getByRole('heading', { name: 'ものづくり2026', exact: true })).toBeVisible()
	await page.getByRole('link', { name: '2枚目 1/25人' }).click()
	await expect(page.getByRole('heading', { name: '2枚目 / 全2枚' })).toBeVisible()
	await expect(page.getByText('型設計の話', { exact: true })).toBeVisible()
	await expect(page.getByText('CSSについて書きます', { exact: true })).toHaveCount(0)
	await page.getByRole('link', { name: '12月1日の参加登録', exact: true }).click()
	await expect(page).toHaveURL(/\/entries\//)
	await expect(page.getByRole('link', { name: '現在のカレンダー：2枚目' })).toHaveAttribute(
		'href',
		`${projectPath}/sheets/2`,
	)
	await page.reload()
	await expect(page.getByRole('heading', { name: /12月1日/ })).toBeVisible()
	await expect(page.getByRole('button', { name: '自分の登録を編集' })).toHaveCount(0)
	await expect(page.locator('html')).toHaveJSProperty('scrollWidth', await page.evaluate(() => innerWidth))
})

test('search is URL-backed and handles zero results and browser back', async ({ page }) => {
	await page.goto('/')
	await page.getByRole('searchbox', { name: '検索' }).fill('見つからない')
	await page.getByRole('button', { name: '検索する', exact: true }).click()
	await expect(page).toHaveURL(/q=/)
	await expect(page.getByText('カレンダーはありません')).toBeVisible()
	await page.goBack()
	await expect(page.getByRole('button', { name: 'ものづくり2026' })).toBeVisible()
})

test('joining a day preserves the requested route through the login gate', async ({ page }) => {
	await page.goto(`${projectPath}/join?day=10`)
	await expect(page).toHaveURL(/\/login\?returnTo=/)
	await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
	await expect(page.getByRole('button', { name: '@passportでログイン' })).toBeVisible()
	const url = new URL(page.url())
	await expect(url.searchParams.get('returnTo')).toBe(`${projectPath}/join?day=10`)
})

test('sharing uses the stable registration URL and never a sheet number', async ({ page }) => {
	await page.goto(`${entryPath}/share`)
	const text = page.getByRole('textbox', { name: '共有文' })
	await expect(text).toHaveValue(/12月1日に参加します/)
	await expect(text).not.toHaveValue(/枚目|sheets/)
	await expect(text).toHaveValue(/\/entries\//)
})

test('missing calendars offer a way back, without rendering another sheet', async ({ page }) => {
	await page.goto(`/calendars/${encodeURIComponent(did)}/missing`)
	await expect(page.getByRole('heading', { name: '見つかりませんでした' })).toBeVisible()
	await expect(page.getByRole('link', { name: 'カレンダー一覧へ' })).toHaveAttribute('href', '/')
})

test('server year, not a skewed device clock, selects the initial directory year', async ({ page }) => {
	await page.clock.setFixedTime(new Date('2038-01-01T00:00:00Z'))
	await page.goto('/')
	await expect(page.getByRole('heading', { name: '2026年のカレンダー' })).toBeVisible()
})

async function signedIn(page: import('@playwright/test').Page) {
	await page.route('**/src/auth/AuthProvider.tsx*', (route) =>
		route.fulfill({
			contentType: 'application/javascript',
			body: `const session={sub:${JSON.stringify(did)},fetchHandler(path,init){return fetch(new URL(path,'https://pds.test'),init)}}; export function AuthProvider({children}){return children} export function useAuth(){return {session,status:'authenticated',error:null,login:async()=>{},loginWithAtPassport:async()=>{},logout:async()=>{}}}`,
		}),
	)
}

const newCid = `${cid.slice(0, -1)}a`
const ownEntryUri = entries[0].uri
const ownEntryPath = `/entries/${encodeURIComponent(did)}/3mabcdefghij4`

test('PDS save is distinct from indexing, and participation never specifies a sheet', async ({ page }) => {
	await signedIn(page)
	let indexed = false
	let written: { repo: string; record: Record<string, unknown> } | undefined
	const createdUri = `at://${did}/win.tomo-x.atventar.entry/new-registration`
	await page.route('https://pds.test/xrpc/com.atproto.repo.createRecord', async (route) => {
		written = route.request().postDataJSON()
		await route.fulfill({ json: { uri: createdUri, cid: newCid } })
	})
	await page.route('**/xrpc/win.tomo-x.atventar.getActorEntries**', (route) =>
		route.fulfill({
			json: {
				entries: indexed
					? [{ ...entries[0], uri: createdUri, cid: newCid, day: 10, title: '新しく作ったもの', sheet: 2 }]
					: [],
			},
		}),
	)
	await page.goto(`${projectPath}/join?day=10`)
	await expect(page.getByRole('combobox', { name: '担当日' })).toHaveValue('10')
	await page.getByRole('textbox', { name: '書く内容' }).fill('新しく作ったもの')
	await page.getByRole('button', { name: '参加を登録', exact: true }).click()
	await expect(page.getByRole('status')).toHaveText('参加登録を保存しました。カレンダーへの反映を待っています。')
	await expect(page.getByRole('button', { name: '反映待ち', exact: true })).toBeDisabled()
	expect(written?.repo).toBe(did)
	expect(written?.record).toMatchObject({
		day: 10,
		calendar: { uri: projectUri, cid },
		createdAt: '2026-11-09T12:00:00.000Z',
	})
	expect(written?.record).not.toHaveProperty('sheet')
	indexed = true
	await page.getByRole('button', { name: '反映を確認' }).click()
	await expect(page.getByRole('heading', { name: '参加を登録しました' })).toBeVisible()
	await expect(page.getByRole('status')).toHaveText('ものづくり2026 · 12月10日')
	await expect(page.getByRole('link', { name: '登録内容を見る' })).toHaveAttribute(
		'href',
		`/entries/${encodeURIComponent(did)}/new-registration`,
	)
})

test('editing uses full own PDS source and preserves future article references with CAS', async ({ page }) => {
	await signedIn(page)
	const article = { uri: `at://${did}/app.example.article/item`, cid }
	let indexed = false
	let written: Record<string, unknown> | undefined
	const raw = {
		$type: 'win.tomo-x.atventar.entry',
		day: 1,
		title: 'CSSについて書きます',
		url: 'https://example.com/private-draft',
		article,
		calendar: { uri: projectUri, cid },
		createdAt: '2026-11-01T00:00:00Z',
	}
	await page.route('https://pds.test/xrpc/com.atproto.repo.getRecord**', (route) =>
		route.fulfill({ json: { uri: ownEntryUri, cid, value: raw } }),
	)
	await page.route('https://pds.test/xrpc/com.atproto.repo.putRecord', (route) => {
		written = route.request().postDataJSON()
		return route.fulfill({ json: { uri: ownEntryUri, cid: newCid } })
	})
	await page.route('**/xrpc/win.tomo-x.atventar.getActorEntries**', (route) =>
		route.fulfill({
			json: {
				entries: [{ ...entries[0], cid: indexed ? newCid : cid, title: indexed ? '改訂した予定' : entries[0].title }],
			},
		}),
	)
	await page.goto(`${ownEntryPath}/edit`)
	await expect(page.getByRole('textbox', { name: '記事URL' })).toHaveValue(raw.url)
	await page.getByRole('textbox', { name: '書く内容' }).fill('改訂した予定')
	await page.getByRole('button', { name: '保存する', exact: true }).click()
	await expect(page.getByRole('button', { name: '反映待ち' })).toBeVisible()
	expect(written).toMatchObject({
		repo: did,
		swapRecord: cid,
		record: { title: '改訂した予定', article, url: raw.url, createdAt: raw.createdAt },
	})
	indexed = true
	await page.getByRole('button', { name: '反映を確認' }).click()
	await expect(page.getByRole('heading', { name: '記事を保存しました' })).toBeVisible()
})

test('withdrawal remains complete after indexing instead of trying to reload a deleted raw record', async ({
	page,
}) => {
	await signedIn(page)
	let indexed = false
	let reads = 0
	let deletion: Record<string, unknown> | undefined
	await page.route('https://pds.test/xrpc/com.atproto.repo.getRecord**', (route) => {
		reads += 1
		return route.fulfill({
			json: {
				uri: ownEntryUri,
				cid,
				value: {
					$type: 'win.tomo-x.atventar.entry',
					day: 1,
					title: 'CSSの話',
					calendar: { uri: projectUri, cid },
					createdAt: '2026-11-01T00:00:00Z',
				},
			},
		})
	})
	await page.route('https://pds.test/xrpc/com.atproto.repo.deleteRecord', (route) => {
		deletion = route.request().postDataJSON()
		return route.fulfill({ json: {} })
	})
	await page.route('**/xrpc/win.tomo-x.atventar.getActorEntries**', (route) =>
		route.fulfill({ json: { entries: indexed ? [] : [entries[0]] } }),
	)
	await page.goto(`${ownEntryPath}/edit`)
	await expect(page.getByRole('textbox', { name: '書く内容' })).toBeVisible()
	const readsBeforeDeletion = reads
	await page.getByRole('button', { name: '参加登録を取り消す' }).click()
	await page.getByRole('button', { name: '参加を取り消す', exact: true }).click()
	await expect(page.getByRole('status')).toHaveText('参加取消を保存しました。カレンダーへの反映を待っています。')
	expect(deletion).toMatchObject({ repo: did, rkey: '3mabcdefghij4', swapRecord: cid })
	indexed = true
	await page.getByRole('button', { name: '反映を確認' }).click()
	await expect(page.getByRole('heading', { name: '参加を取り消しました' })).toBeVisible()
	await page.evaluate(() => window.dispatchEvent(new Event('focus')))
	await expect(page.getByRole('heading', { name: '参加を取り消しました' })).toBeVisible()
	expect(reads).toBe(readsBeforeDeletion)
})

test('another participant cannot be edited even by a signed-in calendar organizer', async ({ page }) => {
	await signedIn(page)
	const requests: string[] = []
	page.on('request', (request) => {
		if (request.url().startsWith('https://pds.test/')) requests.push(request.url())
	})
	await page.goto(`${entryPath}/edit`)
	await expect(page.getByRole('heading', { name: '自分の登録だけを変更できます' })).toBeVisible()
	expect(requests).toHaveLength(0)
})

test('a new day in the same join route remounts the initial form selection', async ({ page }) => {
	await signedIn(page)
	await page.goto(`${projectPath}/join?day=10`)
	await expect(page.getByRole('combobox', { name: '担当日' })).toHaveValue('10')
	await page.evaluate(async (href) => {
		const app = await import(/* @vite-ignore */ '/src/app/router.tsx')
		app.go(href)
	}, `${projectPath}/join?day=18`)
	await expect(page.getByRole('combobox', { name: '担当日' })).toHaveValue('18')
})

test('calendar creation uses the server year and waits for the indexed CID', async ({ page }) => {
	await signedIn(page)
	await page.clock.setFixedTime(new Date('2038-01-01T00:00:00Z'))
	const createdUri = `at://${did}/win.tomo-x.atventar.calendar/new-calendar`
	let indexed = false
	let written: Record<string, unknown> | undefined
	await page.route('https://pds.test/xrpc/com.atproto.repo.createRecord', (route) => {
		written = route.request().postDataJSON()
		return route.fulfill({ json: { uri: createdUri, cid: newCid } })
	})
	await page.route('**/xrpc/win.tomo-x.atventar.getCalendar**', (route) => {
		if (new URL(route.request().url()).searchParams.get('uri') !== createdUri) return route.fallback()
		return indexed
			? route.fulfill({
					json: {
						calendar: {
							...calendar,
							uri: createdUri,
							cid: newCid,
							entryCount: 0,
							record: { ...calendar.record, title: '新しい企画' },
						},
						entries: [],
					},
				})
			: route.fulfill({ status: 404, json: { error: 'CalendarNotFound' } })
	})
	await page.goto('/calendars/new')
	await expect(page.getByRole('heading', { name: '2026年のカレンダーを作成' })).toBeVisible()
	await page.getByRole('textbox', { name: 'タイトル' }).fill('新しい企画')
	await page.getByRole('button', { name: '作成する' }).click()
	await expect(page.getByRole('status')).toHaveText('保存しました。反映を待っています。')
	expect(written).toMatchObject({
		repo: did,
		record: { year: 2026, title: '新しい企画', createdAt: '2026-11-09T12:00:00.000Z' },
	})
	indexed = true
	await page.getByRole('button', { name: '反映を確認' }).click()
	await expect(page.getByRole('status')).toHaveText('カレンダーに反映しました。')
	await page.getByRole('link', { name: '登録内容を見る' }).click()
	await expect(page.getByRole('heading', { name: '新しい企画', exact: true })).toBeVisible()
	await expect(page.getByText('1 枚のカレンダー')).toBeVisible()
})

test('a CAS conflict offers an explicit fresh-source reload without retrying the write', async ({ page }) => {
	await signedIn(page)
	let writes = 0
	const record = {
		$type: 'win.tomo-x.atventar.entry',
		day: 1,
		title: '元の内容',
		calendar: { uri: projectUri, cid },
		createdAt: '2026-11-01T00:00:00Z',
	}
	await page.route('https://pds.test/xrpc/com.atproto.repo.getRecord**', (route) =>
		route.fulfill({
			json: {
				uri: ownEntryUri,
				cid: writes ? newCid : cid,
				value: { ...record, title: writes ? '最新の内容' : record.title },
			},
		}),
	)
	await page.route('https://pds.test/xrpc/com.atproto.repo.putRecord', (route) => {
		writes += 1
		return route.fulfill({ status: 400, json: { error: 'InvalidSwap', message: 'stale' } })
	})
	await page.goto(`${ownEntryPath}/edit`)
	await page.getByRole('textbox', { name: '書く内容' }).fill('自分の変更')
	await page.getByRole('button', { name: '保存する', exact: true }).click()
	await page.getByRole('button', { name: '最新の内容を読み込む' }).click()
	await expect(page.getByRole('textbox', { name: '書く内容' })).toHaveValue('最新の内容')
	expect(writes).toBe(1)
})

test('profiles page through indexed registrations and expose joined, hosted and article tabs', async ({ page }) => {
	const anotherCalendar = {
		...calendar,
		uri: `at://${did}/win.tomo-x.atventar.calendar/other`,
		record: { ...calendar.record, title: 'もうひとつの企画' },
	}
	await page.route('**/xrpc/win.tomo-x.atventar.getActorEntries**', (route) => {
		const cursor = new URL(route.request().url()).searchParams.get('cursor')
		return route.fulfill({
			json: cursor
				? { entries: [{ ...entries[0], calendar: anotherCalendar }] }
				: { entries: [entries[0]], cursor: 'next-page' },
		})
	})
	await page.goto(`/users/${encodeURIComponent(did)}`)
	await expect(page.getByRole('heading', { name: 'mori', exact: true })).toBeVisible()
	await page.getByRole('button', { name: 'もっと見る', exact: true }).click()
	await expect(page.getByRole('button', { name: 'もうひとつの企画' })).toBeVisible()
	await page.getByRole('button', { name: '主催 1' }).click()
	await expect(page.getByRole('button', { name: 'ものづくり2026', exact: true })).toBeVisible()
	await page.getByRole('button', { name: '記事 0' }).click()
	await expect(page.getByText('記事はありません')).toBeVisible()
})

test('archive starts in the previous server year and permits explicit year selection', async ({ page }) => {
	await page.goto('/archive')
	await expect(page.getByRole('heading', { name: '2025年のカレンダー' })).toBeVisible()
	await page.getByRole('combobox', { name: '年', exact: true }).selectOption('2026')
	await expect(page.getByRole('heading', { name: '2026年のカレンダー' })).toBeVisible()
	await expect(page.getByRole('button', { name: 'ものづくり2026', exact: true })).toBeVisible()
})
