import assert from 'node:assert/strict'
import { test } from 'node:test'
import documentRecord from '../lexicons/site/standard/document'
import calendarRecord from '../lexicons/win/tomo-x/atventar/calendar'
import { calendarView, entryView } from '../lexicons/win/tomo-x/atventar/defs'
import entryRecord from '../lexicons/win/tomo-x/atventar/entry'
import { toCalendarSheets, toCalendarSummary, toEntryFormValue } from './adapters'
import { createAppViewClient } from './appview'
import { DataError } from './errors'
import { createRepositoryClient, type EntrySnapshot } from './repository'
import { calendarCollection, entryCollection, parseRecordUri } from './validation'

const cid = 'bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'
const participant = 'did:plc:participant'
const organizer = 'did:plc:organizer'
const calendarUri = `at://${organizer}/${calendarCollection}/project1`
const entryUri = `at://${participant}/${entryCollection}/entry1`
const createdAt = '2026-11-01T12:00:00.000Z'
const calendar = calendarView.parse({
	uri: calendarUri,
	cid,
	author: { did: organizer },
	indexedAt: createdAt,
	entryCount: 2,
	record: calendarRecord.parse({ $type: calendarCollection, year: 2026, title: 'フロントエンド', createdAt }),
})
const raw = entryRecord.parse({
	$type: entryCollection,
	day: 12,
	title: '予定記事',
	calendar: { uri: calendarUri, cid },
	createdAt,
	url: 'https://example.com/future',
	article: { uri: `at://${participant}/app.example.article/article1`, cid },
	comment: 'コメント',
})
const projected = (uri = entryUri, sheet = 1, day = 12) =>
	entryView.parse({
		uri,
		cid,
		author: { did: participant, displayName: '参加者' },
		calendar,
		day,
		title: '予定記事',
		createdAt,
		indexedAt: createdAt,
		sheet,
	})

function harness(options: { publication?: string } = {}) {
	const requests: { path: string; body?: Record<string, unknown> }[] = []
	let conflict = false
	let document: Record<string, unknown> | null = null
	const session = {
		sub: participant,
		async fetchHandler(path: `/${string}`, init: RequestInit) {
			assert.equal(this.sub, participant, 'OAuth transport preserves session this binding')
			const body = init.body ? ((await new Response(init.body).json()) as Record<string, unknown>) : undefined
			requests.push({ path, body })
			if (path.startsWith('/xrpc/com.atproto.sync.getLatestCommit')) return Response.json({ cid, rev: '3lsh3fnlgrk2a' })
			if (path.startsWith('/xrpc/com.atproto.repo.getRecord')) {
				const params = new URL(path, 'https://pds.example').searchParams
				const isCalendar = params.get('collection') === calendarCollection
				if (params.get('collection') === 'site.standard.document')
					return document
						? Response.json({ uri: `at://${participant}/site.standard.document/3lsh3fnlgrk2a`, cid, value: document })
						: Response.json({ error: 'RecordNotFound', message: 'missing document' }, { status: 400 })
				return Response.json({
					uri: isCalendar ? `at://${participant}/${calendarCollection}/3lsh3fnlgrk2a` : entryUri,
					cid,
					value: isCalendar ? calendar.record : raw,
				})
			}
			if (conflict) return Response.json({ error: 'InvalidSwap', message: 'stale CID' }, { status: 400 })
			if (path.endsWith('deleteRecord')) return Response.json({})
			if (path.endsWith('applyWrites')) {
				const writes = body?.writes as { $type: string; collection: string; rkey: string }[]
				return Response.json({
					results: writes.map((write) => ({
						$type: `${write.$type}Result`,
						uri: `at://${participant}/${write.collection}/${write.rkey}`,
						cid,
					})),
				})
			}
			return Response.json({ uri: entryUri, cid })
		},
	}
	const appView = {
		getCalendar: async (uri: string) => {
			assert.equal(uri, calendarUri)
			return { calendar, entries: [projected()] }
		},
	}
	const repo = createRepositoryClient(session, appView, {
		now: () => new Date('2026-11-09T00:00:00.000Z'),
		appOrigin: 'https://calendar.example',
		...options,
	})
	return {
		repo,
		requests,
		session,
		appView,
		setConflict: () => {
			conflict = true
		},
		setDocument: (record: Record<string, unknown>) => {
			document = record
		},
	}
}

function errorCode(code: DataError['code']) {
	return (error: unknown) => error instanceof DataError && error.code === code
}

