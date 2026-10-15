import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { ApiErrorBody } from "@checquery/shared/api/apiError";
import { HttpError } from "../httpError";
import { NoFileOpenError } from "../session/currentSession";

/**
 * Maps anything thrown while handling an /api request to an ApiErrorBody response. Expected failures carry
 * their own status/code (HttpError); domain validation failures from the handlers' xxxEventSchema.parse calls
 * keep Zod's own message, as the desktop app's RPC errors did, since pages show `e.message` as-is. Anything
 * unexpected is logged and reported generically.
 */
export function errorHandler(err: Error, c: Context): Response {
	const body = (error: string, code: ApiErrorBody["code"]): ApiErrorBody => ({ error, code });

	if (err instanceof HttpError) {
		return c.json(body(err.message, err.code), err.status, err.headers);
	}
	if (err instanceof NoFileOpenError) {
		return c.json(body(err.message, "no-file-open"), 409);
	}
	if (err instanceof ZodError) {
		return c.json(body(err.message, "invalid-request"), 400);
	}
	if (err instanceof HTTPException && err.status === 403) {
		// Hono's csrf() rejects cross-site form-style posts this way.
		return c.json(body(err.message || "Forbidden.", "forbidden"), 403);
	}
	if (err instanceof HTTPException && err.status < 500) {
		return c.json(body(err.message || "Invalid request.", "invalid-request"), err.status);
	}
	if (/UNIQUE constraint failed/i.test(err.message)) {
		return c.json(body("That conflicts with an existing entry.", "conflict"), 409);
	}

	console.error(`Unhandled error in ${c.req.method} ${c.req.path}:`, err);
	return c.json(body("Something went wrong on the server.", "internal"), 500);
}
