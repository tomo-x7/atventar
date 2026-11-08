import assert from 'node:assert/strict'
import { test } from 'node:test'
import { app } from '../src/app.js'
import { oauthClientMetadata, serverInfo } from '../src/public-info.js'

test('creation year follows the server JST year across the UTC year boundary', () => {
	assert.equal(serverInfo(new Date('2026-12-31T14:59:59Z')).currentYear, 2026)
	assert.equal(serverInfo(new Date('2026-12-31T15:00:00Z')).currentYear, 2027)
})

test('public OAuth metadata identifies the request origin and limits record permissions', async () => {
	const expected = oauthClientMetadata('https://calendar.example/oauth-client-metadata.json')
	assert.equal(expected.client_id, 'https://calendar.example/oauth-client-metadata.json')
	assert.deepEqual(expected.redirect_uris, ['https://calendar.example/auth/callback'])
	assert.equal(expected.scope, 'atproto repo:win.tomo-x.atventar.calendar repo:win.tomo-x.atventar.entry')
	const response = await app.request('https://calendar.example/oauth-client-metadata.json')
	assert.equal(response.status, 200)
	assert.deepEqual(await response.json(), expected)
})

test('health exposes uncached server time without requiring a database', async () => {
	const response = await app.request('https://calendar.example/health')
	const value = (await response.json()) as ReturnType<typeof serverInfo>
	assert.equal(response.headers.get('cache-control'), 'no-store')
	assert.equal(value.status, 'ok')
	assert.ok(Number.isFinite(Date.parse(value.serverTime)))
	assert.equal(typeof value.currentYear, 'number')
})
