export type RecordEvent = {
	operation: 'upsert' | 'delete'
	did: string
	collection: string
	rkey: string
	rev: string
	cid?: string
	record?: unknown
}

export type ForwardEvent = RecordEvent

export type Pending = {
	seq: number
	payload: string
	bytes: number
	attempts: number
	nextAttemptAt: number
}

export type Logger = (event: string, fields?: Record<string, unknown>) => void
