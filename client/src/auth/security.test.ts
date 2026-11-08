import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AtPassport } from '@atpassport/client/core'
import { consumePassportCallback } from './atpassport'
import { consumePendingLogin, LOGIN_MAX_AGE, localReturnTo, normalizeHandle, savePendingLogin } from './security'

const origin = 'https://atventar.example'
const callback = `${origin}/auth/atpassport/callback`
const passport = new AtPassport({ callbackUrl: callback })
const now = 1_000_000
function storage() {
	const items = new Map<string, string>()
	return {
		getItem: (key: string) => items.get(key) ?? null,
		setItem: (key: string, value: string) => void items.set(key, value),
		removeItem: (key: string) => void items.delete(key),
	}
}
function pendingCallback(query = '') {
	const store = storage()
	savePendingLogin(store, 'atpassport', 'state-one', origin, '/calendars/one?day=2', now)
	return { store, url: new URL(`${callback}?atpstate=state-one&username=alice.example${query}`) }
}

describe('local return paths', () => {
	it('preserves local path, search, and fragment', () => {
		assert.equal(localReturnTo('/calendars/one?day=2#entry', origin), '/calendars/one?day=2#entry')
	})
	it('rejects external, protocol-relative, backslash, control and callback targets', () => {
		for (const path of [
			'https://evil.example/',
			'//evil.example/',
			'/\\evil.example/',
			'/\nevil.example',
			'/auth/callback?code=secret',
			'javascript:alert(1)',
		])
			assert.equal(localReturnTo(path, origin), '/')
	})
})

describe('pending login state', () => {
	it('consumes state only once and keeps OAuth and AtPassport states separate', () => {
		const store = storage()
		savePendingLogin(store, 'oauth', 'one', origin, '/mine', now)
		assert.throws(() => consumePendingLogin(store, 'atpassport', 'one', origin, now))
		assert.equal(consumePendingLogin(store, 'oauth', 'one', origin, now).returnTo, '/mine')
		assert.throws(() => consumePendingLogin(store, 'oauth', 'one', origin, now))
	})
	it('rejects expired, future and different-origin records', () => {
		for (const [createdAt, requestedOrigin] of [
			[now - LOGIN_MAX_AGE, origin],
			[now + 1, origin],
			[now, 'https://evil.example'],
		] as const) {
			const store = storage()
			savePendingLogin(store, 'oauth', 'one', origin, '/', createdAt)
			assert.throws(() => consumePendingLogin(store, 'oauth', 'one', requestedOrigin, now))
			assert.equal(store.getItem('atventar:login:oauth:one'), null)
		}
	})
	it('rejects malformed storage and missing states', () => {
		const store = storage()
		store.setItem('atventar:login:oauth:one', 'not JSON')
		assert.throws(() => consumePendingLogin(store, 'oauth', 'one', origin, now))
		assert.throws(() => consumePendingLogin(store, 'oauth', null, origin, now))
	})
})

describe('AtPassport callback verification', () => {
	it('returns only the normalized handle and local return path, ignoring credential-looking hints', () => {
		const { store, url } = pendingCallback('&did=did:plc:untrusted&pdsurl=https://evil.example&token=fake')
		assert.deepEqual(consumePassportCallback(passport, store, url, origin, now), {
			handle: 'alice.example',
			returnTo: '/calendars/one?day=2',
		})
		assert.throws(() => consumePassportCallback(passport, store, url, origin, now))
	})
	it('rejects missing, mismatched, duplicated and expired state', () => {
		for (const query of [
			'?username=alice.example',
			'?username=alice.example&atpstate=wrong',
			'?username=alice.example&atpstate=state-one&atpstate=state-two',
		]) {
			const { store } = pendingCallback()
			assert.throws(() => consumePassportCallback(passport, store, new URL(`${callback}${query}`), origin, now))
		}
		const { store, url } = pendingCallback()
		assert.throws(() => consumePassportCallback(passport, store, url, origin, now + LOGIN_MAX_AGE))
	})
	it('rejects wrong origin/path and ambiguous username', () => {
		for (const transform of [
			(url: URL) => {
				url.hostname = 'evil.example'
			},
			(url: URL) => {
				url.pathname = '/wrong'
			},
			(url: URL) => {
				url.searchParams.append('username', 'mallory.example')
			},
			(url: URL) => {
				url.searchParams.set('username', 'https://evil.example')
			},
		]) {
			const { store, url } = pendingCallback()
			transform(url)
			assert.throws(() => consumePassportCallback(passport, store, url, origin, now))
		}
	})
})

it('normalizes handle input and rejects URL/DID payloads', () => {
	assert.equal(normalizeHandle(' @Alice.Example '), 'alice.example')
	assert.throws(() => normalizeHandle('https://alice.example'))
	assert.throws(() => normalizeHandle('did:plc:alice'))
})
