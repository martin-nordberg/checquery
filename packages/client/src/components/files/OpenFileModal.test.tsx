import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { mockFetch, type FetchCall } from "../../../test/mockFetch";
import OpenFileModal from "./OpenFileModal";
import {
	currentFile,
	newFileDialogOpen,
	openFileDialog,
	resetFileSession,
	setEncryptionMode,
	setOpenFileDialog,
} from "../../api/fileSession";

const listing = [
	{ name: "Home.checquery", sizeBytes: 2048, lastModifiedIso: "2026-10-01T12:00:00.000Z" },
	{ name: "Rental.checquery", sizeBytes: 4096, lastModifiedIso: "2026-10-02T12:00:00.000Z" },
];
const opened = { path: "/data/Home.checquery", fileId: "f", name: "Home.checquery" };

function server(overrides?: (call: FetchCall) => { status?: number; body?: unknown } | undefined) {
	return mockFetch((call) => {
		const override = overrides?.(call);
		if (override) return override;
		if (call.method === "GET" && call.path === "/api/files") return { body: listing };
		return { body: opened };
	});
}

beforeEach(() => {
	resetFileSession();
	setEncryptionMode("enabled");
});

describe("OpenFileModal", () => {
	it("lists the server's files, then asks for the chosen file's password and opens it", async () => {
		const calls = server();
		setOpenFileDialog({ step: "pick" });
		const { findByText, getByLabelText, getByRole } = render(() => <OpenFileModal />);

		fireEvent.click(await findByText("Home"));
		expect(openFileDialog()).toEqual({ step: "password", name: "Home.checquery" });

		fireEvent.input(getByLabelText("Password"), { target: { value: "pw" } });
		fireEvent.click(getByRole("button", { name: "Open" }));
		await waitFor(() => expect(openFileDialog()).toBeNull());
		expect(calls.at(-1)).toEqual({ method: "POST", path: "/api/file/open", body: { name: "Home.checquery", password: "pw" } });
		expect(currentFile()).toEqual(opened);
	});

	it("shows a wrong password inline and stays on the password step", async () => {
		server((call) =>
			call.path === "/api/file/open" ? { status: 401, body: { error: "Incorrect password.", code: "wrong-password" } } : undefined,
		);
		setOpenFileDialog({ step: "password", name: "Home.checquery" });
		const { getByLabelText, getByRole, findByRole } = render(() => <OpenFileModal />);
		fireEvent.input(getByLabelText("Password"), { target: { value: "nope" } });
		fireEvent.click(getByRole("button", { name: "Open" }));
		expect((await findByRole("alert")).textContent).toBe("Incorrect password.");
		expect(openFileDialog()).toEqual({ step: "password", name: "Home.checquery" });
		expect(currentFile()).toBeNull();
	});

	it("skips the password step in test mode", async () => {
		setEncryptionMode("disabled");
		const calls = server();
		setOpenFileDialog({ step: "pick" });
		const { findByText } = render(() => <OpenFileModal />);
		fireEvent.click(await findByText("Home"));
		await waitFor(() => expect(currentFile()).toEqual(opened));
		expect(calls.at(-1)?.path).toBe("/api/file/open");
	});

	it("offers to create a file when there are none", async () => {
		mockFetch(() => ({ body: [] }));
		setOpenFileDialog({ step: "pick" });
		const { findByText, getByRole } = render(() => <OpenFileModal />);
		expect(await findByText(/No files yet/)).toBeTruthy();
		fireEvent.click(getByRole("button", { name: "New file…" }));
		expect(openFileDialog()).toBeNull();
		expect(newFileDialogOpen()).toBe(true);
	});

	it("uploads a file and refreshes the list", async () => {
		let uploaded = false;
		const calls = server((call) => {
			if (call.method === "POST" && call.path === "/api/files") {
				uploaded = true;
				return { status: 201, body: { name: "Imported.checquery", sizeBytes: 1, lastModifiedIso: "2026-10-03T00:00:00.000Z" } };
			}
			if (call.path === "/api/files" && uploaded) {
				return { body: [...listing, { name: "Imported.checquery", sizeBytes: 1, lastModifiedIso: "2026-10-03T00:00:00.000Z" }] };
			}
			return undefined;
		});
		setOpenFileDialog({ step: "pick" });
		const { findByText, getByLabelText } = render(() => <OpenFileModal />);
		await findByText("Home");

		const file = new File(["sqlite"], "Imported.checquery");
		fireEvent.change(getByLabelText("File to upload"), { target: { files: [file] } });
		expect(await findByText("Imported")).toBeTruthy();
		const upload = calls.find((c) => c.method === "POST" && c.path === "/api/files")!;
		expect((upload.body as FormData).get("file")).toBeInstanceOf(File);
	});

	it("shows an upload rejection inline", async () => {
		server((call) =>
			call.method === "POST" && call.path === "/api/files"
				? { status: 409, body: { error: 'That file is a copy of "Home.checquery", which is already on the server.', code: "duplicate-file-id" } }
				: undefined,
		);
		setOpenFileDialog({ step: "pick" });
		const { findByText, getByLabelText, findByRole } = render(() => <OpenFileModal />);
		await findByText("Home");
		fireEvent.change(getByLabelText("File to upload"), { target: { files: [new File(["x"], "Copy.checquery")] } });
		expect((await findByRole("alert")).textContent).toContain("is a copy of");
	});

	it("unlocks a file another session has open", async () => {
		const calls = server();
		setOpenFileDialog({ step: "unlock", name: "Home.checquery" });
		const { getByLabelText, getByRole, getByText } = render(() => <OpenFileModal />);
		expect(getByText("Unlock Home")).toBeTruthy();
		fireEvent.input(getByLabelText("Password"), { target: { value: "pw" } });
		fireEvent.click(getByRole("button", { name: "Unlock" }));
		await waitFor(() => expect(currentFile()).toEqual(opened));
		expect(calls.at(-1)).toEqual({ method: "POST", path: "/api/file/unlock", body: { password: "pw" } });
	});
});
