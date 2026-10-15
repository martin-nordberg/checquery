import { hc } from "hono/client";
import type { AppType } from "@checquery/server/appType";
import type { ApiErrorBody, ApiErrorCode } from "@checquery/shared/api/apiError";

/**
 * The typed HTTP client for the server's /api routes, inferred from the server's own route definitions
 * (`AppType` -- a type-only import; no server code is bundled), so a route or request-shape change on one side
 * is a compile error on the other. Same-origin: the server also serves this client (and Vite proxies /api in
 * dev), so the session cookie just rides along.
 */
export const api = hc<AppType>("/", { init: { credentials: "same-origin" } }).api;

/** A failed /api request: the server's ApiErrorBody, as an Error (so existing `e.message` UI keeps working). */
export class ApiError extends Error {
	constructor(
		message: string,
		readonly code: ApiErrorCode,
		readonly status: number,
	) {
		super(message);
		this.name = "ApiError";
	}
}

let apiErrorListener: ((code: ApiErrorCode) => void) | null = null;

/** Registers the one app-wide reaction to session-level failures (logged out, file closed, file locked) --
 * see sessionRecovery.ts. Kept as a registration so this module has no dependency on the session state. */
export function setApiErrorListener(listener: ((code: ApiErrorCode) => void) | null): void {
	apiErrorListener = listener;
}

/**
 * Resolves a response's JSON body (undefined for 204), or throws ApiError carrying the server's message and
 * code -- after first letting the registered listener react to the code.
 */
export async function unwrap<T>(res: { ok: boolean; status: number; json(): Promise<T> }): Promise<T> {
	if (res.ok) {
		return res.status === 204 ? (undefined as T) : await res.json();
	}
	let body: ApiErrorBody;
	try {
		body = (await res.json()) as unknown as ApiErrorBody;
	} catch {
		body = { error: `The server responded with an error (${res.status}).`, code: "internal" };
	}
	apiErrorListener?.(body.code);
	throw new ApiError(body.error, body.code, res.status);
}

/** The message to show for a failed call, whatever was thrown. */
export function errorMessage(e: unknown, fallback = "Something went wrong."): string {
	return e instanceof Error && e.message ? e.message : fallback;
}

/** unwrap() for body-less (204) mutation responses. */
export async function unwrapVoid(res: { ok: boolean; status: number; json(): Promise<unknown> }): Promise<void> {
	await unwrap(res);
}
