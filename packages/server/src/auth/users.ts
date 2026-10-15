import type { ConfiguredUser } from "../config";

let dummyHash: Promise<string> | null = null;

/**
 * Returns the canonical configured username if `password` matches that user's hash, else null. An unknown
 * username still runs a full verify (against a throwaway hash) so the response time doesn't reveal which
 * usernames exist.
 */
export async function verifyCredentials(
	users: ConfiguredUser[],
	username: string,
	password: string,
): Promise<string | null> {
	const user = users.find((u) => u.name === username);
	if (!user) {
		dummyHash ??= Bun.password.hash("checquery-dummy-password");
		await Bun.password.verify(password, await dummyHash);
		return null;
	}
	return (await Bun.password.verify(password, user.passwordHash)) ? user.name : null;
}
