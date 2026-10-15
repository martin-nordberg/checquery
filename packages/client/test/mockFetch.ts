import { afterEach } from "bun:test";

export type FetchCall = { method: string; path: string; body: unknown };
type Reply = { status?: number; body?: unknown };
type Handler = (call: FetchCall) => Reply | Promise<Reply>;

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

/**
 * Replaces global fetch (which the hc client resolves at call time) with a handler keyed on method + path,
 * recording every call. JSON bodies are parsed; FormData is passed through as-is.
 */
export function mockFetch(handler: Handler): FetchCall[] {
	const calls: FetchCall[] = [];
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "http://localhost");
		const raw = init?.body;
		const body = typeof raw === "string" ? JSON.parse(raw) : raw;
		const call = { method: (init?.method ?? "GET").toUpperCase(), path: url.pathname + url.search, body };
		calls.push(call);
		const reply = await handler(call);
		const status = reply.status ?? 200;
		return new Response(status === 204 || reply.body === undefined ? null : JSON.stringify(reply.body), {
			status,
			headers: { "content-type": "application/json" },
		});
	}) as typeof fetch;
	return calls;
}
