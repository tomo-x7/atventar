function httpUrl(value: string, base: string): URL {
	const url = new URL(value, base)
	if (!['http:', 'https:'].includes(url.protocol)) throw new Error('接続先はHTTP(S)のURLで指定してください')
	return url
}

const origin = window.location.origin

export const config = {
	appOrigin: httpUrl(import.meta.env.VITE_APP_ORIGIN || origin, origin).origin,
	appViewUrl: httpUrl(import.meta.env.VITE_APPVIEW_URL || origin, origin).href.replace(/\/$/, ''),
	oauthClientId: import.meta.env.VITE_OAUTH_CLIENT_ID || undefined,
}
