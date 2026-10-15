import { createSignal } from "solid-js";
import { api, errorMessage, unwrap } from "./apiClient";

/** The signed-in user's name, or null when signed out. */
export const [currentUser, setCurrentUser] = createSignal<string | null>(null);

/** Asks the server who (if anyone) this browser is signed in as. */
export async function initAuth(): Promise<void> {
	const me = await unwrap(await api.auth.me.$get());
	setCurrentUser(me?.username ?? null);
}

/** Signs in; resolves to null on success, or the message to show. */
export async function login(username: string, password: string): Promise<string | null> {
	try {
		const me = await unwrap(await api.auth.login.$post({ json: { username, password } }));
		setCurrentUser(me.username);
		return null;
	} catch (e) {
		return errorMessage(e, "Sign-in failed.");
	}
}

/** Signs out. Doesn't close the open file -- another session may be using it. */
export async function logout(): Promise<void> {
	try {
		await unwrap(await api.auth.logout.$post());
	} finally {
		setCurrentUser(null);
	}
}
