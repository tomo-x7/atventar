import assert from 'node:assert/strict'
import { test } from 'node:test'
import { STANDARD_PUBLICATION_URI } from '../../standard-site.js'
import { app } from '../src/app.js'

test('publication verification serves the registered AT URI as plain text without a database', async () => {
	const response = await app.request('https://atventar.tomo-x.win/.well-known/site.standard.publication')
	assert.equal(response.status, 200)
	assert.match(response.headers.get('Content-Type') ?? '', /^text\/plain(?:;|$)/)
	assert.equal(await response.text(), STANDARD_PUBLICATION_URI)
	assert.equal(response.headers.get('Cache-Control'), 'public, max-age=3600')
})
