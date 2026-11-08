export type DataErrorCode = 'invalid-input' | 'invalid-record' | 'not-owner' | 'not-found' | 'conflict'

export class DataError extends Error {
	readonly code: DataErrorCode

	constructor(code: DataErrorCode, message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'DataError'
		this.code = code
	}
}
