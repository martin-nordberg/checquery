import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../test/renderPage";
import HomePage from "./HomePage";
import { setCurrentFile } from "../rpc";

describe("HomePage", () => {
	it("shows the no-file hub when no file is open", () => {
		setCurrentFile(null);
		const { getByText, queryByText } = renderPage("/", "/", HomePage);

		expect(getByText("Checquery")).toBeTruthy();
		expect(getByText("Create a New File")).toBeTruthy();
		expect(getByText("Open an Existing File")).toBeTruthy();
		expect(queryByText("Close This File")).toBeNull();
	});

	it("shows the file hub, with the file name breadcrumb, once a file is open", () => {
		setCurrentFile({ path: "C:\\ledgers\\test.checquery", fileId: "file123", name: "test.checquery" });
		const { getByText, queryByText } = renderPage("/", "/", HomePage);

		expect(getByText("test.checquery")).toBeTruthy();
		expect(getByText("File Info")).toBeTruthy();
		expect(getByText("Close This File")).toBeTruthy();
		expect(getByText("Edit the List of Asset Accounts")).toBeTruthy();
		expect(getByText("Edit the List of Liability Accounts")).toBeTruthy();
		expect(getByText("Edit the List of Income Accounts")).toBeTruthy();
		expect(getByText("Edit the List of Expense Accounts")).toBeTruthy();
		expect(getByText("Statements")).toBeTruthy();
		expect(getByText("Balance Sheet")).toBeTruthy();
		expect(getByText("Income Statement")).toBeTruthy();
		expect(getByText("Cash Flow Statement")).toBeTruthy();
		expect(getByText("Budgeting")).toBeTruthy();
		expect(getByText("Annual Budget").closest("a")?.getAttribute("href")).toBe("/budget");
		expect(getByText("Vendors")).toBeTruthy();
		expect(getByText("Edit the List of Vendors")).toBeTruthy();
		expect(queryByText("Net Worth")).toBeNull();
		expect(queryByText("Edit the List of Net Worth Accounts")).toBeNull();

		setCurrentFile(null);
	});
});