test('future URL and article survive editing from the complete PDS source; CAS and createdAt are preserved', async () => {
	const { repo, requests } = harness()
	assert.equal(projected().url, undefined)
	assert.equal(projected().article, undefined)
	const snapshot = await repo.readEntryForEdit(entryUri)
	const input = toEntryFormValue(snapshot)
	assert.equal(input.url, raw.url)
	await repo.updateEntry(snapshot, { ...input, title: '変更後のタイトル', day: 15 })
	const write = requests.at(-1)?.body
	assert.equal(write?.repo, participant)
	assert.equal(write?.rkey, 'entry1')
	assert.equal(write?.swapRecord, cid)
	const record = write?.record as Record<string, unknown>
	assert.equal(record.url, raw.url)
	assert.deepEqual(record.article, raw.article)
	assert.equal(record.createdAt, createdAt)
	assert.equal(record.day, 15)
	assert.equal(record.title, '変更後のタイトル')
})

test('clearing URL and comment does not remove an existing article reference', async () => {
	const { repo, requests } = harness()
	const snapshot = await repo.readEntryForEdit(entryUri)
	await repo.updateEntry(snapshot, { day: 12, title: raw.title, url: '', comment: '' })
	const record = requests.at(-1)?.body?.record as Record<string, unknown>
	assert.ok(!('url' in record))
	assert.ok(!('comment' in record))
	assert.deepEqual(record.article, raw.article)
})

test('a projected record cannot be submitted as an edit snapshot', async () => {
	const { repo, requests } = harness()
	await assert.rejects(
		repo.updateEntry({ uri: entryUri, cid, record: projected() } as unknown as EntrySnapshot, {
			day: 12,
			title: '変更',
			url: '',
			comment: '',
		}),
		errorCode('invalid-record'),
	)
	assert.equal(requests.length, 0)
})

test('only the signed-in record author can read, update, or withdraw a participation', async () => {
	const { repo, requests, session, appView } = harness()
	const otherUri = `at://${organizer}/${entryCollection}/other`
	await assert.rejects(repo.readEntryForEdit(otherUri), errorCode('not-owner'))
	assert.equal(requests.length, 0)
	const snapshot = await repo.readEntryForEdit(entryUri)
	const organizerRepo = createRepositoryClient({ ...session, sub: organizer }, appView)
	await assert.rejects(
		organizerRepo.updateEntry(snapshot, { day: 12, title: raw.title, url: '', comment: '' }),
		errorCode('not-owner'),
	)
	await assert.rejects(organizerRepo.withdrawEntry(snapshot), errorCode('not-owner'))
	assert.equal(requests.length, 1)
})

test('entry update and withdrawal detect CAS conflicts without unconditional retry', async () => {
	const { repo, requests, setConflict } = harness()
	const snapshot = await repo.readEntryForEdit(entryUri)
	setConflict()
	await assert.rejects(repo.updateEntry(snapshot, toEntryFormValue(snapshot)), errorCode('conflict'))
	await assert.rejects(repo.withdrawEntry(snapshot), errorCode('conflict'))
	assert.equal(requests.length, 3)
	assert.equal(requests.at(-1)?.body?.swapRecord, cid)
})

test('entry creation retrieves the calendar strong reference and writes to the signed-in repository', async () => {
	const { repo, requests } = harness()
	await repo.createEntry(calendarUri, { day: 5, title: ' 新しい記事 ', url: 'https://example.com/new', comment: '' })
	const write = requests[0].body
	assert.equal(write?.repo, participant)
	const record = write?.record as Record<string, unknown>
	assert.deepEqual(record.calendar, { uri: calendarUri, cid })
	assert.equal(record.title, '新しい記事')
	assert.equal(record.createdAt, '2026-11-09T00:00:00.000Z')
	assert.ok(!('sheet' in record))
})

test('invalid day, URL, title, year, and non-DID record URIs are rejected before writing', async () => {
	const { repo, requests } = harness()
	const input = { day: 1, title: '記事', url: '', comment: '' }
	for (const day of [0, 26, 1.5])
		await assert.rejects(repo.createEntry(calendarUri, { ...input, day }), errorCode('invalid-input'))
	for (const url of ['javascript:alert(1)', 'ftp://example.com/file', '//example.com/article'])
		await assert.rejects(repo.createEntry(calendarUri, { ...input, url }), errorCode('invalid-input'))
	await assert.rejects(repo.createEntry(calendarUri, { ...input, title: ' ' }), errorCode('invalid-input'))
	await assert.rejects(repo.createCalendar({ year: 0, title: '企画', description: '' }), errorCode('invalid-input'))
	assert.throws(() => parseRecordUri('at://alice.example/win.tomo-x.atventar.entry/key'), errorCode('invalid-input'))
	assert.equal(requests.length, 0)
})

