import type { Context } from "hono";

/**
 * Normalizes a raw client address to the IPv4 form the Origin schema accepts (ipAddressSchema is IPv4-only):
 * IPv4-mapped IPv6 (`::ffff:a.b.c.d`) unwraps to `a.b.c.d`, IPv6 loopback becomes `127.0.0.1`, and anything else
 * that isn't plain IPv4 (genuine IPv6, garbage, missing) becomes `0.0.0.0`.
 */
export function normalizeIp(raw: string | undefined | null): string {
	const ip = (raw ?? "").trim();
	const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
	const candidate = mapped ? mapped[1]! : ip === "::1" ? "127.0.0.1" : ip;
	const octets = candidate.split(".");
	const isIpv4 = octets.length === 4 && octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255);
	return isIpv4 ? candidate : "0.0.0.0";
}

type BunServerLike = { requestIP?: (req: Request) => { address: string } | null };

/**
 * The requesting client's (normalized) IPv4 address: the first `X-Forwarded-For` hop when `trustProxy` is set
 * (i.e. behind a reverse proxy that sets it), otherwise the socket's peer address from Bun's server (passed by
 * Bun.serve as Hono's `env`). Falls back to `0.0.0.0` when neither is available (e.g. in-process app.request()
 * tests).
 */
export function clientIp(c: Context, trustProxy: boolean): string {
	if (trustProxy) {
		const forwarded = c.req.header("x-forwarded-for")?.split(",")[0];
		if (forwarded) return normalizeIp(forwarded);
	}
	const server = c.env as BunServerLike | undefined;
	try {
		return normalizeIp(server?.requestIP?.(c.req.raw)?.address);
	} catch {
		return "0.0.0.0";
	}
}
