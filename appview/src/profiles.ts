import { ApiError } from './errors.js'
import type { ProfileView } from './lexicons/types/win/tomo-x/atventar/defs.js'

const base = 'https://public.api.bsky.app/xrpc/'

async function request(method: string, params: Record<string, string> | URLSearchParams) {
	let response: Response
	try {
		response = await fetch(`${base}${method}?${new URLSearchParams(params)}`, {
			signal: AbortSignal.timeout(5000),
		})
	} catch {
		throw new ApiError(502, 'UpstreamUnavailable', 'Bluesky is unavailable')
	}
	if (response.status === 400 || response.status === 404) return null
	if (!response.ok) throw new ApiError(502, 'UpstreamUnavailable', 'Bluesky is unavailable')
	return response.json() as Promise<Record<string, unknown>>
}

export class Profiles {
	private cache = new Map<string, Promise<ProfileView>>()

	async preload(dids: string[]) {
		const missing = [...new Set(dids)].filter((did) => !this.cache.has(did))
		for (let offset = 0; offset < missing.length; offset += 25) {
			const batch = missing.slice(offset, offset + 25)
			const result = this.loadBatch(batch)
			for (const did of batch)
				this.cache.set(
					did,
					result.then((profiles) => profiles.get(did) ?? { did }),
				)
		}
		await Promise.all(missing.map((did) => this.cache.get(did)))
	}

	private async loadBatch(dids: string[]) {
		const params = new URLSearchParams()
		for (const did of dids) params.append('actors', did)
		const profiles = new Map<string, ProfileView>()
		try {
			const data = await request('app.bsky.actor.getProfiles', params)
			if (Array.isArray(data?.profiles)) {
				for (const value of data.profiles) {
					if (value && typeof value === 'object' && typeof value.did === 'string' && dids.includes(value.did)) {
						profiles.set(value.did, this.project(value.did, value))
					}
				}
			}
		} catch (error) {
			if (!(error instanceof ApiError)) throw error
		}
		return profiles
	}

	async resolve(actor: string): Promise<string> {
		if (actor.startsWith('did:')) return actor
		const data = await request('com.atproto.identity.resolveHandle', { handle: actor })
		if (!data || typeof data.did !== 'string' || !data.did.startsWith('did:')) {
			throw new ApiError(404, 'ActorNotFound', 'Actor was not found')
		}
		return data.did
	}

	get(did: string): Promise<ProfileView> {
		const cached = this.cache.get(did)
		if (cached) return cached
		const result = this.load(did)
		this.cache.set(did, result)
		return result
	}

	private async load(did: string): Promise<ProfileView> {
		let data: Record<string, unknown> | null
		try {
			data = await request('app.bsky.actor.getProfile', { actor: did })
		} catch (error) {
			if (!(error instanceof ApiError)) throw error
			return { did }
		}
		return this.project(did, data)
	}

	private project(did: string, data: Record<string, unknown> | null): ProfileView {
		const profile: ProfileView = { did }
		if (!data || data.did !== did) return profile
		for (const key of ['handle', 'displayName', 'description', 'avatar'] as const) {
			const value = data[key]
			if (typeof value === 'string' && (key !== 'avatar' || /^https?:\/\//.test(value))) profile[key] = value
		}
		return profile
	}
}
