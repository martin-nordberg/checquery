import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { mockFetch } from "../test/mockFetch";
import NewFileModal from "./NewFileModal";
import {
	currentFile,
	newFileDialogOpen,
	resetFileSession,
	setEncryptionMode,
	setNewFileDialogOpen,
} from "./api/fileSession";

beforeEach(() => {
	resetFileSession();
	setNewFileDialogOpen(true);
});

describe("NewFileModal", () => {
	it("requires a password when encryption is enabled, and creates the file", async () => {
		setEncryptionMode("enabled");
		const calls = mockFetch(() => ({ body: { path: "/data/Home.checquery", fileId: "f", name: "Home.checquery" } }));
		const { getByLabelText, getByRole } = render(() => <NewFileModal />);
		const create = getByRole("button", { name: "Create" }) as HTMLButtonElement;

		fireEvent.input(getByLabelText("File name"), { target: { value: "Home" } });
		expect(create.disabled).toBe(true);
		fireEvent.input(getByLabelText("Password"), { target: { value: "pw" } });
		expect(create.disabled).toBe(false);

		fireEvent.click(create);
		await waitFor(() => expect(newFileDialogOpen()).toBe(false));
		expect(calls[0]).toEqual({ method: "POST", path: "/api/file/new", body: { name: "Home", password: "pw" } });
		expect(currentFile()?.name).toBe("Home.checquery");
	});

	it("has no password field in test mode", () => {
		setEncryptionMode("disabled");
		const { queryByLabelText } = render(() => <NewFileModal />);
		expect(queryByLabelText("Password")).toBeNull();
	});

	it("shows a server error inline and stays open", async () => {
		setEncryptionMode("disabled");
		mockFetch(() => ({ status: 409, body: { error: "A file already exists at:\n/data/Home.checquery-test", code: "already-exists" } }));
		const { getByLabelText, getByRole, findByRole } = render(() => <NewFileModal />);
		fireEvent.input(getByLabelText("File name"), { target: { value: "Home" } });
		fireEvent.click(getByRole("button", { name: "Create" }));
		expect((await findByRole("alert")).textContent).toContain("already exists");
		expect(newFileDialogOpen()).toBe(true);
	});
});
