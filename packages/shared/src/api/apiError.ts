/**
 * The JSON body of every non-2xx `/api` response (see the server's middleware/errorHandler.ts). `error` is a
 * human-readable message the UI may show as-is; `code` is the machine-readable reason the client branches on
 * (e.g. `unauthenticated` → back to the login page, `no-file-open` → back to the home page).
 */
export type ApiErrorBody = {
	error: string;
	code: ApiErrorCode;
};

export type ApiErrorCode =
	// Request shape / domain validation
	| "invalid-request"
	| "invalid-name"
	| "not-found"
	| "conflict"
	// Auth / session
	| "unauthenticated"
	| "bad-credentials"
	| "file-locked"
	| "forbidden"
	| "rate-limited"
	// File lifecycle (the FileErrorCode values from persistence/db.ts, plus upload-specific ones)
	| "no-file-open"
	| "already-exists"
	| "not-a-checquery-file"
	| "wrong-password"
	| "password-required"
	| "unsupported-version"
	| "duplicate-file-id"
	| "too-large"
	| "io-error"
	// Anything unexpected
	| "internal";
