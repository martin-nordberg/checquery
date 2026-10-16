import type { Context } from "hono";

/** The first value of a (possibly comma-separated, multi-hop) forwarded header, or undefined. */
function firstForwarded(c: Context, name: string): string | undefined {
	return c.req.header(name)?.split(",")[0]?.trim() || undefined;
}

/**
 * True if the browser's connection was HTTPS: the request URL itself, or -- only when `trustProxy` is set -- the
 * proxy's `X-Forwarded-Proto`. Without a trusted proxy the header is ignored, since any client could send it.
 */
export function requestIsHttps(c: Context, trustProxy: boolean): boolean {
	if (trustProxy) {
		const proto = firstForwarded(c, "x-forwarded-proto");
		if (proto) return proto.toLowerCase() === "https";
	}
	return new URL(c.req.url).protocol === "https:";
}

/**
 * The origin (`proto://host[:port]`) the browser believes it's talking to: built from `X-Forwarded-Proto` /
 * `X-Forwarded-Host` when `trustProxy` is set (behind Caddy the request URL Bun sees is `http://`), otherwise the
 * request URL's own origin. Used by the CSRF check's Origin fallback.
 */
export function expectedOrigin(c: Context, trustProxy: boolean): string {
	const url = new URL(c.req.url);
	if (!trustProxy) return url.origin;
	const proto = firstForwarded(c, "x-forwarded-proto")?.toLowerCase() ?? url.protocol.slice(0, -1);
	const host = firstForwarded(c, "x-forwarded-host") ?? url.host;
	// Normalize through URL so a default port (":443" for https) drops out the way browsers' Origin omits it.
	try {
		return new URL(`${proto}://${host}`).origin;
	} catch {
		return url.origin;
	}
}
