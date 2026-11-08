export const LOGIN_MAX_AGE = 10 * 60 * 1000
const STORAGE_PREFIX = 'atventar:login:'

export type PendingLogin = {
	state: string
	origin: string
	createdAt: number
	returnTo: string
}

/** Return targets are paths in this application, never arbitrary redirect URLs. */
export function localReturnTo(value: unknown, origin: string): string {
	if (
		typeof value !== 'string' ||
		!value.startsWith('/') ||
		value.startsWith('//') ||
		Array.from(value).some((character) => character === '\\' || character.charCodeAt(0) <= 32)
	) {
		return '/'
	}
	try {
		const url = new URL(value, origin)
		if (url.origin !== origin || url.pathname.startsWith('/auth/')) return '/'
		return `${url.pathname}${url.search}${url.hash}`
	} catch {
		return '/'
	}
}

export function savePendingLogin(
	storage: Pick<Storage, 'setItem'>,
	kind: 'oauth' | 'atpassport',
	state: string,
	origin: string,
	returnTo: string,
	now = Date.now(),
): void {
	storage.setItem(
		`${STORAGE_PREFIX}${kind}:${state}`,
		JSON.stringify({ state, origin, createdAt: now, returnTo: localReturnTo(returnTo, origin) }),
	)
}

/** Remove before validating so every callback attempt consumes its state. */
export function consumePendingLogin(
	storage: Pick<Storage, 'getItem' | 'removeItem'>,
	kind: 'oauth' | 'atpassport',
	state: string | null,
	origin: string,
	now = Date.now(),
): PendingLogin {
	if (!state || state.length > 200) throw new Error('ログインの状態が確認できません。もう一度ログインしてください。')
	const key = `${STORAGE_PREFIX}${kind}:${state}`
	const raw = storage.getItem(key)
	storage.removeItem(key)
	let pending: Partial<PendingLogin> | null = null
	try {
		pending = raw ? JSON.parse(raw) : null
	} catch {
		// Invalid or tampered storage is rejected below.
	}
	if (
		!pending ||
		pending.state !== state ||
		pending.origin !== origin ||
		typeof pending.createdAt !== 'number' ||
		!Number.isFinite(pending.createdAt) ||
		pending.createdAt > now ||
		now - pending.createdAt >= LOGIN_MAX_AGE ||
		typeof pending.returnTo !== 'string'
	) {
		throw new Error('ログインの有効期限が切れたか、状態が一致しません。もう一度ログインしてください。')
	}
	return { state, origin, createdAt: pending.createdAt, returnTo: localReturnTo(pending.returnTo, origin) }
}

export function requireSingleParam(params: URLSearchParams, name: string): string {
	const values = params.getAll(name)
	if (values.length !== 1 || !values[0]) throw new Error('ログインの応答が不正です。もう一度ログインしてください。')
	return values[0]
}

export function normalizeHandle(value: string): string {
	const handle = value.trim().replace(/^@/, '').toLowerCase()
	if (
		handle.length > 253 ||
		!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(handle)
	) {
		throw new Error('ハンドルを確認してください。')
	}
	return handle
}
