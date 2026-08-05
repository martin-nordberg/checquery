import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import FileBreadcrumb from "./FileBreadcrumb";
import { setCurrentFile } from "../../rpc";

describe("FileBreadcrumb", () => {
	it("renders nothing when no file is open", () => {
		setCurrentFile(null);
		const { container } = renderPage("/", "/", () => <FileBreadcrumb />);
		expect(container.querySelector("li")).toBeNull();
	});

	it("renders the file name as a link back home by default, without the .checquery extension", () => {
		setCurrentFile({ path: "C:\\ledgers\\test.checquery", fileId: "file123", name: "test.checquery" });
		const { getByText, queryByText } = renderPage("/", "/", () => <FileBreadcrumb />);
		expect(getByText("test").closest("a")?.getAttribute("href")).toBe("/");
		expect(queryByText("test.checquery")).toBeNull();
		setCurrentFile(null);
	});

	it("renders the file name as plain text (no link) when linkHome is false", () => {
		setCurrentFile({ path: "C:\\ledgers\\test.checquery", fileId: "file123", name: "test.checquery" });
		const { getByText } = renderPage("/", "/", () => <FileBreadcrumb linkHome={false} />);
		expect(getByText("test").closest("a")).toBeNull();
		setCurrentFile(null);
	});

	it("strips the .checquery-test extension too (unencrypted test-mode files)", () => {
		setCurrentFile({ path: "C:\\ledgers\\test.checquery-test", fileId: "file123", name: "test.checquery-test" });
		const { getByText } = renderPage("/", "/", () => <FileBreadcrumb />);
		expect(getByText("test")).toBeTruthy();
		setCurrentFile(null);
	});
});
