import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import ExpenseLogPage from "./ExpenseLogPage";

describe("ExpenseLogPage", () => {
	it("shows the account id breadcrumb and an Expense Log heading", () => {
		const { getByText } = renderPage("/expenselog/:accountId", "/expenselog/acct123", ExpenseLogPage);
		expect(getByText("acct123")).toBeTruthy();
		expect(getByText("Expense Log")).toBeTruthy();
	});
});
