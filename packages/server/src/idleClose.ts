import { getCurrentFile } from "./persistence/db";
import { closeWithBackup } from "./fileLifecycle";
import type { ServerState } from "./serverState";

/** Closes (and backs up) the open file once no authenticated request has arrived for idleCloseMinutes (D6).
 * Called once a minute by index.ts; a no-op when the setting is 0 or nothing is open. */
export async function closeIfIdle(state: ServerState): Promise<boolean> {
	const minutes = state.config.idleCloseMinutes;
	if (minutes <= 0) return false;
	return state.mutex.run(() => {
		if (!getCurrentFile() || state.now() - state.lastActivityMs < minutes * 60_000) return false;
		closeWithBackup(state, `idle for ${minutes} minutes`);
		return true;
	});
}
