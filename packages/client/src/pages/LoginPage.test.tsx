import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, waitFor } from "@solidjs/testing-library";
import { renderPage } from "../../test/renderPage";
import { mockFetch } from "../../test/mockFetch";
import LoginPage from "./LoginPage";
import { currentUser, setCurrentUser } from "../api/authSession";

beforeEach(() => setCurrentUser(null));

function fill(getByLabelText: (text: string) => HTMLElement, username: string, password: string) {
	fireEvent.input(getByLabelText("User name"), { target: { value: username } });
	fireEvent.input(getByLabelText("Password"), { target: { value: password } });
}

describe("LoginPage", () => {
	it("keeps Sign in disabled until both fields are filled", () => {
		const { getByLabelText, getByRole } = renderPage("/login", "/login", LoginPage);
		const button = getByRole("button", { name: "Sign in" }) as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		fill(getByLabelText, "alice", "pw");
		expect(button.disabled).toBe(false);
	});

	it("signs in", async () => {
		const calls = mockFetch(() => ({ body: { username: "alice" } }));
		const { getByLabelText, getByRole } = renderPage("/login", "/login", LoginPage);
		fill(getByLabelText, " alice ", "secret");
		fireEvent.click(getByRole("button", { name: "Sign in" }));
		await waitFor(() => expect(currentUser()).toBe("alice"));
		expect(calls[0]).toEqual({ method: "POST", path: "/api/auth/login", body: { username: "alice", password: "secret" } });
	});

	it("shows the server's message inline and clears the password on failure", async () => {
		mockFetch(() => ({ status: 401, body: { error: "Incorrect username or password.", code: "bad-credentials" } }));
		const { getByLabelText, getByRole, findByRole } = renderPage("/login", "/login", LoginPage);
		fill(getByLabelText, "alice", "wrong");
		fireEvent.click(getByRole("button", { name: "Sign in" }));
		expect((await findByRole("alert")).textContent).toBe("Incorrect username or password.");
		expect((getByLabelText("Password") as HTMLInputElement).value).toBe("");
		expect(currentUser()).toBeNull();
	});
});
