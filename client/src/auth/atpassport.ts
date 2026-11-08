import type { AtPassport } from '@atpassport/client/core'
import { consumePendingLogin, normalizeHandle, requireSingleParam, savePendingLogin } from './security'

export function passportRedirect(passport: AtPassport, storage: Storage, origin: string, returnTo: string): string {
	const { url, atpstate } = passport.generateAuthUrl()
	savePendingLogin(storage, 'atpassport', atpstate, origin, returnTo)
	return url
}

/** Only the selected handle is used. DID, PDS URL and token are never trusted credentials. */
export function consumePassportCallback(
	passport: AtPassport,
	storage: Pick<Storage, 'getItem' | 'removeItem'>,
	url: URL,
	origin: string,
	now = Date.now(),
): { handle: string; returnTo: string } {
	const state = requireSingleParam(url.searchParams, 'atpstate')
	const pending = consumePendingLogin(storage, 'atpassport', state, origin, now)
	if (url.origin !== origin) throw new Error('ログインの応答元が一致しません。')
	for (const name of ['username', 'handle', 'did', 'pdsurl']) {
		if (url.searchParams.getAll(name).length > 1) throw new Error('ログインの応答が不正です。')
	}
	const result = passport.parseCallback(url.href, pending.state)
	if (!result.username) throw new Error('ハンドルが取得できませんでした。')
	return { handle: normalizeHandle(result.username), returnTo: pending.returnTo }
}
