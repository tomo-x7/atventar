export class ApiError extends Error {
	constructor(
		public status: 400 | 401 | 404 | 502 | 503,
		public error: string,
		message: string,
	) {
		super(message)
	}
}
