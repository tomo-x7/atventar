export function serverInfo(now = new Date()) {
	return {
		status: 'ok',
		serverTime: now.toISOString(),
		currentYear: new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCFullYear(),
	}
}

export function oauthClientMetadata(requestUrl: string) {
	const origin = new URL(requestUrl).origin
	return {
		client_id: `${origin}/oauth-client-metadata.json`,
		client_name: 'Atventar',
		client_uri: origin,
		redirect_uris: [`${origin}/auth/callback`],
		scope: 'atproto repo:win.tomo-x.atventar.calendar repo:win.tomo-x.atventar.entry',
		grant_types: ['authorization_code', 'refresh_token'],
		response_types: ['code'],
		token_endpoint_auth_method: 'none',
		application_type: 'web',
		dpop_bound_access_tokens: true,
	}
}