test('calendar edits preserve source createdAt and use owner validation and CAS', async () => {
	const { repo, requests, setConflict } = harness()
	const uri = `at://${participant}/${calendarCollection}/3lsh3fnlgrk2a`
	const snapshot = await repo.readCalendarForEdit(uri)
	await repo.updateCalendar(snapshot, { title: '更新した企画', year: 2026, description: '詳細' })
	const write = requests.at(-1)?.body
	assert.equal(write?.swapCommit, cid)
	const writes = write?.writes as { $type: string; value: Record<string, unknown> }[]
	assert.equal(writes[0].value.createdAt, createdAt)
	assert.equal(writes[0].$type, 'com.atproto.repo.applyWrites#update')
	assert.equal(writes[1].$type, 'com.atproto.repo.applyWrites#create')
	assert.equal(writes[1].value.publishedAt, createdAt)
	await assert.rejects(repo.readCalendarForEdit(calendarUri), errorCode('not-owner'))
	setConflict()
	await assert.rejects(
		repo.updateCalendar(snapshot, { title: '再変更', year: 2026, description: '' }),
		errorCode('conflict'),
	)
})

test('adapters use server sheet numbers and stable record URIs without reassignment', () => {
	const entries = [projected(`${entryUri}-a`, 3, 2), projected(`${entryUri}-b`, 1, 2), projected(`${entryUri}-c`, 3, 1)]
	const sheets = toCalendarSheets(calendar, entries, {
		viewerDid: participant,
		getProfileHref: (did) => `/users/${did}`,
	})
	assert.deepEqual(
		sheets.map((sheet) => sheet.number),
		[1, 3],
	)
	assert.deepEqual(
		sheets[1].entries.map((entry) => entry.uri),
		[`${entryUri}-a`, `${entryUri}-c`],
	)
	assert.equal(sheets[1].entries[0].day, 2)
	assert.equal(sheets[1].entries[0].isOwner, true)
	assert.equal(sheets[1].entries[0].status, 'reserved')
	assert.equal(toCalendarSummary(calendar).sheets, undefined, 'global entry count cannot determine sheet count')
	assert.equal(toCalendarSummary(calendar, sheets).sheets, 2)
})

test('AppView typed queries preserve filters/cursors and propagate AbortSignal', async () => {
	const requests: Request[] = []
	const fetcher: typeof fetch = async (input, init) => {
		const request = new Request(input, init)
		requests.push(request)
		const pathname = new URL(request.url).pathname
		if (pathname.endsWith('getActorEntries')) return Response.json({ entries: [projected()], cursor: 'next-entries' })
		if (pathname.endsWith('getProfile')) return Response.json({ did: participant })
		if (pathname.endsWith('getCalendar')) return Response.json({ calendar, entries: [projected()] })
		return Response.json({ calendars: [calendar], cursor: 'next-calendars' })
	}
	const appView = createAppViewClient('https://appview.example', fetcher)
	const controller = new AbortController()
	const page = await appView.listCalendars(
		{ year: 2026, author: organizer, limit: 10, cursor: 'next' },
		{ signal: controller.signal },
	)
	assert.equal(page.cursor, 'next-calendars')
	const params = new URL(requests[0].url).searchParams
	assert.equal(params.get('author'), organizer)
	assert.equal(params.get('year'), '2026')
	assert.equal(params.get('limit'), '10')
	assert.equal(params.get('cursor'), 'next')
	controller.abort()
	assert.equal(requests[0].signal.aborted, true)
	await appView.searchCalendars({ q: ' CSS ', limit: 5 })
	assert.equal(new URL(requests[1].url).searchParams.get('q'), 'CSS')
	await appView.getCalendar(calendarUri)
	await appView.getProfile(participant)
	const entries = await appView.getActorEntries({ actor: participant, cursor: 'entry-cursor' })
	assert.equal(entries.cursor, 'next-entries')
	assert.equal(new URL(requests.at(-1)?.url ?? '').searchParams.get('cursor'), 'entry-cursor')
})

test('stable entry lookup follows AppView pagination and never fetches raw PDS content', async () => {
	const paths: URL[] = []
	const fetcher: typeof fetch = async (input, init) => {
		const url = new URL(new Request(input, init).url)
		paths.push(url)
		assert.equal(url.pathname, '/xrpc/win.tomo-x.atventar.getActorEntries')
		return Response.json(url.searchParams.has('cursor') ? { entries: [projected()] } : { entries: [], cursor: 'page2' })
	}
	const appView = createAppViewClient('https://appview.example', fetcher)
	const entry = await appView.findEntry(entryUri)
	assert.equal(entry.uri, entryUri)
	assert.equal(entry.url, undefined)
	assert.equal(paths.length, 2)
	assert.equal(paths[1].searchParams.get('cursor'), 'page2')
})

