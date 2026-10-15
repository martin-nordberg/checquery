import { z } from "zod";

/** Body of `POST /api/auth/login`. Deliberately loose (just non-empty, bounded strings) -- whether the name
 * is a configured user is the server's call, and is answered with the same `bad-credentials` error either
 * way so the response never reveals which usernames exist. */
export const loginBodySchema = z.strictObject({
	username: z.string().min(1).max(200),
	password: z.string().min(1).max(1000),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

/** The signed-in user, as returned by login and `GET /api/auth/me`. */
export type MePayload = {
	username: string;
};
