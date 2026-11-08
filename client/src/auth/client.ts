import { AtPassport } from '@atpassport/client/core'
import { BrowserOAuthClient, buildLoopbackClientId } from '@atproto/oauth-client-browser'
import { config } from '../config'

export const OAUTH_CALLBACK_PATH = '/auth/callback'
export const ATPASSPORT_CALLBACK_PATH = '/auth/atpassport/callback'
export const OAUTH_SCOPE = 'atproto repo:win.tomo-x.atventar.calendar repo:win.tomo-x.atventar.entry'

export function createPassport(): AtPassport {
	return new AtPassport({
		callbackUrl: new URL(ATPASSPORT_CALLBACK_PATH, window.location.origin).href,
		lang: 'ja',
		fedcm: true,
	})
}

let oauthClient: Promise<BrowserOAuthClient> | undefined

export function getOAuthClient(): Promise<BrowserOAuthClient> {
	if (!oauthClient) {
		const location = new URL(window.location.href)
		const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
		let clientId = config.oauthClientId
		if (!clientId && loopback && location.protocol === 'http:') {
			const callbackUrl = new URL(OAUTH_CALLBACK_PATH, location.origin)
			const id = new URL(buildLoopbackClientId(callbackUrl))
			id.searchParams.set('scope', OAUTH_SCOPE)
			clientId = id.href
		}
		oauthClient = BrowserOAuthClient.load({
			clientId: clientId ?? new URL('/oauth-client-metadata.json', config.appOrigin).href,
			handleResolver: 'https://bsky.social',
			responseMode: 'fragment',
			onSessionDeleted: (sub) => {
				window.dispatchEvent(new CustomEvent('atventar:session-deleted', { detail: sub }))
			},
		}).catch((error: unknown) => {
			oauthClient = undefined
			throw error
		})
	}
	return oauthClient
}
