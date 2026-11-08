import './lexicon-compat.js'
import { XRPCError } from '@evex-dev/xrpc-hono'
import { Hono } from 'hono'
import type { Env } from './env.js'
import { ApiError } from './errors.js'
import { ingest } from './ingest.js'
import { createServer } from './lexicons/index.js'
import { Profiles } from './profiles.js'
import { Service } from './service.js'

export const app = new Hono<Env>()
const server = createServer<Env>()

async function query<T>(run: () => Promise<T>): Promise<{ encoding: 'application/json'; body: T }> {
	try {
		return { encoding: 'application/json', body: await run() }
	} catch (error) {
		if (error instanceof ApiError)
			throw XRPCError.fromErrorResult({ status: error.status, error: error.error, message: error.message })
		throw error
	}
}

function service(db: D1Database | undefined) {
	if (!db) throw new ApiError(503, 'DatabaseUnavailable', 'D1 DB binding is not configured')
	return new Service(db)
}

server.win.tomoX.atventar.getCalendar(({ c, params }) => query(() => service(c.env.DB).getCalendar(params.uri)))
server.win.tomoX.atventar.getProfile(({ params }) =>
	query(async () => {
		const profiles = new Profiles()
		return profiles.get(await profiles.resolve(params.actor))
	}),
)
server.win.tomoX.atventar.listCalendars(({ c, params }) => query(() => service(c.env.DB).listCalendars(params)))
server.win.tomoX.atventar.searchCalendars(({ c, params }) => query(() => service(c.env.DB).listCalendars(params)))
server.win.tomoX.atventar.getActorEntries(({ c, params }) => query(() => service(c.env.DB).actorEntries(params)))

app.get('/health', (c) => c.json({ status: 'ok' }))
app.route('/ingest', ingest)
app.route('/', server.xrpc.createApp())
app.onError((error, c) => {
	if (error instanceof ApiError) return c.json({ error: error.error, message: error.message }, error.status)
	console.error(error)
	return c.json({ error: 'InternalServerError', message: 'Internal server error' }, 500)
})
