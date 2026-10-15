import { afterEach, describe, expect, it } from "bun:test";
import { ApiError, setApiErrorListener, unwrap, unwrapVoid } from "./apiClient";

const json = (status: number, body?: unknown) =>
	new Response(body === undefined ? null : JSON.stringify(body), { status });

afterEach(() => setApiErrorListener(null));

describe("unwrap", () => {
	it("returns the JSON body of a 2xx response, and undefined for 204", async () => {
		expect(await unwrap(json(200, { a: 1 }))).toEqual({ a: 1 });
		expect(await unwrap(json(204))).toBeUndefined();
		expect(await unwrapVoid(json(204))).toBeUndefined();
	});

	it("throws ApiError carrying the server's message, code and status", async () => {
		const error = await unwrap(json(409, { error: "No file is open.", code: "no-file-open" })).catch((e) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe("No file is open.");
		expect(error.code).toBe("no-file-open");
		expect(error.status).toBe(409);
	});

	it("tells the registered listener the error code before throwing", async () => {
		const seen: string[] = [];
		setApiErrorListener((code) => seen.push(code));
		await unwrap(json(401, { error: "Please sign in.", code: "unauthenticated" })).catch(() => undefined);
		expect(seen).toEqual(["unauthenticated"]);
	});

	it("copes with a non-JSON error body", async () => {
		const error = await unwrap(new Response("<html>bad gateway</html>", { status: 502 })).catch((e) => e);
		expect(error.code).toBe("internal");
		expect(error.message).toContain("502");
	});
});
