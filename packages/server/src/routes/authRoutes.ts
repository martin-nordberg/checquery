import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { loginBodySchema, type MePayload } from "@checquery/shared/api/authApi";
import type { AppEnv } from "../honoEnv";
import { sessionCookieName } from "../honoEnv";
import { verifyCredentials } from "../auth/users";
import { clientIp } from "../clientIp";
import { requestIsHttps } from "../requestProtocol";
import { HttpError } from "../httpError";
import { requireLogin, withPasswordRateLimit } from "../middleware/auth";
import { zxValidator } from "../middleware/zxValidator";
import type { ServerState } from "../serverState";

export const authRoutes = (state: ServerState) =>
	new Hono<AppEnv>()
		.post("/login", zxValidator("json", loginBodySchema), async (c) => {
			const { username, password } = c.req.valid("json");
			const ip = clientIp(c, state.config.trustProxy);
			const name = await withPasswordRateLimit(state, `login:${ip}`, async () => {
				const verified = await verifyCredentials(state.config.users, username, password);
				if (!verified) throw new HttpError(401, "bad-credentials", "Incorrect username or password.");
				return verified;
			});

			// Rotate: any session this browser already had is dropped rather than reused.
			state.loginSessions.delete(getCookie(c, sessionCookieName));
			const token = state.loginSessions.create(name);
			setCookie(c, sessionCookieName, token, {
				httpOnly: true,
				sameSite: "Strict",
				path: "/",
				secure: requestIsHttps(c, state.config.trustProxy),
			});
			console.log(`${name} signed in from ${ip}`);
			const me: MePayload = { username: name };
			return c.json(me, 200);
		})
		.post("/logout", requireLogin(state), (c) => {
			state.loginSessions.delete(c.var.loginToken);
			deleteCookie(c, sessionCookieName, { path: "/", secure: requestIsHttps(c, state.config.trustProxy) });
			return c.body(null, 204);
		})
		.get("/me", (c) => {
			const login = state.loginSessions.touch(getCookie(c, sessionCookieName));
			const me: MePayload | null = login ? { username: login.username } : null;
			return c.json(me, 200);
		});
