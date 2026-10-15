import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import type { ApiErrorBody } from "@checquery/shared/api/apiError";
import type { Config } from "./config";
import type { AppEnv } from "./honoEnv";
import { createServerState, type ServerState } from "./serverState";
import { errorHandler } from "./middleware/errorHandler";
import { serializeMutations } from "./middleware/auth";
import { authRoutes } from "./routes/authRoutes";
import { configRoutes, fileRoutes, filesRoutes } from "./routes/fileRoutes";
import {
	accountCategoryRoutes,
	accountRoutes,
	balanceAssertionRoutes,
	balanceRoutes,
	transactionRoutes,
	vendorRoutes,
} from "./routes/entityRoutes";
import { registerStatic } from "./static";

/**
 * The whole /api surface as one chained Hono app -- chained (each .route() feeding the next) so its type
 * carries every route's input/output for the client's typed `hc<AppType>` client (see appType.ts).
 */
export const buildApiApp = (state: ServerState) =>
	new Hono<AppEnv>()
		.use(
			"*",
			secureHeaders({
				contentSecurityPolicy: {
					defaultSrc: ["'self'"],
					scriptSrc: ["'self'"],
					// Solid sets inline style attributes in places.
					styleSrc: ["'self'", "'unsafe-inline'"],
					imgSrc: ["'self'", "data:"],
					connectSrc: ["'self'"],
					objectSrc: ["'none'"],
					baseUri: ["'self'"],
					frameAncestors: ["'none'"],
					formAction: ["'self'"],
				},
			}),
		)
		.use("/api/*", csrf())
		.use("/api/*", serializeMutations(state))
		.get("/api/health", (c) => c.json({ ok: true }, 200))
		.route("/api/auth", authRoutes(state))
		.route("/api/config", configRoutes(state))
		.route("/api/files", filesRoutes(state))
		.route("/api/file", fileRoutes(state))
		.route("/api/accounts", accountRoutes(state))
		.route("/api/account-categories", accountCategoryRoutes(state))
		.route("/api/vendors", vendorRoutes(state))
		.route("/api/transactions", transactionRoutes(state))
		.route("/api/balances", balanceRoutes(state))
		.route("/api/balance-assertions", balanceAssertionRoutes(state));

/** Builds the server's Hono app (API + static client) without listening -- index.ts serves it with
 * Bun.serve; tests drive it in-process with app.request(). */
export function createApp(config: Config, opts?: { now?: () => number }) {
	const state = createServerState(config, opts);
	const app = buildApiApp(state);
	app.onError(errorHandler);
	app.all("/api/*", (c) => c.json<ApiErrorBody>({ error: "Not found.", code: "not-found" }, 404));
	registerStatic(app, config.staticDir);
	return { app, state };
}