test('server info uses the server timestamp and JST year rather than the browser clock', async () => {
	const fetcher: typeof fetch = async (input) => {
		assert.equal(String(input), 'https://appview.example/health')
		return Response.json({ currentYear: 2027, serverTime: '2026-12-31T15:00:00.000Z' })
	}
	assert.deepEqual(await createAppViewClient('https://appview.example', fetcher).getServerInfo(), {
		currentYear: 2027,
		serverTime: '2026-12-31T15:00:00.000Z',
	})
	const invalid: typeof fetch = async () => Response.json({ currentYear: 2026, serverTime: '2026-12-31T15:00:00.000Z' })
	await assert.rejects(
		createAppViewClient('https://appview.example', invalid).getServerInfo(),
		errorCode('invalid-record'),
	)
})

const ownCalendarUri = `at://${participant}/${calendarCollection}/3lsh3fnlgrk2a`
const ownDocumentUri = `at://${participant}/site.standard.document/3lsh3fnlgrk2a`
const documentPath = `/calendars/${encodeURIComponent(participant)}/3lsh3fnlgrk2a`
function existingDocument(overrides: Record<string, unknown> = {}) {
	return documentRecord.parse({
		$type: 'site.standard.document',
		site: 'https://calendar.example',
		path: documentPath,
		title: '元の企画',
		description: '元の説明',
		publishedAt: createdAt,
		content: { $type: 'win.tomo-x.atventar.calendar#documentContent', calendar: ownCalendarUri },
		textContent: '',
		...overrides,
	})
}

test('calendar creation atomically creates a standard document referring to the calendar AT URI', async () => {
	const { repo, requests } = harness()
	const result = await repo.createCalendar({ title: ' 企画 ', year: 2026, description: ' 説明 ' })
	assert.equal(requests.length, 1)
	assert.equal(requests[0].path, '/xrpc/com.atproto.repo.applyWrites')
	const body = requests[0].body
	const writes = body?.writes as { $type: string; collection: string; rkey: string; value: Record<string, unknown> }[]
	assert.equal(body?.repo, participant)
	assert.equal(writes.length, 2)
	assert.equal(writes[0].$type, 'com.atproto.repo.applyWrites#create')
	assert.equal(writes[1].$type, 'com.atproto.repo.applyWrites#create')
	assert.equal(writes[0].collection, calendarCollection)
	assert.equal(writes[1].collection, 'site.standard.document')
	assert.match(writes[0].rkey, /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/)
	assert.equal(writes[0].rkey, writes[1].rkey)
	const document = documentRecord.parse(writes[1].value)
	assert.equal(document.site, 'https://calendar.example')
	assert.equal(document.path, `/calendars/${encodeURIComponent(participant)}/${writes[0].rkey}`)
	assert.equal(document.title, '企画')
	assert.equal(document.description, '説明')
	assert.equal(document.publishedAt, writes[0].value.createdAt)
	assert.equal(document.textContent, '')
	assert.deepEqual(document.content, { $type: 'win.tomo-x.atventar.calendar#documentContent', calendar: result.uri })
	assert.equal(result.documentUri, `at://${participant}/site.standard.document/${writes[0].rkey}`)
	assert.equal(result.cid, cid)
	assert.equal(result.documentCid, cid)
})

test('calendar editing preserves standard document publication and metadata in one commit-guarded transaction', async () => {
	const { repo, requests, setDocument } = harness()
	const publication = 'at://did:plc:publisher/site.standard.publication/3lsh3fnlgrk2a'
	const original = existingDocument({
		site: publication,
		tags: ['advent'],
		bskyPostRef: { uri: `at://${participant}/app.bsky.feed.post/3lsh3fnlgrk2a`, cid },
		futureField: 'keep',
	})
	setDocument(original)
	const snapshot = await repo.readCalendarForEdit(ownCalendarUri)
	assert.match(requests[0].path, /^\/xrpc\/com.atproto.sync.getLatestCommit\?/)
	assert.equal(requests.length, 3)
	const result = await repo.updateCalendar(snapshot, { title: '変更後', year: 2026, description: '' })
	assert.equal(result.documentUri, ownDocumentUri)
	const write = requests.at(-1)?.body
	assert.equal(write?.swapCommit, cid)
	const writes = write?.writes as { $type: string; value: Record<string, unknown> }[]
	assert.equal(writes.length, 2)
	assert.ok(writes.every((item) => item.$type === 'com.atproto.repo.applyWrites#update'))
	const document = documentRecord.parse(writes[1].value)
	assert.equal(document.site, publication)
	assert.equal(document.path, documentPath)
	assert.equal(document.title, '変更後')
	assert.equal(document.description, undefined)
	assert.equal(document.publishedAt, createdAt)
	assert.equal(document.updatedAt, '2026-11-09T00:00:00.000Z')
	assert.equal(document.textContent, '')
	assert.deepEqual(document.tags, original.tags)
	assert.deepEqual(document.bskyPostRef, original.bskyPostRef)
	assert.equal(writes[1].value.futureField, 'keep')
})

