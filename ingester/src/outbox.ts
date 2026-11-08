import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { ForwardEvent, Pending } from './types.js'

export class CapacityError extends Error {}

type Checkpoint = { seq: number | null; digest: string | null; pendingBytes: number }

function canonical(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonical)
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => [k, canonical(v)]),
		)
	}
	return value
}

export class Outbox {
	private db: DatabaseSync
	private owner = randomUUID()

	constructor(
		path: string,
		identity: string,
		private maxBytes: number,
	) {
		if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
		this.db = new DatabaseSync(path)
		try {
			this.db.exec(`
				PRAGMA busy_timeout = 5000;
				PRAGMA journal_mode = WAL;
				PRAGMA synchronous = FULL;
				PRAGMA cache_size = -4096;
				PRAGMA journal_size_limit = 16777216;
				CREATE TABLE IF NOT EXISTS state (
					id INTEGER PRIMARY KEY CHECK(id = 1), identity TEXT NOT NULL,
					seq INTEGER, digest TEXT, pending_bytes INTEGER NOT NULL DEFAULT 0
				);
				CREATE TABLE IF NOT EXISTS outbox (
					seq INTEGER PRIMARY KEY, payload TEXT NOT NULL, bytes INTEGER NOT NULL,
					digest TEXT NOT NULL, received_at INTEGER NOT NULL,
					attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL DEFAULT 0
				);
				CREATE TABLE IF NOT EXISTS known_dids (did TEXT PRIMARY KEY);
				CREATE TABLE IF NOT EXISTS lease (id INTEGER PRIMARY KEY CHECK(id = 1), owner TEXT NOT NULL, expires_at INTEGER NOT NULL);
			`)
			this.transaction(() => {
				this.db.prepare('INSERT OR IGNORE INTO state (id, identity) VALUES (1, ?)').run(identity)
				if (this.db.prepare('SELECT identity FROM state WHERE id = 1').get()?.identity !== identity) {
					throw new Error(
						'Source, filters, or destination changed: use the original configuration or a separate outbox database',
					)
				}
				const lease = this.db.prepare('SELECT expires_at FROM lease WHERE id = 1').get()
				if (lease && Number(lease.expires_at) > Date.now())
					throw new Error('Another ingester holds the outbox lease; crash leases expire after 60 seconds')
				this.db
					.prepare(
						'INSERT INTO lease VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET owner = excluded.owner, expires_at = excluded.expires_at',
					)
					.run(this.owner, Date.now() + 60_000)
			})
		} catch (error) {
			this.db.close()
			throw error
		}
	}

	private transaction<T>(run: () => T): T {
		this.db.exec('BEGIN IMMEDIATE')
		try {
			const value = run()
			this.db.exec('COMMIT')
			return value
		} catch (error) {
			this.db.exec('ROLLBACK')
			throw error
		}
	}

	private assertLease() {
		const row = this.db.prepare('SELECT owner, expires_at FROM lease WHERE id = 1').get()
		if (row?.owner !== this.owner || Number(row.expires_at) <= Date.now())
			throw new Error('Outbox lease expired or was lost')
	}

	heartbeat() {
		this.assertLease()
		this.db.prepare('UPDATE lease SET expires_at = ? WHERE id = 1 AND owner = ?').run(Date.now() + 60_000, this.owner)
	}

	checkpoint(): Checkpoint {
		const row = this.db.prepare('SELECT seq, digest, pending_bytes FROM state WHERE id = 1').get()
		if (!row) throw new Error('Missing outbox state')
		return {
			seq: row.seq === null ? null : Number(row.seq),
			digest: row.digest as string | null,
			pendingBytes: Number(row.pending_bytes),
		}
	}

	knows(did: string) {
		return this.db.prepare('SELECT 1 FROM known_dids WHERE did = ?').get(did) !== undefined
	}

	enqueue(seq: number, sourceEvent: unknown, event: ForwardEvent) {
		if (!Number.isSafeInteger(seq) || seq < 0 || seq >= 1e15) throw new Error('Invalid Jetstream sequence number')
		const payload = JSON.stringify(event)
		const bytes = Buffer.byteLength(payload)
		if (bytes > this.maxBytes) throw new Error('Single event exceeds outbox capacity; cursor retained')
		const digest = createHash('sha256')
			.update(JSON.stringify(canonical(sourceEvent)))
			.digest('hex')
		return this.transaction(() => {
			this.assertLease()
			const checkpoint = this.checkpoint()
			const existing = this.db.prepare('SELECT digest FROM outbox WHERE seq = ?').get(seq)
			if ((existing && existing.digest !== digest) || (checkpoint.seq === seq && checkpoint.digest !== digest))
				throw new Error('Conflicting events share a source sequence; source identity requires investigation')
			if (checkpoint.seq !== null && seq <= checkpoint.seq) return false
			if (checkpoint.pendingBytes + bytes > this.maxBytes) throw new CapacityError('Outbox capacity reached')
			this.db
				.prepare('INSERT INTO outbox (seq, payload, bytes, digest, received_at) VALUES (?, ?, ?, ?, ?)')
				.run(seq, payload, bytes, digest, Date.now())
			this.db.prepare('INSERT OR IGNORE INTO known_dids VALUES (?)').run(event.did)
			this.db
				.prepare('UPDATE state SET seq = ?, digest = ?, pending_bytes = pending_bytes + ? WHERE id = 1')
				.run(seq, digest, bytes)
			return true
		})
	}

	peek(limit: number): Pending[] {
		return this.db
			.prepare('SELECT seq, payload, bytes, attempts, next_attempt_at FROM outbox ORDER BY seq LIMIT ?')
			.all(limit)
			.map((r) => ({
				seq: Number(r.seq),
				payload: String(r.payload),
				bytes: Number(r.bytes),
				attempts: Number(r.attempts),
				nextAttemptAt: Number(r.next_attempt_at),
			}))
	}

	ack(rows: Pending[]) {
		this.transaction(() => {
			this.assertLease()
			for (const row of rows) {
				const result = this.db.prepare('DELETE FROM outbox WHERE seq = ?').run(row.seq)
				if (Number(result.changes) !== 1) throw new Error('Cannot ACK a missing outbox event')
				this.db.prepare('UPDATE state SET pending_bytes = pending_bytes - ? WHERE id = 1').run(row.bytes)
			}
		})
	}

	retry(rows: Pending[], nextAttemptAt: number) {
		this.transaction(() => {
			this.assertLease()
			for (const row of rows)
				this.db
					.prepare('UPDATE outbox SET attempts = attempts + 1, next_attempt_at = ? WHERE seq = ?')
					.run(nextAttemptAt, row.seq)
		})
	}

	stats() {
		const row = this.db.prepare('SELECT count(*) AS count, min(received_at) AS oldest FROM outbox').get()
		return {
			...this.checkpoint(),
			count: Number(row?.count),
			oldestAgeMs: row?.oldest == null ? 0 : Date.now() - Number(row.oldest),
		}
	}

	close() {
		this.db.prepare('DELETE FROM lease WHERE id = 1 AND owner = ?').run(this.owner)
		this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
		this.db.close()
	}
}
