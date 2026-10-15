import type { LoginSession } from "./auth/loginSessions";
import type { HandlerSession } from "./session/currentSession";

/** Hono context variables set by the auth middleware (requireLogin, requireUnlockedFile). */
export type AppEnv = {
	Variables: {
		login: LoginSession;
		loginToken: string;
		session: HandlerSession;
	};
};

/** The login session cookie. HttpOnly + SameSite=Strict; `Secure` waits for the HTTPS follow-up task. */
export const sessionCookieName = "checquery_session";
