/**
 * A single-slot async lock: run() calls execute one at a time, in call order. Every mutating request, file
 * lifecycle change, idle-close, and shutdown goes through the one instance on ServerState, so e.g. a close can
 * never land between a TeeSvc's action-log append and its materialized-store write.
 */
export class Mutex {
	private tail: Promise<unknown> = Promise.resolve();

	run<T>(fn: () => Promise<T> | T): Promise<T> {
		const result = this.tail.then(fn, fn);
		this.tail = result.catch(() => undefined);
		return result;
	}
}
