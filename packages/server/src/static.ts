import { resolve, sep } from "node:path";
import type { Context, Hono } from "hono";
import type { AppEnv } from "./honoEnv";

const immutable = "public, max-age=31536000, immutable";

async function fileResponse(path: string, cacheControl: string): Promise<Response | null> {
	const file = Bun.file(path);
	if (!(await file.exists())) return null;
	return new Response(file, { headers: { "Content-Type": file.type, "Cache-Control": cacheControl } });
}

/**
 * Serves the built client (Vite's dist/) as static files, with an SPA fallback: any GET that isn't an API
 * route or an existing file gets index.html, so client-side routes survive a refresh or a pasted deep link.
 * Vite's hashed /assets/* are cached forever; everything else (notably index.html) must revalidate. Paths are
 * resolved inside staticDir only -- a `..` that would escape it just falls through to index.html.
 */
export function registerStatic(app: Hono<AppEnv>, staticDir: string): void {
	const root = resolve(staticDir);
	app.get("*", async (c: Context) => {
		let requested: string;
		try {
			requested = resolve(root, "." + decodeURIComponent(c.req.path));
		} catch {
			requested = root;
		}
		if (requested.startsWith(root + sep)) {
			const cache = c.req.path.startsWith("/assets/") ? immutable : "no-cache";
			const found = await fileResponse(requested, cache);
			if (found) return found;
			if (c.req.path.startsWith("/assets/")) return c.text("Not found", 404);
		}
		const index = await fileResponse(resolve(root, "index.html"), "no-cache");
		return index ?? c.text("The Checquery client hasn't been built (run `bun run build`).", 404);
	});
}
