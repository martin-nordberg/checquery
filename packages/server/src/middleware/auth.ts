import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../honoEnv";
import { sessionCookieName } from "../honoEnv";
import { HttpError } from "../httpError";
import { NoFileOpenError } from "../session/currentSession";
import { getCurrentFileId, getCurrentLedgerStore } from "../persistence/db";
import type { ServerState } from "../serverState";

/** 401 unless the request carries a live login session cookie; sets `login`/`loginToken` and counts the
 * request as activity for idle auto-close. */
export const requireLogin = (state: ServerState) =>
	createMiddleware<AppEnv>(async (c, next) => {
		const token = getCookie(c, sessionCookieName);
		const login = state.loginSessions.touch(token);
		if (!login || !token) {
			throw new HttpError(401, "unauthenticated", "Please sign in.");
		}
		c.set("login", login);
		c.set("loginToken", token);
		state.lastActivityMs = state.now();
		await next();
	});

/**
 * After requireLogin: 409 if no file is open, 403 `file-locked` unless this login session has unlocked the
 * file that's open *now* (an unlock for an earlier file never carries over). Sets `session` -- the store plus
 * this session's Origin -- for the entity handlers.
 */
export const requireUnlockedFile = createMiddleware<AppEnv>(async (c, next) => {
	const store = getCurrentLedgerStore();
	const fileId = getCurrentFileId();
	if (!store || !fileId) throw new NoFileOpenError();

	const unlock = c.var.login.unlock;
	if (!unlock || unlock.fileId !== fileId) {
		throw new HttpError(403, "file-locked", "Enter the file's password to continue.");
	}
	c.set("session", { store, origId: unlock.origId });
	await next();
});

/** Runs every mutating request (anything but GET/HEAD/OPTIONS, except login/logout, which don't touch the
 * file) through the one ServerState mutex -- see mutex.ts. */
export const serializeMutations = (state: ServerState) =>
	createMiddleware<AppEnv>(async (c, next) => {
		if (/^(GET|HEAD|OPTIONS)$/.test(c.req.method) || c.req.path.startsWith("/api/auth/")) {
			await next();
			return;
		}
		await state.mutex.run(() => next());
	});

/** Runs `attempt`, refusing up front (429) once the key has too many recent password failures, and recording
 * a failure whenever it throws `bad-credentials` / `wrong-password`. */
export async function withPasswordRateLimit<T>(state: ServerState, key: string, attempt: () => Promise<T>): Promise<T> {
	const retryAfter = state.rateLimiter.retryAfterSeconds(key);
	if (retryAfter > 0) {
		throw new HttpError(429, "rate-limited", `Too many failed attempts. Try again in ${retryAfter} seconds.`, {
			"Retry-After": String(retryAfter),
		});
	}
	try {
		const result = await attempt();
		state.rateLimiter.reset(key);
		return result;
	} catch (err) {
		if (err instanceof HttpError && (err.code === "bad-credentials" || err.code === "wrong-password")) {
			state.rateLimiter.recordFailure(key);
		}
		throw err;
	}
}
