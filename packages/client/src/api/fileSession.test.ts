import { beforeEach, describe, expect, it } from "bun:test";
import { mockFetch } from "../../test/mockFetch";
import {
	currentFile,
	encryptionMode,
	errorAlert,
	openFileDialog,
	refreshFileSession,
	requestCloseFile,
	resetFileSession,
	setCurrentFile,
	setErrorAlert,
	submitNewFile,
	submitOpenFile,
} from "./fileSession";
import { currentUser, initAuth, login, logout, setCurrentUser } from "./authSession";
import { handleSessionError } from "./sessionRecovery";

const file = { path: "/data/Home.checquery", fileId: "f1", name: "Home.checquery" };

beforeEach(() => {
	resetFileSession();
	setErrorAlert(null);
	setCurrentUser(null);
});

describe("refreshFileSession", () => {
	it("adopts an open file this session has unlocked, and loads the server config", async () => {
		mockFetch(({ path }) =>
			path === "/api/config"
				? { body: { encryptionMode: "disabled", maxUploadBytes: 1 } }
				: { body: { ...file, unlocked: true } },
		);
		await refreshFileSession();
		expect(currentFile()).toEqual(file);
		expect(encryptionMode()).toBe("disabled");
		expect(openFileDialog()).toBeNull();
	});

	it("asks to unlock a file that's open but locked for this session", async () => {
		mockFetch(({ path }) =>
			path === "/api/config"
				? { body: { encryptionMode: "enabled", maxUploadBytes: 1 } }
				: { body: { ...file, unlocked: false } },
		);
		await refreshFileSession();
		expect(currentFile()).toBeNull();
		expect(openFileDialog()).toEqual({ step: "unlock", name: "Home.checquery" });
	});
});

describe("submitNewFile / submitOpenFile", () => {
	it("posts the name (omitting an empty password) and adopts the opened file", async () => {
		const calls = mockFetch(() => ({ body: file }));
		expect(await submitNewFile("Home", "")).toBeNull();
		expect(calls[0]).toEqual({ method: "POST", path: "/api/file/new", body: { name: "Home" } });
		expect(currentFile()).toEqual(file);
	});

	it("returns the server's message on failure, leaving no file adopted", async () => {
		mockFetch(() => ({ status: 401, body: { error: "Incorrect password.", code: "wrong-password" } }));
		expect(await submitOpenFile("Home", "nope")).toBe("Incorrect password.");
		expect(currentFile()).toBeNull();
	});
});

describe("requestCloseFile", () => {
	it("clears the file, and alerts on a backup failure", async () => {
		setCurrentFile(file);
		mockFetch(() => ({ body: { closed: true, backupError: "Disk full" } }));
		await requestCloseFile();
		expect(currentFile()).toBeNull();
		expect(errorAlert()).toEqual({ title: "Backup Failed", message: "Disk full" });
	});
});

describe("authSession", () => {
	it("initAuth reads who is signed in", async () => {
		mockFetch(() => ({ body: { username: "alice" } }));
		await initAuth();
		expect(currentUser()).toBe("alice");
	});

	it("login sets the user, or returns the server's message", async () => {
		mockFetch(({ body }) =>
			(body as { password: string }).password === "right"
				? { body: { username: "alice" } }
				: { status: 401, body: { error: "Incorrect username or password.", code: "bad-credentials" } },
		);
		expect(await login("alice", "wrong")).toBe("Incorrect username or password.");
		expect(currentUser()).toBeNull();
		expect(await login("alice", "right")).toBeNull();
		expect(currentUser()).toBe("alice");
	});

	it("logout clears the user even if the server call fails", async () => {
		setCurrentUser("alice");
		mockFetch(() => ({ status: 500, body: { error: "x", code: "internal" } }));
		await logout().catch(() => undefined);
		expect(currentUser()).toBeNull();
	});
});

describe("handleSessionError", () => {
	it("unauthenticated: signs out and forgets the file", () => {
		setCurrentUser("alice");
		setCurrentFile(file);
		handleSessionError("unauthenticated");
		expect(currentUser()).toBeNull();
		expect(currentFile()).toBeNull();
	});

	it("no-file-open: drops the file, alerting only if one was thought open", () => {
		handleSessionError("no-file-open");
		expect(errorAlert()).toBeNull();

		setCurrentFile(file);
		handleSessionError("no-file-open");
		expect(currentFile()).toBeNull();
		expect(errorAlert()?.title).toBe("File Closed");
	});

	it("file-locked: drops the file and re-checks the server (offering unlock)", async () => {
		mockFetch(({ path }) =>
			path === "/api/config"
				? { body: { encryptionMode: "enabled", maxUploadBytes: 1 } }
				: { body: { ...file, fileId: "f2", name: "Other.checquery", unlocked: false } },
		);
		setCurrentFile(file);
		handleSessionError("file-locked");
		expect(currentFile()).toBeNull();
		await Bun.sleep(0);
		await Bun.sleep(0);
		expect(openFileDialog()).toEqual({ step: "unlock", name: "Other.checquery" });
	});
});
