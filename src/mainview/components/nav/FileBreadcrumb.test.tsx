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

	it("renders the file name as a link back home by default", () => {
		setCurrentFile({ path: "C:\\ledgers\\test.checquery", fileId: "file123", name: "test.checquery" });
		const { getByText } = renderPage("/", "/", () => <FileBreadcrumb />);
		expect(getByText("test.checquery").closest("a")?.getAttribute("href")).toBe("/");
		setCurrentFile(null);
	});

	it("renders the file name as plain text (no link) when linkHome is false", () => {
		setCurrentFile({ path: "C:\\ledgers\\test.checquery", fileId: "file123", name: "test.checquery" });
		const { getByText } = renderPage("/", "/", () => <FileBreadcrumb linkHome={false} />);
		expect(getByText("test.checquery").closest("a")).toBeNull();
		setCurrentFile(null);
	});
});