test('an unrelated document at the same record key blocks editing instead of being overwritten', async () => {
	for (const overrides of [
		{ content: { $type: 'win.tomo-x.atventar.calendar#documentContent', calendar: calendarUri } },
		{ content: { $type: 'app.example.text', text: 'unrelated content' } },
		{ path: '/another-calendar' },
		{ site: 'https://calendar.example/another-site' },
		{ site: 'https://calendar.example?redirect=elsewhere' },
	]) {
		const { repo, requests, setDocument } = harness()
		setDocument(existingDocument(overrides))
		await assert.rejects(repo.readCalendarForEdit(ownCalendarUri), errorCode('invalid-record'))
		assert.ok(requests.every((item) => !item.body))
	}
})

test('a standard document on another site is not silently republished or modified', async () => {
	const { repo, requests, setDocument } = harness()
	setDocument(existingDocument({ site: 'https://another.example' }))
	const snapshot = await repo.readCalendarForEdit(ownCalendarUri)
	await assert.rejects(
		repo.updateCalendar(snapshot, { title: '変更', year: 2026, description: '' }),
		errorCode('invalid-record'),
	)
	assert.ok(requests.every((item) => !item.body))
})

test('creating a calendar requires an explicit HTTP(S) application origin before any PDS write', async () => {
	const { session, appView, requests } = harness()
	for (const appOrigin of [
		undefined,
		'',
		'javascript:alert(1)',
		'at://did:plc:publisher/site.standard.publication/key',
	]) {
		const repo = createRepositoryClient(session, appView, { appOrigin })
		await assert.rejects(
			repo.createCalendar({ title: '企画', year: 2026, description: '' }),
			errorCode('invalid-input'),
		)
	}
	assert.equal(requests.length, 0)
})

const configuredPublication = 'at://did:plc:publisher/site.standard.publication/3lsh3fnlgrk2a'

test('new calendar documents and legacy calendar upgrades use the configured publication without creating it', async () => {
	for (const mode of ['create', 'legacy'] as const) {
		const { repo, requests } = harness({ publication: configuredPublication })
		const value = { title: '企画', year: 2026, description: '説明' }
		if (mode === 'create') await repo.createCalendar(value)
		else await repo.updateCalendar(await repo.readCalendarForEdit(ownCalendarUri), value)
		const writes = requests.at(-1)?.body?.writes as { collection: string; value: Record<string, unknown> }[]
		assert.equal(writes[1].value.site, configuredPublication)
		assert.equal(writes[1].value.textContent, '')
		assert.deepEqual(
			writes.map((write) => write.collection),
			[calendarCollection, 'site.standard.document'],
		)
	}
})

test('editing adopts the configured publication for own-site loose documents but preserves an existing publication', async () => {
	for (const site of ['https://calendar.example', 'at://did:plc:other/site.standard.publication/3lsh3fnlgrk2a']) {
		const { repo, requests, setDocument } = harness({ publication: configuredPublication })
		setDocument(existingDocument({ site }))
		await repo.updateCalendar(await repo.readCalendarForEdit(ownCalendarUri), {
			title: '更新',
			year: 2026,
			description: '',
		})
		const writes = requests.at(-1)?.body?.writes as { value: Record<string, unknown> }[]
		assert.equal(writes[1].value.site, site.startsWith('at://') ? site : configuredPublication)
	}
})

test('invalid publication configuration is rejected before writing', async () => {
	for (const publication of ['', 'https://calendar.example', ownCalendarUri]) {
		const { repo, requests } = harness({ publication })
		await assert.rejects(
			repo.createCalendar({ title: '企画', year: 2026, description: '' }),
			errorCode('invalid-input'),
		)
		assert.equal(requests.length, 0)
	}
})
