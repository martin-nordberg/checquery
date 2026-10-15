import type { Config } from "./config";
import { LoginSessions } from "./auth/loginSessions";
import { FailureRateLimiter } from "./middleware/rateLimit";
import { Mutex } from "./middleware/mutex";

/** Everything per-process the HTTP layer shares, besides the open file itself (still module state in
 * persistence/db.ts -- one open file per server, D3). Built once by createApp; tests build their own. */
export type ServerState = {
	config: Config;
	loginSessions: LoginSessions;
	rateLimiter: FailureRateLimiter;
	mutex: Mutex;
	now: () => number;
	/** Time of the most recent authenticated API request; drives idle auto-close (D6). */
	lastActivityMs: number;
};

export function createServerState(config: Config, opts?: { now?: () => number }): ServerState {
	const now = opts?.now ?? Date.now;
	return {
		config,
		loginSessions: new LoginSessions(config.loginIdleMinutes, now),
		rateLimiter: new FailureRateLimiter(5, 60_000, now),
		mutex: new Mutex(),
		now,
		lastActivityMs: now(),
	};
}
