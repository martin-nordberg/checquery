import { randomBytes } from "node:crypto";
import type { OrigId } from "@checquery/shared/domain/origins/OrigId";

/** Which open file this login session has unlocked (by entering its password, or by creating/opening it),
 * and the Origin its writes are stamped with. Null until then, and reset whenever any file closes. */
export type FileUnlock = {
	fileId: string;
	origId: OrigId;
};

export type LoginSession = {
	username: string;
	lastSeenMs: number;
	unlock: FileUnlock | null;
};

/**
 * In-memory login sessions keyed by an opaque random token (the `checquery_session` cookie's value). A server
 * restart logs everyone out -- deliberately, since it also closes the open file. Sessions expire after
 * `idleMinutes` without a request.
 */
export class LoginSessions {
	private readonly sessions = new Map<string, LoginSession>();

	constructor(
		private readonly idleMinutes: number,
		private readonly now: () => number = Date.now,
	) {}

	create(username: string): string {
		const token = randomBytes(32).toString("base64url");
		this.sessions.set(token, { username, lastSeenMs: this.now(), unlock: null });
		return token;
	}

	/** The live session for `token` (refreshing its idle timer), or null if unknown/expired. */
	touch(token: string | undefined): LoginSession | null {
		if (!token) return null;
		const session = this.sessions.get(token);
		if (!session) return null;
		const now = this.now();
		if (now - session.lastSeenMs > this.idleMinutes * 60_000) {
			this.sessions.delete(token);
			return null;
		}
		session.lastSeenMs = now;
		return session;
	}

	delete(token: string | undefined): void {
		if (token) this.sessions.delete(token);
	}

	/** Called whenever the open file closes (or is replaced): nobody stays unlocked for a file that's gone. */
	clearAllUnlocks(): void {
		for (const session of this.sessions.values()) session.unlock = null;
	}
}
